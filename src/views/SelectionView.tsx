import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, ChevronRight, Flame, CheckCircle2, Circle, Users, Trophy } from 'lucide-react';
import { Profile, Goal } from '../types';
import { cn } from '../lib/cn';
import { calculateLevelData } from '../lib/utils';
import Modal from '../components/Modal';

interface Props {
  profiles: Profile[];
  goals: Goal[];
  adminPin: string;
  calculateStreak: (profileId: string) => number;
  showNotification: (msg: string) => void;
  updateProfile: (profile: Profile) => void;
  onLogin: (profile: Profile, dest: 'dashboard' | 'admin') => void;
}

export default function SelectionView({ profiles, goals, adminPin, calculateStreak, showNotification, updateProfile, onLogin }: Props) {
  const [loginProfile, setLoginProfile] = useState<Profile | null>(null);
  const [loginMode, setLoginMode] = useState<'kid' | 'admin' | null>(null);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [tempPin, setTempPin] = useState('');

  const teamQuests = goals.filter(g => g.isTeam);

  function handleProfileClick(profile: Profile) {
    setLoginProfile(profile);
    setPinInput('');
    setTempPin('');
    if (profile.role === 'admin') {
      setLoginMode('admin');
    } else {
      setIsSettingPin(!profile.pin);
      setLoginMode('kid');
    }
  }

  function handleKidLogin() {
    if (!loginProfile) return;
    if (isSettingPin) {
      if (tempPin.length !== 4) { showNotification('Enter 4 digits!'); return; }
      updateProfile({ ...loginProfile, pin: tempPin });
      showNotification('PIN Created! Welcome 🚀');
      onLogin({ ...loginProfile, pin: tempPin }, 'dashboard');
      closeModal();
    } else {
      if (pinInput === loginProfile.pin) {
        onLogin(loginProfile, 'dashboard');
        closeModal();
      } else {
        showNotification('Wrong PIN! Try again.');
        setPinInput('');
      }
    }
  }

  function handleAdminLogin() {
    if (!loginProfile) return;
    if (pinInput === adminPin) {
      onLogin(loginProfile, 'admin');
      closeModal();
    } else {
      showNotification('Incorrect PIN!');
      setPinInput('');
    }
  }

  function closeModal() {
    setLoginMode(null);
    setLoginProfile(null);
    setPinInput('');
    setTempPin('');
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen flex flex-col bg-[#0d1929]"
      >
        {/* Logo floats in upper-left — background matches so no visible edge */}
        <div className="px-5 pt-6 pb-2">
          <motion.img
            src="/logo.jpg"
            alt="SkillSpark"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="h-24 w-auto"
          />
        </div>

        {/* ── Profiles panel ── */}
        <div className="flex-1">
          <div className="max-w-lg mx-auto px-5 pb-8 space-y-4">
            <p className="text-slate-400 font-medium text-sm">
              Who is practicing today?
            </p>

            {/* Profile cards */}
            <div className="grid gap-3">
              {profiles.map((p, i) => {
                const goal = goals.find(g => g.profileId === p.id);
                const streak = calculateStreak(p.id);
                const { level } = calculateLevelData(p.xp || 0);
                return (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    onClick={() => handleProfileClick(p)}
                    className="flex w-full items-center justify-between rounded-2xl bg-[#162236] p-5 transition-all hover:bg-[#1d2e47] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="flex flex-1 items-center gap-4">
                      <div className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-xl text-white shrink-0 font-black text-lg',
                        p.role === 'admin' ? 'bg-slate-600' : 'bg-blue-500'
                      )}>
                        {p.role === 'admin' ? <Settings size={20} /> : p.name.charAt(0)}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-base leading-tight text-white truncate">{p.name}</p>
                          {p.role === 'kid' && (
                            <span className="shrink-0 rounded-md bg-yellow-400/20 px-1.5 py-0.5 text-[10px] font-black text-yellow-400 uppercase">
                              LVL {level}
                            </span>
                          )}
                        </div>
                        {p.role === 'kid' && (
                          <div className="flex items-center gap-3 mt-1">
                            {streak > 0 && (
                              <div className="flex items-center gap-1 text-[#FF6321] font-black text-xs">
                                <Flame size={12} />
                                <span>{streak}d streak</span>
                              </div>
                            )}
                            {goal && goal.milestones.length > 0 && (() => {
                              const maxTarget = Math.max(...goal.milestones.map(m => m.target));
                              const pct = Math.min(100, (goal.currentValue / maxTarget) * 100);
                              return (
                                <div className="flex items-center gap-1.5 flex-1">
                                  <div className="h-1.5 flex-1 bg-slate-700 rounded-full overflow-hidden max-w-[72px]">
                                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400">{Math.round(pct)}%</span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        {p.role === 'admin' && (
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">Parent / Admin</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-600 ml-3 shrink-0" />
                  </motion.button>
                );
              })}
            </div>

            {/* Team quests */}
            {teamQuests.length > 0 && (
              <div className="space-y-3 pt-2">
                {teamQuests.map((quest, i) => {
                  const maxTarget = quest.milestones.length > 0 ? Math.max(...quest.milestones.map(m => m.target)) : 100;
                  const progress = Math.min(100, (quest.currentValue / maxTarget) * 100);
                  return (
                    <motion.div
                      key={quest.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * profiles.length + 0.05 * i }}
                      className="rounded-3xl bg-[#FF6321] p-5 text-white shadow-xl overflow-hidden relative text-left group"
                    >
                      <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Trophy size={100} />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Users size={10} className="opacity-70" />
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Shared Team Quest</p>
                            </div>
                            <h4 className="text-lg font-black leading-tight">{quest.title}</h4>
                          </div>
                          <div className="flex -space-x-2">
                            {profiles.filter(p => p.role === 'kid').map(p => (
                              <div key={p.id} className="h-7 w-7 rounded-full border-2 border-[#FF6321] bg-white flex items-center justify-center text-[10px] font-black text-[#FF6321]">
                                {p.name.charAt(0)}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-wide opacity-70 mb-1.5">
                            <span>Team Progress</span>
                            <span>{quest.currentValue} / {maxTarget}</span>
                          </div>
                          <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className="h-full bg-white rounded-full"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {quest.milestones.sort((a, b) => a.target - b.target).map(m => (
                            <div key={m.id} className={cn(
                              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase',
                              m.isAchieved ? 'bg-white text-[#FF6321]' : 'bg-white/10 text-white border border-white/20'
                            )}>
                              {m.isAchieved ? <CheckCircle2 size={9} /> : <Circle size={9} />}
                              {m.reward}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Kid login modal */}
      <Modal isOpen={loginMode === 'kid'} onClose={closeModal} title={isSettingPin ? 'Create Your PIN' : `${loginProfile?.name}'s Login`}>
        <div className="space-y-4">
          <p className="text-center text-sm text-[#9E9E9E]">
            {isSettingPin ? 'Choose 4 digits to protect your progress!' : 'Enter your 4-digit PIN to continue'}
          </p>
          <input
            type="password" maxLength={4}
            className="w-full text-center text-3xl font-black tracking-[1em] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 p-4 outline-none focus:border-[#FF6321]"
            value={isSettingPin ? tempPin : pinInput}
            onChange={e => isSettingPin ? setTempPin(e.target.value) : setPinInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleKidLogin()}
            autoFocus
          />
          <button onClick={handleKidLogin} className="w-full rounded-2xl bg-[#FF6321] py-4 font-black text-white active:scale-95 transition-transform">
            {isSettingPin ? 'Set PIN & Start' : "Let's Go!"}
          </button>
        </div>
      </Modal>

      {/* Admin login modal */}
      <Modal isOpen={loginMode === 'admin'} onClose={closeModal} title="Parent Login">
        <div className="space-y-4">
          <p className="text-center text-sm text-[#9E9E9E]">Enter your PIN to access settings</p>
          <input
            type="password" maxLength={4}
            className="w-full text-center text-3xl font-black tracking-[1em] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 p-4 outline-none focus:border-[#FF6321]"
            value={pinInput}
            onChange={e => setPinInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
            autoFocus
          />
          <button onClick={handleAdminLogin} className="w-full rounded-2xl bg-black dark:bg-white dark:text-black py-4 font-black text-white active:scale-95 transition-transform">
            Unlock Admin
          </button>
        </div>
      </Modal>
    </>
  );
}
