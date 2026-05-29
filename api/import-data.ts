import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminClient, requireUser } from './_auth.js';

const FAMILY_ID = process.env.VITE_FAMILY_ID!;

// App-shape → row-shape mappers (mirror src/lib/supabase.ts, minus the dropped pin column).
const fromProfile = (p: any) => ({
  id: p.id, family_id: FAMILY_ID, name: p.name, role: p.role, sport: p.sport,
  drills_per_day: p.sportDrillsPerDay ?? 3,
  conditioning_drills_per_day: p.conditioningDrillsPerDay ?? 1,
  xp: p.xp ?? 0, badges: p.badges ?? [], color: p.color ?? 'blue',
  rest_days: p.restDays ?? [],
});
const fromDrill = (d: any) => ({
  id: d.id, family_id: FAMILY_ID, title: d.title, description: d.description,
  sports: d.sports, type: d.type, reps: d.reps,
});
const fromGoal = (g: any) => ({
  id: g.id, family_id: FAMILY_ID, profile_id: g.profileId, title: g.title,
  type: g.type, current_value: g.currentValue, is_team: g.isTeam ?? false,
  milestones: g.milestones,
});
const fromLog = (l: any) => ({
  id: l.id, family_id: FAMILY_ID, profile_id: l.profileId, date: l.date,
  completed_drill_ids: l.completedDrillIds, drill_times: l.drillTimes ?? {},
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // Destructive (wipes + restores all data) — restricted to a real (Google) session.
  const user = await requireUser(req, res);
  if (!user) return;
  if (user.is_anonymous) return res.status(403).json({ error: 'Admin only' });

  const { profiles, drills, goals, history } = req.body ?? {};
  if (!Array.isArray(profiles) || !profiles.length) {
    return res.status(400).json({ error: 'Invalid backup: profiles missing' });
  }

  const db = adminClient();
  try {
    // Wipe existing family data, then restore.
    await Promise.all([
      db.from('profiles').delete().eq('family_id', FAMILY_ID),
      db.from('drills').delete().eq('family_id', FAMILY_ID),
      db.from('goals').delete().eq('family_id', FAMILY_ID),
      db.from('daily_logs').delete().eq('family_id', FAMILY_ID),
    ]);

    const inserts: PromiseLike<any>[] = [db.from('profiles').insert(profiles.map(fromProfile))];
    if (Array.isArray(drills))  inserts.push(db.from('drills').insert(drills.map(fromDrill)));
    if (Array.isArray(goals))   inserts.push(db.from('goals').insert(goals.map(fromGoal)));
    if (Array.isArray(history)) inserts.push(db.from('daily_logs').insert(history.map(fromLog)));

    const results = await Promise.all(inserts);
    const failed = results.find(r => r.error);
    if (failed?.error) return res.status(500).json({ error: failed.error.message });

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[import-data]', err?.message);
    return res.status(500).json({ error: err?.message ?? 'Import failed' });
  }
}
