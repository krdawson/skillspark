import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from './_auth.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await requireUser(req, res))) return;

  const { profileId, subscription, familyId } = req.body ?? {};
  if (!profileId || !subscription?.endpoint || !familyId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { error } = await supabase.from('push_subscriptions').upsert({
    family_id: familyId,
    profile_id: profileId,
    endpoint: subscription.endpoint,
    subscription,
  }, { onConflict: 'family_id,endpoint' });

  if (error) {
    console.error('[subscribe]', error.message);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
