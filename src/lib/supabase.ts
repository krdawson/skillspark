import { createClient } from '@supabase/supabase-js';

// The anon key is a public key by design — safe to expose in frontend code.
// RLS now requires an authenticated session (see ensureSession), and sensitive
// data (PINs) lives in a server-only table — the anon key alone grants nothing.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cbdjrxileqcbouealmuy.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZGpyeGlsZXFjYm91ZWFsbXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzU3MjksImV4cCI6MjA5NDg1MTcyOX0.kV996a4Demf5m_QHFR_vXbpCqddZyMV7cVdtJTJaVvo';

export const FAMILY_ID: string = import.meta.env.VITE_FAMILY_ID || '66b6d6ab-b010-407f-921e-3aa8b43df317';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Session helpers ─────────────────────────────────────────────────────────

// RLS requires `authenticated`, so every read/write needs a session. Kids get an
// anonymous session; the parent upgrades to a Google session via useAuth.
// Deduped so concurrent callers (useAuth + useAppState) share one sign-in and
// don't create two anonymous users on first load.
let sessionPromise: Promise<void> | null = null;
export function ensureSession(): Promise<void> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) await supabase.auth.signInAnonymously();
    })().catch(err => { sessionPromise = null; throw err; });
  }
  return sessionPromise;
}

// fetch() wrapper that attaches the access token so guarded /api routes can
// authenticate the caller.
export async function authedFetch(input: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ── Row → App type mappers ──────────────────────────────────────────────────

export const toProfile = (r: any) => ({
  id: r.id, name: r.name, role: r.role, sport: r.sport,
  sportDrillsPerDay: r.drills_per_day ?? 3,
  conditioningDrillsPerDay: r.conditioning_drills_per_day ?? 1,
  hasPin: r.has_pin ?? false, xp: r.xp ?? 0, badges: r.badges ?? [],
  color: r.color ?? 'blue',
  restDays: r.rest_days ?? [],
});

export const toDrill = (r: any) => ({
  id: r.id, title: r.title, description: r.description,
  sports: r.sports, type: r.type, reps: r.reps,
});

export const toGoal = (r: any) => ({
  id: r.id, profileId: r.profile_id, title: r.title,
  type: r.type, currentValue: r.current_value,
  isTeam: r.is_team ?? false, milestones: r.milestones ?? [],
});

export const toLog = (r: any) => ({
  id: r.id, profileId: r.profile_id, date: r.date,
  completedDrillIds: r.completed_drill_ids ?? [],
  drillTimes: r.drill_times ?? {},
});

export const toRating = (r: any) => ({
  id: r.id, profileId: r.profile_id, drillId: r.drill_id,
  date: r.date, liked: r.liked, difficulty: r.difficulty as 1 | 2 | 3,
});

// ── App type → Row mappers ──────────────────────────────────────────────────

export const fromProfile = (p: any) => ({
  id: p.id, family_id: FAMILY_ID, name: p.name, role: p.role,
  sport: p.sport,
  drills_per_day: p.sportDrillsPerDay ?? 3,
  conditioning_drills_per_day: p.conditioningDrillsPerDay ?? 1,
  xp: p.xp ?? 0, badges: p.badges ?? [],
  color: p.color ?? 'blue',
  rest_days: p.restDays ?? [],
});

export const fromDrill = (d: any) => ({
  id: d.id, family_id: FAMILY_ID, title: d.title,
  description: d.description, sports: d.sports, type: d.type, reps: d.reps,
});

export const fromGoal = (g: any) => ({
  id: g.id, family_id: FAMILY_ID, profile_id: g.profileId,
  title: g.title, type: g.type, current_value: g.currentValue,
  is_team: g.isTeam ?? false, milestones: g.milestones,
});

export const fromLog = (l: any) => ({
  id: l.id, family_id: FAMILY_ID, profile_id: l.profileId,
  date: l.date, completed_drill_ids: l.completedDrillIds,
  drill_times: l.drillTimes ?? {},
});

export const fromRating = (r: any) => ({
  id: r.id, family_id: FAMILY_ID, profile_id: r.profileId,
  drill_id: r.drillId, date: r.date, liked: r.liked, difficulty: r.difficulty,
});
