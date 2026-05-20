import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Settings, ChevronRight, Flame, Users, CheckCircle2, Circle } from 'lucide-react';
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        className="flex min-h-screen items-center justify-center p-6"
      >
        <div className="w-full max-w-md space-y-8 text-center">
          <div>
            <motion.div
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#FF6321] text-white shadow-lg"
            >
              <Trophy size={40} />
            </motion.div>
            <h1 className="mt-6 text-4xl font-black tracking-tight">SkillSpark</h1>
            <p className="text-[#9E9E9E]">Who is practicing today?</p>
          </div>

          <div className="grid gap-4">
            {profiles.map(p => {
              const goal = goals.find(g => g.profileId === p.id);
              const streak = calculateStreak(p.id);
              const { level } = calculateLevelData(p.xp || 0);
              return (
                <button
                  key={p.id}
                  onClick={() => handleProfileClick(p)}
                  className="flex w-full items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                >
                  <div className="flex flex-1 items-center gap-4">
                    <div className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full text-white shrink-0',
                      p.role === 'admin' ? 'bg-slate-800 dark:bg-slate-700' : 'bg-blue-500'
                    )}>
                      {p.role === 'admin' ? <Settings size={24} /> : <span className="text-lg font-black">{p.name.charAt(0)}</span>}
                    </div>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-lg leading-tight dark:text-slate-100">{p.name}</p>
                        {p.role === 'kid' && (
                          <span className="rounded-md bg-yellow-100 dark:bg-yellow-950/30 px-1.5 py-0.5 text-[10px] font-black text-yellow-700 dark:text-yellow-500 uppercase">
                            LVL {level}
                          </span>
                        )}
                      </div>
                      {p.role === 'kid' && (
                        <div className="flex items-center gap-3 mt-1">
                          {streak > 0 && (
                            <div className="flex items-center gap-1 text-[#FF6321] font-black text-xs">
                              <Flame size={14} />
                              <span>{streak} DAY STREAK</span>
                            </div>
                          )}
                          {goal && goal.milestones.length > 0 && (() => {
                            const maxTarget = Math.max(...goal.milestones.map(m => m.target));
                            const pct = Math.min(100, (goal.currentValue / maxTarget) * 100);
                            return (
                              <div className="flex items-center gap-1.5 flex-1">
                                <div className="h-1.5 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[80px]">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{Math.round(pct)}% TO GOAL</span>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300 dark:text-slate-700 ml-4 shrink-0" />
                </button>
              );
            })}
          </div>

          {teamQuests.length > 0 && (
            <div className="space-y-4 pt-4">
              {teamQuests.map(quest => {
                const maxTarget = quest.milestones.length > 0 ? Math.max(...quest.milestones.map(m => m.target)) : 100;
                const progress = (quest.currentValue / maxTarget) * 100;
                return (
                  <motion.div
                    key={quest.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="rounded-3xl bg-[#FF6321] p-6 text-white shadow-xl overflow-hidden relative text-left group"
                  >
                    <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">
                      <Trophy size={120} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Users size={12} className="opacity-80" />
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Shared Team Quest</p>
                          </div>
                          <h4 className="text-2xl font-black leading-tight tracking-tight">{quest.title}</h4>
                        </div>
                        <div className="flex -space-x-3">
                          {profiles.filter(p => p.role === 'kid').map(p => (
                            <div key={p.id} className="h-9 w-9 rounded-full border-2 border-[#FF6321] bg-white flex items-center justify-center text-xs font-black text-[#FF6321] shadow-md">
                              {p.name.charAt(0)}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mb-4 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest opacity-80">
                          <span>Team Progress</span>
                          <span>{quest.currentValue} / {maxTarget} Drills</span>
                        </div>
                        <div className="h-3 w-full bg-white/20 rounded-full overflow-hidden shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, progress)}%` }}
                            className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-1000"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 items-center overflow-x-auto pb-1">
                        {quest.milestones.sort((a, b) => a.target - b.target).map(m => (
                          <div key={m.id} className={cn(
                            'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all',
                            m.isAchieved ? 'bg-white text-[#FF6321]' : 'bg-white/10 text-white border border-white/20'
                          )}>
                            {m.isAchieved ? <CheckCircle2 size={10} /> : <Circle size={10} />}
                            <span>{m.reward}</span>
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
            {isSettingPin ? "Set PIN & Start" : "Let's Go!"}
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
