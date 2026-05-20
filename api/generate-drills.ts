import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in environment variables' });
  }

  const { sport, name, drillsPerDay, recentDrills = [] } = req.body ?? {};

  if (!sport || !name || !drillsPerDay) {
    return res.status(400).json({ error: 'Missing required fields: sport, name, drillsPerDay' });
  }

  const avoidClause = recentDrills.length > 0
    ? `Avoid repeating these drills the kid just did: ${recentDrills.slice(0, 10).join(', ')}.`
    : '';

  const prompt = `You are a youth sports coach. Generate exactly ${drillsPerDay} practice drill(s) for a youth ${sport} player named ${name}.

${avoidClause}

Rules:
- Drills must be doable solo at home or at a field (no teammates needed)
- Keep descriptions short and encouraging, written for a kid
- Mix skill types: include at least one drill focused on fundamentals
- Reps should be specific (e.g. "50 passes", "3 sets of 10", "5 minutes")

Return ONLY a valid JSON array, no markdown, no extra text. Each item must have exactly these fields:
{
  "title": "short action-oriented name",
  "description": "1-2 sentences explaining the drill to a kid",
  "reps": "specific reps/sets/duration",
  "type": "sport-specific" | "conditioning" | "strength"
}`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
      },
    });

    const text = result.text();
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Model returned unexpected format');
    }

    // Sanitise — ensure every field exists
    const drills = parsed.slice(0, drillsPerDay).map((d: any) => ({
      title:       String(d.title       ?? 'Practice Drill'),
      description: String(d.description ?? ''),
      reps:        String(d.reps        ?? ''),
      type:        ['sport-specific', 'conditioning', 'strength'].includes(d.type) ? d.type : 'sport-specific',
    }));

    return res.status(200).json({ drills });
  } catch (err: any) {
    console.error('[generate-drills]', err?.message ?? err);
    return res.status(500).json({ error: err?.message ?? 'Failed to generate drills' });
  }
}
