import { Drill, Profile, DrillRating } from '../types';
import { format } from 'date-fns';

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

function makeLCG(seed: number): () => number {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

// Weighted reservoir sampling — items with higher weight appear earlier
function weightedSeededShuffle<T>(items: T[], weights: number[], seed: number): T[] {
  const rng = makeLCG(seed);
  const scored = items.map((item, i) => ({
    item,
    score: Math.pow(rng(), 1 / Math.max(0.01, weights[i])),
  }));
  return scored.sort((a, b) => b.score - a.score).map(s => s.item);
}

function getDrillWeight(ratings: DrillRating[], drillId: string): number {
  const hits = ratings.filter(r => r.drillId === drillId);
  if (!hits.length) return 1.0;

  const avgLiked = hits.reduce((s, r) => s + (r.liked ? 1 : 0), 0) / hits.length;
  const avgDiff  = hits.reduce((s, r) => s + r.difficulty, 0) / hits.length;

  // liked range: 0.4 (always disliked) → 1.6 (always liked)
  const likedW = 0.4 + avgLiked * 1.2;
  // difficulty range: 0.8 (always easy) → 1.4 (always hard)
  const diffW  = 0.8 + (avgDiff - 1) * 0.3;

  return likedW * diffW;
}

export function getDailyDrills(drills: Drill[], profile: Profile, date: string, ratings: DrillRating[] = []): Drill[] {
  const sportDrills = drills.filter(d => {
    if (d.type !== 'sport-specific') return false;
    if (profile.sport === 'both') return true;
    return d.sports.includes(profile.sport as 'soccer' | 'lacrosse');
  });

  const conditioningDrills = drills.filter(d =>
    d.type === 'conditioning' || d.type === 'strength'
  );

  const eligible = [...sportDrills, ...conditioningDrills];
  const seed = stringToSeed(`${date}-${profile.id}`);

  if (!ratings.length) {
    // No ratings yet — plain seeded shuffle
    const rng = makeLCG(seed);
    const result = [...eligible];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result.slice(0, profile.drillsPerDay);
  }

  const weights = eligible.map(d => getDrillWeight(ratings, d.id));
  return weightedSeededShuffle(eligible, weights, seed).slice(0, profile.drillsPerDay);
}

export function getTodaysDrills(drills: Drill[], profile: Profile, ratings: DrillRating[] = []): Drill[] {
  return getDailyDrills(drills, profile, format(new Date(), 'yyyy-MM-dd'), ratings);
}
