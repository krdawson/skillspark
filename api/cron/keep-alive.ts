import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminClient, isAuthorizedCron } from '../_auth.js';

// Pings Supabase once a day to prevent the free-tier project from
// pausing after 7 days of inactivity.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorizedCron(req)) return res.status(401).end();

  const supabase = adminClient();

  const { error } = await supabase.from('settings').select('family_id').limit(1);

  if (error) {
    console.error('[keep-alive] ping failed:', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }

  console.log('[keep-alive] Supabase ping ok');
  return res.status(200).json({ ok: true });
}
