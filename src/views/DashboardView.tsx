import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Flame, Trophy, Medal, CheckCircle2, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { Profile, Goal, DailyLog, Drill, DrillRating } from '../types';
import { cn } from '../lib/cn';
import { calculateLevelData } from '../lib/utils';
import { getTodaysDrills } from '../lib/drills';
import { BADGE_DEFINITIONS } from '../lib/badges';
import RadialProgress from '../components/RadialProgress';
import DrillCard from '../components/DrillCard';

interface Props {
  activeProfile: Profile;
  drills: Drill[];
  goals: Goal[];
  dailyCompleted: Record<string, boolean>;
  history: DailyLog[];
  ratings: DrillRating[];
  calculateStreak: (profileId: string) => number;
  toggleDrill: (drillId: string, profile: Profile) => void;
  addDrillRating: (drillId: string, liked: boolean, difficulty: 1 | 2 | 3, profileId: string) => void;
  subscribeToNotifications: (profileId: string) => Promise<boolean>;
  onBack: () => void;
}

export default function DashboardView({ activeProfile, drills, goals, dailyCompleted, history, ratings, calculateStreak, toggleDrill, addDrillRating, subscribeToNotifications, onBack }: Props) {
  const [tab, setTab] = useState<'today' | 'history'>('today');
  const [notifGranted, setNotifGranted] = useState(() =>
    'Notification' in window && Notification.permission === 'granted'
  );
  const [notifDismissed, setNotifDismissed] = useState(() =>
    'Notification' in window &&
    Notification.permission !== 'default' &&
    localStorage.getItem(`notif-dismissed-${activeProfile.id}`) === '1'
  );

  const showNotifBanner = !notifGranted && !notifDismissed && 'Notification' in window;

  // If permission already granted (e.g. via OS settings), ensure the subscription
  // is saved in the DB — pushManager.subscribe() is idempotent so this is safe.
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      subscribeToNotifications(activeProfile.id);
    }
  }, [activeProfile.id]);

  async function handleEnableNotifications() {
    const ok = await subscribeToNotifications(activeProfile.id);
    if (ok) setNotifGranted(true);
    // Don't dismiss on failure — leave the banner so they can retry
  }

  const profileRatings = ratings.filter(r => r.profileId === activeProfile.id);
  const todaysDrills = getTodaysDrills(drills, activeProfile, profileRatings);
  const activeQuests = goals.filter(g => g.profileId === activeProfile.id || g.isTeam);
  const { level, currentXP, xpToNext } = calculateLevelData(activeProfile.xp || 0);
  const streak = calculateStreak(activeProfile.id);
  const profileHistory = history.filter(h => h.profileId === activeProfile.id).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen p-6 pb-24"
    >
      <header className="mb-8 flex items-center justify-between">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="flex gap-2 rounded-2xl bg-slate-100 dark:bg-slate-900 p-1">
          {(['today', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-bold transition-all capitalize',
                tab === t ? 'bg-white dark:bg-slate-800 text-black dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
              )}
            >
              {t === 'history' ? 'Log' : 'Today'}
            </button>
          ))}
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <p className="text-sm font-medium text-[#9E9E9E] uppercase tracking-wider">{format(new Date(), 'EEEE, MMM do')}</p>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black">{activeProfile.name}</h2>
            <span className="rounded-lg bg-yellow-100 dark:bg-yellow-950/30 px-2 py-1 text-xs font-black text-yellow-700 dark:text-yellow-500">
              LVL {level}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: `${(currentXP / xpToNext) * 100}%` }} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase">{currentXP}/{xpToNext} XP</span>
          </div>
        </div>
      </header>

      {tab === 'today' ? (
        <>
          {/* Notification permission banner */}
          {showNotifBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center justify-between rounded-2xl bg-blue-50 dark:bg-blue-950/30 px-4 py-3"
            >
              <div>
                <p className="text-sm font-black text-blue-800 dark:text-blue-300">Get daily drill reminders</p>
                <p className="text-xs text-blue-500 dark:text-blue-400">We'll remind you when it's time to practice</p>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <button
                  onClick={handleEnableNotifications}
                  className="rounded-xl bg-blue-500 px-3 py-1.5 text-xs font-black text-white active:scale-95"
                >
                  Enable
                </button>
                <button
                  onClick={() => { setNotifDismissed(true); localStorage.setItem(`notif-dismissed-${activeProfile.id}`, '1'); }}
                  className="text-blue-300 dark:text-blue-600 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Drills first ── */}
          <section className="space-y-4 mb-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Today's Drills</h3>
              {streak > 0 && (
                <div className="flex items-center gap-1 text-[#FF6321] font-black text-sm">
                  <Flame size={16} />
                  <span>{streak} Day Streak</span>
                </div>
              )}
            </div>
            <div className="grid gap-4">
              {todaysDrills.map(drill => (
                <DrillCard
                  key={drill.id}
                  drill={drill}
                  isDone={!!dailyCompleted[`${activeProfile.id}-${drill.id}`]}
                  sport={activeProfile.sport}
                  onToggle={() => toggleDrill(drill.id, activeProfile)}
                  onRate={(liked, difficulty) => addDrillRating(drill.id, liked, difficulty, activeProfile.id)}
                />
              ))}
              {todaysDrills.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <Timer size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No drills found for this sport. Ask your parent to add some!</p>
                </div>
              )}
            </div>
          </section>

          {/* ── Progress below ── */}
          {activeQuests.map(quest => {
            const isStreak = quest.type === 'streak';
            const themeText = isStreak ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400';
            const themeRadial = isStreak ? 'text-orange-500' : 'text-blue-500';
            const themeBorder = isStreak ? 'border-orange-500' : 'border-blue-500';
            const maxTarget = quest.milestones.length > 0 ? Math.max(...quest.milestones.map(m => m.target)) : 1;

            return (
              <section key={quest.id} className={cn('mb-8 rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm overflow-hidden border-l-4', themeBorder)}>
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-[#9E9E9E]">
                        {quest.isTeam ? 'Shared Team Quest' : 'Active Quest'}
                      </p>
                      <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{quest.title}</h3>
                    </div>
                    <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', isStreak ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-600' : 'bg-blue-100 dark:bg-blue-950/30 text-blue-600')}>
                      {isStreak ? <Flame size={24} /> : quest.isTeam ? <Medal size={24} /> : <Trophy size={24} />}
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute top-1/2 left-0 h-1.5 w-full -translate-y-1/2 rounded-full bg-slate-100 dark:bg-slate-800" />
                    <div className="relative flex justify-between">
                      {quest.milestones.sort((a, b) => a.target - b.target).map((m, idx) => {
                        const isNext = !m.isAchieved && (idx === 0 || quest.milestones[idx - 1]?.isAchieved);
                        return (
                          <div key={m.id} className="relative flex flex-col items-center">
                            <div className={cn(
                              'z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500',
                              m.isAchieved ? 'bg-green-500 text-white' :
                              isNext ? (isStreak ? 'bg-orange-500 text-white scale-110 shadow-lg' : 'bg-blue-500 text-white scale-110 shadow-lg') :
                              'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-300'
                            )}>
                              {m.isAchieved ? <CheckCircle2 size={16} /> : <span className="text-[10px] font-black">{m.target}</span>}
                            </div>
                            <p className={cn(
                              'mt-2 text-[10px] font-black uppercase tracking-wider transition-all text-center',
                              m.isAchieved ? 'text-green-600' : isNext ? (isStreak ? 'text-orange-600' : 'text-blue-600') : 'text-slate-400 dark:text-slate-600'
                            )}>
                              {m.reward}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={cn('flex items-center justify-between rounded-2xl p-4', isStreak ? 'bg-orange-100/50 dark:bg-orange-900/10' : 'bg-blue-100/50 dark:bg-blue-900/10')}>
                    <div className="flex items-center gap-3">
                      <RadialProgress progress={Math.min(100, (quest.currentValue / maxTarget) * 100)} size={50} strokeWidth={6} color={themeRadial} />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Overall Progress</p>
                        <p className="font-black text-slate-700 dark:text-slate-300">{quest.currentValue} {isStreak ? 'Day Streak' : 'Total Drills'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {(() => {
                        const next = quest.milestones.find(m => !m.isAchieved);
                        return next
                          ? <><p className="text-[10px] font-bold text-slate-400 uppercase">Next Reward</p><p className={cn('font-black', themeText)}>{next.target - quest.currentValue} more to go!</p></>
                          : <p className="font-black text-green-500">Quest Complete! 🏆</p>;
                      })()}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}

          {activeProfile.badges && activeProfile.badges.length > 0 && (
            <section className="mb-8">
              <h3 className="mb-3 text-sm font-bold text-slate-400 uppercase tracking-widest">Badges Earned</h3>
              <div className="flex flex-wrap gap-3">
                {activeProfile.badges.map(badgeId => {
                  const badge = BADGE_DEFINITIONS.find(b => b.id === badgeId);
                  if (!badge) return null;
                  return (
                    <motion.div
                      key={badge.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      whileHover={{ y: -5 }}
                      className={cn('flex items-center gap-2 rounded-2xl px-4 py-2 shadow-sm cursor-default', badge.color)}
                      title={badge.description}
                    >
                      {badge.icon}
                      <span className="text-xs font-black uppercase tracking-tight">{badge.title}</span>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

        </>
      ) : (
        <section className="space-y-4">
          <h3 className="text-lg font-bold">Past Activity</h3>
          <div className="grid gap-3">
            {profileHistory.map(log => (
              <div key={log.id} className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-bold dark:text-slate-100">{format(new Date(log.date + 'T12:00:00'), 'MMM do, yyyy')}</p>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                    {log.completedDrillIds.length} drills
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {log.completedDrillIds.map(id => {
                    const d = drills.find(drill => drill.id === id);
                    return d ? (
                      <span key={id} className="rounded-lg bg-green-50 dark:bg-green-950/20 px-2 py-1 text-[10px] font-bold text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900">
                        {d.title}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
            {profileHistory.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <Timer size={48} className="mx-auto mb-4 opacity-20" />
                <p>No drills logged yet. Start today!</p>
              </div>
            )}
          </div>
        </section>
      )}
    </motion.div>
  );
}
