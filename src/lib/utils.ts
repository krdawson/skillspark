import { Profile, DailyLog } from '../types';
import { format } from 'date-fns';

export function calculateLevelData(xp: number = 0): { level: number; currentXP: number; xpToNext: number } {
  const xpForLevel = (l: number) => l * 100;
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, currentXP: remaining, xpToNext: xpForLevel(level) };
}

export function calculateStreak(profileId: string, history: DailyLog[], profiles: Profile[]): number {
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return 0;

  const today = format(new Date(), 'yyyy-MM-dd');
  const restDays = new Set(profile.restDays ?? []);

  // Days where the drill goal was met
  const completedDays = new Set(
    history
      .filter(h => h.profileId === profileId && h.completedDrillIds.length >= (profile.sportDrillsPerDay ?? 3) + (profile.conditioningDrillsPerDay ?? 1))
      .map(h => h.date)
  );

  const isActive = (date: string) => completedDays.has(date) || restDays.has(date);

  // Start from today; if today isn't active yet, try yesterday (in-progress day)
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
  const startDate = isActive(today) ? today : yesterday;
  if (!isActive(startDate)) return 0;

  let streak = 0;
  let d = new Date(startDate + 'T12:00:00');
  while (isActive(format(d, 'yyyy-MM-dd'))) {
    streak++;
    d = new Date(d.getTime() - 86400000);
  }
  return streak;
}
