import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, CheckCircle2, Play, Square } from 'lucide-react';
import { Drill } from '../types';
import { cn } from '../lib/cn';

interface Props {
  drill: Drill;
  isDone: boolean;
  sport?: string;
  recordedSeconds?: number;
  onToggle: () => void;
  onRate: (liked: boolean, difficulty: 1 | 2 | 3) => void;
  onTimeRecorded: (seconds: number) => void;
}

function formatTime(secs: number): string {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

const DIFFICULTY_OPTS = [
  { value: 1 as const, label: 'Easy',   emoji: '😌' },
  { value: 2 as const, label: 'Medium', emoji: '💪' },
  { value: 3 as const, label: 'Hard',   emoji: '🔥' },
];

export default function DrillCard({ drill, isDone, sport, recordedSeconds = 0, onToggle, onRate, onTimeRecorded }: Props) {
  const wasInitiallyDone = useRef(isDone);
  const prevIsDone = useRef(isDone);
  const [showRating, setShowRating] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionSecondsRef = useRef(0);
  const onTimeRecordedRef = useRef(onTimeRecorded);
  onTimeRecordedRef.current = onTimeRecorded;

  // Save accumulated time on unmount if timer is running
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (sessionSecondsRef.current > 0) {
        onTimeRecordedRef.current(sessionSecondsRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const justCompleted = !prevIsDone.current && isDone && !wasInitiallyDone.current;
    const justUnchecked = prevIsDone.current && !isDone;

    if (justCompleted) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setTimerRunning(false);
        if (sessionSecondsRef.current > 0) {
          onTimeRecordedRef.current(sessionSecondsRef.current);
          sessionSecondsRef.current = 0;
          setSessionSeconds(0);
        }
      }
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

  function handleTimerToggle(e: { stopPropagation(): void }) {
    e.stopPropagation();
    if (timerRunning) {
      clearInterval(intervalRef.current!);
      intervalRef.current = null;
      setTimerRunning(false);
      if (sessionSecondsRef.current > 0) {
        onTimeRecorded(sessionSecondsRef.current);
        sessionSecondsRef.current = 0;
        setSessionSeconds(0);
      }
    } else {
      setTimerRunning(true);
      intervalRef.current = setInterval(() => {
        sessionSecondsRef.current += 1;
        setSessionSeconds(s => s + 1);
      }, 1000);
    }
  }

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

  const totalSeconds = recordedSeconds + sessionSeconds;

  return (
    <div className={cn(
      'rounded-2xl bg-white dark:bg-slate-900 shadow-sm transition-all overflow-hidden',
      isDone && !showRating && 'opacity-60'
    )}>
      {/* Main drill row — click to toggle */}
      <button onClick={onToggle} className="w-full px-5 pt-5 pb-0 text-left">
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
      </button>

      {/* Bottom bar: reps + timer — clicking reps area also toggles */}
      <div
        className="mt-4 flex items-center gap-4 border-t border-slate-50 dark:border-slate-800 mx-5 pt-3 pb-5 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-1.5 text-[#FF6321]">
          <Flame size={16} />
          <span className="text-sm font-bold">{drill.reps}</span>
        </div>
        {/* Timer — stopPropagation so clicks here don't toggle the drill */}
        <div className="ml-auto flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {totalSeconds > 0 && (
            <span className={cn(
              'text-sm font-mono font-bold min-w-[36px] text-right',
              timerRunning ? 'text-[#FF6321]' : 'text-slate-400 dark:text-slate-500'
            )}>
              {formatTime(totalSeconds)}
            </span>
          )}
          <button
            onClick={handleTimerToggle}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-xl transition-all active:scale-90',
              timerRunning
                ? 'bg-red-100 dark:bg-red-950/30 text-red-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-[#FF6321] hover:bg-orange-50 dark:hover:bg-orange-950/20'
            )}
            title={timerRunning ? 'Stop timer' : 'Start timer'}
          >
            {timerRunning
              ? <Square size={12} fill="currentColor" />
              : <Play size={12} fill="currentColor" />
            }
          </button>
        </div>
      </div>

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
