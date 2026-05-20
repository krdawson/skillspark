import { createClient } from '@supabase/supabase-js';

// The anon key is a public key by design — safe to expose in frontend code.
// Supabase's Row Level Security policies protect the data, not the key.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cbdjrxileqcbouealmuy.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZGpyeGlsZXFjYm91ZWFsbXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzU3MjksImV4cCI6MjA5NDg1MTcyOX0.kV996a4Demf5m_QHFR_vXbpCqddZyMV7cVdtJTJaVvo';

export const FAMILY_ID: string = import.meta.env.VITE_FAMILY_ID || '66b6d6ab-b010-407f-921e-3aa8b43df317';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Row → App type mappers ──────────────────────────────────────────────────

export const toProfile = (r: any) => ({
  id: r.id, name: r.name, role: r.role, sport: r.sport,
  drillsPerDay: r.drills_per_day,
  pin: r.pin ?? undefined, xp: r.xp ?? 0, badges: r.badges ?? [],
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
});

// ── App type → Row mappers ──────────────────────────────────────────────────

export const fromProfile = (p: any) => ({
  id: p.id, family_id: FAMILY_ID, name: p.name, role: p.role,
  sport: p.sport, drills_per_day: p.drillsPerDay,
  pin: p.pin ?? null, xp: p.xp ?? 0, badges: p.badges ?? [],
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
});
