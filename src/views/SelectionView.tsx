import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Flame } from 'lucide-react';
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
  signInWithGoogle: () => Promise<void>;
  onLogin: (profile: Profile, dest: 'dashboard' | 'admin') => void;
}

export default function SelectionView({ profiles, goals, adminPin, calculateStreak, showNotification, updateProfile, signInWithGoogle, onLogin }: Props) {
  const [loginProfile, setLoginProfile] = useState<Profile | null>(null);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [tempPin, setTempPin] = useState('');

  // Device pinning — stored per-browser so each device remembers its kid
  const [deviceProfileId, setDeviceProfileId] = useState<string | null>(
    () => localStorage.getItem('deviceProfileId')
  );

  const kidProfiles = profiles.filter(p => p.role === 'kid');
  const pinnedProfile = deviceProfileId ? kidProfiles.find(p => p.id === deviceProfileId) : null;

  function handleProfileClick(profile: Profile) {
    setLoginProfile(profile);
    setPinInput('');
    setTempPin('');
    setIsSettingPin(!profile.pin);
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

  function closeModal() {
    setLoginProfile(null);
    setPinInput('');
    setTempPin('');
  }

  // ── Pinned device view ────────────────────────────────────────────────────
  // When this device is assigned to a kid, skip straight to their PIN entry

  if (pinnedProfile) {
    const streak = calculateStreak(pinnedProfile.id);
    const { level } = calculateLevelData(pinnedProfile.xp || 0);

    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen flex flex-col bg-[#0d1929]"
        >
          <div className="flex justify-center pt-8 pb-4">
            <motion.img
              src="/logo.jpg" alt="SkillSpark"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-44 w-auto"
            />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12 gap-6">
            <div className="text-center">
              <div className="mx-auto mb-3 h-20 w-20 rounded-2xl bg-blue-500 flex items-center justify-center text-white text-4xl font-black shadow-lg">
                {pinnedProfile.name.charAt(0)}
              </div>
              <h2 className="text-white text-2xl font-black">Hey, {pinnedProfile.name}!</h2>
              <p className="text-slate-400 text-sm mt-1">
                {streak > 0 ? `🔥 ${streak} day streak — keep it going!` : 'Ready to practice?'}
              </p>
              <span className="mt-2 inline-block rounded-md bg-yellow-400/20 px-2 py-0.5 text-[10px] font-black text-yellow-400 uppercase">
                LVL {level}
              </span>
            </div>

            <div className="w-full max-w-xs space-y-4">
              <p className="text-center text-sm text-slate-400">
                {isSettingPin ? 'Choose your 4-digit PIN' : 'Enter your PIN'}
              </p>
              <input
                type="password" maxLength={4}
                className="w-full text-center text-3xl font-black tracking-[1em] rounded-2xl border border-slate-700 bg-[#162236] text-white p-4 outline-none focus:border-[#FF6321]"
                value={isSettingPin ? tempPin : pinInput}
                placeholder="••••"
                onChange={e => isSettingPin ? setTempPin(e.target.value) : setPinInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    setLoginProfile(pinnedProfile);
                    setIsSettingPin(!pinnedProfile.pin);
                    handleKidLoginPinned();
                  }
                }}
                autoFocus
              />
              <button
                onClick={() => {
                  setLoginProfile(pinnedProfile);
                  setIsSettingPin(!pinnedProfile.pin);
                  handleKidLoginPinned();
                }}
                className="w-full rounded-2xl bg-[#FF6321] py-4 font-black text-white active:scale-95 transition-transform"
              >
                {isSettingPin ? "Set PIN & Start" : "Let's Go!"}
              </button>
            </div>

            <button
              onClick={() => { setDeviceProfileId(null); localStorage.removeItem('deviceProfileId'); }}
              className="text-slate-600 text-xs font-bold"
            >
              Not {pinnedProfile.name}?
            </button>
          </div>
        </motion.div>
      </>
    );

    function handleKidLoginPinned() {
      const profile = pinnedProfile!;
      const settingPin = !profile.pin;
      if (settingPin) {
        if (tempPin.length !== 4) { showNotification('Enter 4 digits!'); return; }
        updateProfile({ ...profile, pin: tempPin });
        showNotification('PIN Created! Welcome 🚀');
        onLogin({ ...profile, pin: tempPin }, 'dashboard');
        setTempPin('');
      } else {
        if (pinInput === profile.pin) {
          onLogin(profile, 'dashboard');
          setPinInput('');
        } else {
          showNotification('Wrong PIN! Try again.');
          setPinInput('');
        }
      }
    }
  }

  // ── Full selection view ───────────────────────────────────────────────────

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen flex flex-col bg-[#0d1929]"
      >
        <div className="flex justify-center pt-8 pb-4">
          <motion.img
            src="/logo.jpg" alt="SkillSpark"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="h-44 w-auto"
          />
        </div>

        <div className="flex-1">
          <div className="max-w-lg mx-auto px-5 pb-8 space-y-3">
            <p className="text-slate-400 font-medium text-sm text-center mb-4">
              Who is practicing today?
            </p>

            {/* Kid profiles */}
            {kidProfiles.map((p, i) => {
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
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 text-white shrink-0 font-black text-lg">
                      {p.name.charAt(0)}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-base leading-tight text-white truncate">{p.name}</p>
                        <span className="shrink-0 rounded-md bg-yellow-400/20 px-1.5 py-0.5 text-[10px] font-black text-yellow-400 uppercase">
                          LVL {level}
                        </span>
                      </div>
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
                              <span className="text-[10px] font-bold text-slate-500">{Math.round(pct)}%</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-600 ml-3 shrink-0" />
                </motion.button>
              );
            })}

            {/* Parent sign-in */}
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * kidProfiles.length }}
              onClick={signInWithGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-transparent p-4 text-slate-400 transition-all hover:bg-[#162236] hover:text-slate-200 active:scale-[0.98]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-sm font-bold">Parent sign in</span>
            </motion.button>

          </div>
        </div>
      </motion.div>

      {/* Kid PIN modal */}
      <Modal isOpen={!!loginProfile} onClose={closeModal} title={isSettingPin ? 'Create Your PIN' : `${loginProfile?.name}'s Login`}>
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
    </>
  );
}
