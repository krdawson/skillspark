import { motion } from 'motion/react';
import { Flame, CheckCircle2, Circle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Profile, Goal, DailyLog } from '../types';
import { cn } from '../lib/cn';
import { calculateLevelData, calculateStreak } from '../lib/utils';

interface Props {
  profile: Profile;
  goals: Goal[];
  history: DailyLog[];
  allProfiles: Profile[];
  onEdit: () => void;
}

const SPORT_EMOJI: Record<string, string> = {
  soccer: '⚽',
  lacrosse: '🥍',
  both: '⚽🥍',
};

function getWeekDays(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(format(subDays(new Date(), i), 'yyyy-MM-dd'));
  }
  return days;
}

export default function KidProgressCard({ profile, goals, history, allProfiles, onEdit }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekDays = getWeekDays();

  const { level, currentXP, xpToNext } = calculateLevelData(profile.xp || 0);
  const streak = calculateStreak(profile.id, history, allProfiles);

  const todayLog = history.find(h => h.profileId === profile.id && h.date === today);
  const todayCount = todayLog?.completedDrillIds.length ?? 0;
  const todayDone = todayCount >= profile.drillsPerDay;
  const todayStarted = todayCount > 0;


  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white text-lg font-black">
            {profile.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg dark:text-slate-100 leading-tight">{profile.name}</h3>
              <span className="rounded-md bg-yellow-100 dark:bg-yellow-950/30 px-1.5 py-0.5 text-[10px] font-black text-yellow-700 dark:text-yellow-500 uppercase">
                LVL {level}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">
              {SPORT_EMOJI[profile.sport]} {profile.sport} · {profile.drillsPerDay} drills/day
            </p>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="text-xs font-bold text-blue-500 hover:underline"
        >
          Edit
        </button>
      </div>

      {/* Today's status */}
      <div className={cn(
        'flex items-center justify-between rounded-2xl px-4 py-3 mb-4',
        todayDone
          ? 'bg-green-50 dark:bg-green-950/20'
          : todayStarted
            ? 'bg-yellow-50 dark:bg-yellow-950/20'
            : 'bg-slate-50 dark:bg-slate-800'
      )}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Today</p>
          <p className={cn(
            'text-sm font-black',
            todayDone ? 'text-green-600 dark:text-green-400' :
            todayStarted ? 'text-yellow-600 dark:text-yellow-400' :
            'text-slate-400 dark:text-slate-500'
          )}>
            {todayDone
              ? 'All done! 🎉'
              : todayStarted
                ? `${todayCount} of ${profile.drillsPerDay} drills`
                : 'Not started yet'}
          </p>
        </div>
        {todayDone
          ? <CheckCircle2 size={24} className="text-green-500" />
          : todayStarted
            ? <div className="text-yellow-500 font-black text-sm">{todayCount}/{profile.drillsPerDay}</div>
            : <Circle size={24} className="text-slate-300 dark:text-slate-600" />
        }
      </div>

      {/* 7-day grid */}
      <div className="mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Last 7 Days</p>
        <div className="flex gap-1.5">
          {weekDays.map(day => {
            const log = history.find(h => h.profileId === profile.id && h.date === day);
            const count = log?.completedDrillIds.length ?? 0;
            const full = count >= profile.drillsPerDay;
            const partial = count > 0 && !full;
            const isToday = day === today;

            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div className={cn(
                  'w-full aspect-square rounded-lg transition-all',
                  full ? 'bg-green-400 dark:bg-green-500' :
                  partial ? 'bg-yellow-300 dark:bg-yellow-500' :
                  'bg-slate-100 dark:bg-slate-800'
                )} />
                <span className={cn(
                  'text-[8px] font-bold uppercase',
                  isToday ? 'text-[#FF6321]' : 'text-slate-300 dark:text-slate-600'
                )}>
                  {format(new Date(day + 'T12:00:00'), 'EEE').charAt(0)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-green-400" />
            <span className="text-[9px] text-slate-400 font-bold">Done</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-yellow-300" />
            <span className="text-[9px] text-slate-400 font-bold">Partial</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
            <span className="text-[9px] text-slate-400 font-bold">None</span>
          </div>
        </div>
      </div>

      {/* Streak + XP */}
      <div className="flex items-center gap-4 mb-4">
        {streak > 0 && (
          <div className="flex items-center gap-1.5 text-[#FF6321]">
            <Flame size={16} />
            <span className="text-sm font-black">{streak} day streak</span>
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black text-slate-400 uppercase">XP</span>
            <span className="text-[9px] font-black text-slate-400">{currentXP}/{xpToNext}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(currentXP / xpToNext) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-yellow-400 rounded-full"
            />
          </div>
        </div>
      </div>

    </motion.div>
  );
}
