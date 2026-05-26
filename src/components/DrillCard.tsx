import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, CheckCircle2 } from 'lucide-react';
import { Drill } from '../types';
import { cn } from '../lib/cn';

interface Props {
  drill: Drill;
  isDone: boolean;
  sport?: string;
  onToggle: () => void;
  onRate: (liked: boolean, difficulty: 1 | 2 | 3) => void;
}

const DIFFICULTY_OPTS = [
  { value: 1 as const, label: 'Easy',   emoji: '😌' },
  { value: 2 as const, label: 'Medium', emoji: '💪' },
  { value: 3 as const, label: 'Hard',   emoji: '🔥' },
];

export default function DrillCard({ drill, isDone, sport, onToggle, onRate }: Props) {
  const wasInitiallyDone = useRef(isDone);
  const prevIsDone = useRef(isDone);
  const [showRating, setShowRating] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const justCompleted = !prevIsDone.current && isDone && !wasInitiallyDone.current;
    const justUnchecked = prevIsDone.current && !isDone;

    if (justCompleted) {
      setShowRating(true);
      setLiked(null);
      setDifficulty(null);
      setSubmitted(false);
    }
    if (justUnchecked) {
      setShowRating(false);
      setLiked(null);
      setDifficulty(null);
      setSubmitted(false);
      wasInitiallyDone.current = false;
    }
    prevIsDone.current = isDone;
  }, [isDone]);

  function pickLiked(value: boolean) {
    setLiked(value);
    if (difficulty !== null) submit(value, difficulty);
  }

  function pickDifficulty(value: 1 | 2 | 3) {
    setDifficulty(value);
    if (liked !== null) submit(liked, value);
  }

  function submit(l: boolean, d: 1 | 2 | 3) {
    onRate(l, d);
    setSubmitted(true);
    setTimeout(() => setShowRating(false), 600);
  }

  function skipRating() {
    setShowRating(false);
    setLiked(null);
    setDifficulty(null);
    setSubmitted(false);
    wasInitiallyDone.current = true;
  }

  return (
    <div className={cn(
      'rounded-2xl bg-white dark:bg-slate-900 shadow-sm transition-all overflow-hidden',
      isDone && !showRating && 'opacity-60'
    )}>
      {/* Main drill row — always toggleable, even while rating is open (uncheck closes the panel) */}
      <button
        onClick={onToggle}
        className="w-full p-5 text-left"
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className={cn(
              'rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
              drill.type === 'sport-specific' ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' :
              drill.type === 'conditioning'   ? 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400' :
                                                'bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400'
            )}>
              {drill.type === 'sport-specific' ? (sport ?? 'sport') : drill.type}
            </span>
            <h4 className={cn('text-lg font-bold dark:text-slate-100', isDone && !showRating && 'line-through opacity-50')}>
              {drill.title}
            </h4>
            <p className="text-sm text-[#9E9E9E] dark:text-slate-400">{drill.description}</p>
          </div>
          <div className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300',
            isDone ? 'bg-green-500 scale-110 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600'
          )}>
            <CheckCircle2 size={28} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 border-t border-slate-50 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-1.5 text-[#FF6321]">
            <Flame size={16} />
            <span className="text-sm font-bold">{drill.reps}</span>
          </div>
        </div>
      </button>

      {/* Rating panel */}
      <AnimatePresence>
        {showRating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            <div className="px-5 py-4 space-y-3 bg-slate-50 dark:bg-slate-800/50">
              {submitted ? (
                <p className="text-center text-sm font-black text-green-500 py-2">Rated! ✓</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Rate this drill
                    </p>
                    <button
                      onClick={skipRating}
                      className="text-xs text-slate-400 dark:text-slate-500 underline"
                    >
                      skip
                    </button>
                  </div>

                  {/* Liked row */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => pickLiked(true)}
                      className={cn(
                        'flex-1 rounded-xl py-2.5 text-sm font-black transition-all',
                        liked === true
                          ? 'bg-green-500 text-white scale-105'
                          : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      )}
                    >
                      👍 Liked it
                    </button>
                    <button
                      onClick={() => pickLiked(false)}
                      className={cn(
                        'flex-1 rounded-xl py-2.5 text-sm font-black transition-all',
                        liked === false
                          ? 'bg-red-500 text-white scale-105'
                          : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      )}
                    >
                      👎 Not for me
                    </button>
                  </div>

                  {/* Difficulty row */}
                  <div className="flex gap-2">
                    {DIFFICULTY_OPTS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => pickDifficulty(opt.value)}
                        className={cn(
                          'flex-1 rounded-xl py-2.5 text-xs font-black transition-all',
                          difficulty === opt.value
                            ? 'bg-[#FF6321] text-white scale-105'
                            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        )}
                      >
                        {opt.emoji} {opt.label}
                      </button>
                    ))}
                  </div>

                  {(liked !== null || difficulty !== null) && (
                    <p className="text-center text-[10px] text-slate-400">
                      {liked === null ? 'Pick 👍 or 👎 to finish' : difficulty === null ? 'Pick a difficulty to finish' : ''}
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
