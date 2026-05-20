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

  const logs = history
    .filter(h => h.profileId === profileId)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (logs.length === 0) return 0;

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');

  if (logs[0].date !== today && logs[0].date !== yesterday) return 0;

  let streak = 0;
  for (let i = 0; i < logs.length; i++) {
    if (logs[i].completedDrillIds.length >= profile.drillsPerDay) {
      streak++;
    } else {
      if (i === 0 && logs[i].date === today) continue;
      break;
    }
  }
  return streak;
}
