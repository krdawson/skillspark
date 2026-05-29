import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { requireUser } from './_auth.js';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an expert youth sports coach. Generate age-appropriate, encouraging, and effective solo practice drills for kids.

Rules:
- Every drill must be doable solo at home or at a field — no teammates required
- Write descriptions in short, clear, encouraging language a kid can read
- Include at least one fundamentals drill per session
- Reps must be specific (e.g. "50 passes", "3 sets of 10", "5 minutes")
- Return ONLY valid JSON — no markdown, no extra text`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  // Require a valid session so this paid endpoint can't be hit anonymously.
  if (!(await requireUser(req, res))) return;

  const { sport, name, drillsPerDay, recentDrills = [] } = req.body ?? {};
  if (!sport || !name || !drillsPerDay) {
    return res.status(400).json({ error: 'Missing required fields: sport, name, drillsPerDay' });
  }

  const avoidClause = (recentDrills as string[]).length > 0
    ? `Avoid repeating these recent drills: ${(recentDrills as string[]).slice(0, 10).join(', ')}.`
    : '';

  const userMessage = `Generate exactly ${drillsPerDay} practice drill(s) for ${name}, a youth ${sport} player. ${avoidClause}`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      output_config: {
        format: {
          type: 'json_schema',
          name: 'drills',
          schema: {
            type: 'object',
            properties: {
              drills: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title:       { type: 'string' },
                    description: { type: 'string' },
                    reps:        { type: 'string' },
                    type:        { type: 'string', enum: ['sport-specific', 'conditioning', 'strength'] },
                  },
                  required: ['title', 'description', 'reps', 'type'],
                  additionalProperties: false,
                },
              },
            },
            required: ['drills'],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: 'user', content: userMessage }],
    });

    const block = response.content[0];
    const text = block?.type === 'text' ? block.text : '';
    if (!text) return res.status(502).json({ error: 'Empty response from model' });
    const parsed = JSON.parse(text) as { drills: any[] };

    console.log(`[generate-drills] ok — ${response.usage.input_tokens}in / ${response.usage.output_tokens}out tokens`);

    const drills = parsed.drills.slice(0, drillsPerDay).map((d: any) => ({
      title:       String(d.title       ?? 'Practice Drill'),
      description: String(d.description ?? ''),
      reps:        String(d.reps        ?? ''),
      type:        ['sport-specific', 'conditioning', 'strength'].includes(d.type) ? d.type : 'sport-specific',
    }));

    return res.status(200).json({ drills });

  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      console.error('[generate-drills] rate limited');
      return res.status(429).json({ error: 'Rate limit hit — try again in a moment.' });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('[generate-drills] bad API key');
      return res.status(500).json({ error: 'Invalid API key — check ANTHROPIC_API_KEY in Vercel.' });
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`[generate-drills] API error ${err.status}:`, err.message);
      return res.status(500).json({ error: err.message });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[generate-drills] unexpected error:', msg);
    return res.status(500).json({ error: msg });
  }
}
