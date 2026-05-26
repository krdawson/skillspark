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

// ── Drill weighting ───────────────────────────────────────────────────────────
// Weights control how often a drill appears in a kid's daily rotation.
// Unrated drills always get 1.0 (baseline) so new drills get fair exposure.
//
// Two independent factors are multiplied together:
//
// LIKED factor   (avgLiked = 0–1, where 1 = always thumbs-up)
//   Formula : 0.4 + avgLiked * 1.2
//   Range   : 0.4 (always 👎) → 1.6 (always 👍)
//
// DIFFICULTY factor   (avgDiff = 1–3, where 3 = always Hard)
//   Formula : 0.8 + (avgDiff - 1) * 0.3
//   Range   : 0.8 (always Easy) → 1.4 (always Hard)
//
// Combined examples:
//   👍 + Hard   → 1.6 × 1.4 = 2.24  (shows up most)
//   👍 + Medium → 1.6 × 1.1 = 1.76
//   👍 + Easy   → 1.6 × 0.8 = 1.28
//   No rating   → 1.0 (baseline)
//   👎 + Hard   → 0.4 × 1.4 = 0.56
//   👎 + Easy   → 0.4 × 0.8 = 0.32  (shows up least, never hidden)
//
// To adjust: tweak the constants in likedW / diffW below.
// ─────────────────────────────────────────────────────────────────────────────
function getDrillWeight(ratings: DrillRating[], drillId: string): number {
  const hits = ratings.filter(r => r.drillId === drillId);
  if (!hits.length) return 1.0;

  const avgLiked = hits.reduce((s, r) => s + (r.liked ? 1 : 0), 0) / hits.length;
  const avgDiff  = hits.reduce((s, r) => s + r.difficulty, 0) / hits.length;

  const likedW = 0.4 + avgLiked * 1.2;
  const diffW  = 0.8 + (avgDiff - 1) * 0.3;

  return likedW * diffW;
}

export function getDailyDrills(drills: Drill[], profile: Profile, date: string, ratings: DrillRating[] = []): Drill[] {
  const sportCount = profile.sportDrillsPerDay ?? 3;
  const condCount = profile.conditioningDrillsPerDay ?? 1;

  const sportPool = drills.filter(d => {
    if (d.type !== 'sport-specific') return false;
    if (profile.sport === 'both') return true;
    return d.sports.includes(profile.sport as 'soccer' | 'lacrosse');
  });

  const condPool = drills.filter(d =>
    d.type === 'conditioning' || d.type === 'strength'
  );

  const seed = stringToSeed(`${date}-${profile.id}`);

  function pickFromPool(pool: Drill[], count: number, seedOffset: number): Drill[] {
    if (!pool.length || count <= 0) return [];
    const s = seed + seedOffset;
    if (!ratings.length) {
      const rng = makeLCG(s);
      const result = [...pool];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result.slice(0, count);
    }
    const weights = pool.map(d => getDrillWeight(ratings, d.id));
    return weightedSeededShuffle(pool, weights, s).slice(0, count);
  }

  return [
    ...pickFromPool(sportPool, sportCount, 0),
    ...pickFromPool(condPool, condCount, 1),
  ];
}

export function getTodaysDrills(drills: Drill[], profile: Profile, ratings: DrillRating[] = []): Drill[] {
  return getDailyDrills(drills, profile, format(new Date(), 'yyyy-MM-dd'), ratings);
}
