import { Drill, Profile } from '../types';
import { format } from 'date-fns';

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    const j = (s >>> 0) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getDailyDrills(drills: Drill[], profile: Profile, date: string): Drill[] {
  // Pool 1: sport-specific drills matching this kid's sport
  const sportDrills = drills.filter(d => {
    if (d.type !== 'sport-specific') return false;
    if (profile.sport === 'both') return true;
    return d.sports.includes(profile.sport as 'soccer' | 'lacrosse');
  });

  // Pool 2: conditioning + strength apply to every kid regardless of sport
  const conditioningDrills = drills.filter(d =>
    d.type === 'conditioning' || d.type === 'strength'
  );

  const eligible = [...sportDrills, ...conditioningDrills];
  const seed = stringToSeed(`${date}-${profile.id}`);
  return seededShuffle(eligible, seed).slice(0, profile.drillsPerDay);
}

export function getTodaysDrills(drills: Drill[], profile: Profile): Drill[] {
  return getDailyDrills(drills, profile, format(new Date(), 'yyyy-MM-dd'));
}
