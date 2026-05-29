import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

// URL and family ID are public (also hardcoded as fallbacks in src/lib/supabase.ts),
// so we fall back to them when the env var isn't set in the deployment. The
// service_role KEY has no fallback — it's a secret and must come from the env.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cbdjrxileqcbouealmuy.supabase.co';
export const FAMILY_ID = process.env.VITE_FAMILY_ID || '66b6d6ab-b010-407f-921e-3aa8b43df317';

// service_role client — bypasses RLS. Server-only; the key is never exposed to the browser.
export function adminClient(): SupabaseClient {
  return createClient(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function bearer(req: VercelRequest): string | null {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

/**
 * Validates the caller's Supabase access token (anonymous or Google session).
 * Returns the user, or null if the token is missing/invalid.
 */
export async function getUser(req: VercelRequest): Promise<User | null> {
  const token = bearer(req);
  if (!token) return null;
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/** Sends 401 and returns null if the request has no valid session. */
export async function requireUser(req: VercelRequest, res: VercelResponse): Promise<User | null> {
  const user = await getUser(req);
  if (!user) { res.status(401).json({ error: 'Authentication required' }); return null; }
  return user;
}

/** Verifies the Vercel Cron bearer secret. */
export function isAuthorizedCron(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.authorization === `Bearer ${secret}`;
}
