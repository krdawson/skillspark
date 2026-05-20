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
  const eligible = drills.filter(d =>
    profile.sport === 'both' ||
    d.sports.includes(profile.sport as 'soccer' | 'lacrosse' | 'both') ||
    d.sports.includes('both')
  );
  const seed = stringToSeed(`${date}-${profile.id}`);
  return seededShuffle(eligible, seed).slice(0, profile.drillsPerDay);
}

export function getTodaysDrills(drills: Drill[], profile: Profile): Drill[] {
  return getDailyDrills(drills, profile, format(new Date(), 'yyyy-MM-dd'));
}
