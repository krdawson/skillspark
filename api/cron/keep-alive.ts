import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Pings Supabase once a day to prevent the free-tier project from
// pausing after 7 days of inactivity.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
  );

  const { error } = await supabase.from('settings').select('family_id').limit(1);

  if (error) {
    console.error('[keep-alive] ping failed:', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }

  console.log('[keep-alive] Supabase ping ok');
  return res.status(200).json({ ok: true });
}
