import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Moon, Sun, Plus, Users, Trophy, Medal, Dumbbell, ChevronDown, RotateCcw, Download, Upload, Clock } from 'lucide-react';
import { PROFILE_COLORS, getProfileColor } from '../lib/profileColors';
import { format } from 'date-fns';
import { Profile, Drill, Goal, DailyLog, DrillRating, Sport, DrillType, GoalType, Milestone } from '../types';
import { cn } from '../lib/cn';
import { calculateStreak as calcStreak } from '../lib/utils';
import { PREDEFINED_REWARDS } from '../constants';
import Modal from '../components/Modal';
import AdminDrillCard from '../components/AdminDrillCard';
import RadialProgress from '../components/RadialProgress';
import KidProgressCard from '../components/KidProgressCard';

interface Props {
  profiles: Profile[];
  drills: Drill[];
  goals: Goal[];
  history: DailyLog[];
  ratings: DrillRating[];
  theme: 'light' | 'dark';
  adminPin: string;
  toggleTheme: () => void;
  showNotification: (msg: string, isError?: boolean) => void;
  addProfile: (data: { name: string; sport: Sport; sportDrillsPerDay: number; conditioningDrillsPerDay: number }) => void;
  updateProfile: (profile: Profile) => void;
  addDrill: (data: Omit<Drill, 'id'>) => void;
  updateDrill: (drill: Drill) => void;
  deleteDrill: (id: string) => void;
  addGoal: (data: Partial<Goal>) => boolean;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (id: string) => void;
  changeAdminPin: (pin: string) => void;
  exportData: () => void;
  importData: (json: string) => boolean;
  notificationTime: string;
  notificationEnabled: boolean;
  updateNotificationSettings: (s: { time?: string; enabled?: boolean }) => void;
  subscribeToNotifications: (profileId: string) => Promise<boolean>;
  onSignOut: () => Promise<void>;
  onBack: () => void;
}

const DRILL_CATEGORIES = [
  { id: 'soccer',      label: 'Soccer Drills',           icon: <Trophy size={18} className="text-blue-500" /> },
  { id: 'lacrosse',    label: 'Lacrosse Drills',          icon: <Medal size={18} className="text-orange-500" /> },
  { id: 'conditioning',label: 'Strength & Conditioning',  icon: <Dumbbell size={18} className="text-green-500" /> },
];

function newMilestone(): Milestone {
  return { id: Math.random().toString(36).substr(2, 9), target: 10, reward: '', isAchieved: false };
}

export default function AdminView({ profiles, drills, goals, history, ratings, theme, adminPin, toggleTheme, showNotification, addProfile, updateProfile, addDrill, updateDrill, deleteDrill, addGoal, updateGoal, deleteGoal, changeAdminPin, exportData, importData, notificationTime, notificationEnabled, updateNotificationSettings, subscribeToNotifications, onSignOut, onBack }: Props) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Drill modal
  const [drillModalOpen, setDrillModalOpen] = useState(false);
  const [drillForm, setDrillForm] = useState<Partial<Drill>>({ sports: [], type: 'sport-specific' });

  // Profile modals
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<{ name: string; sport: Sport; sportDrillsPerDay: number; conditioningDrillsPerDay: number }>({ name: '', sport: 'soccer', sportDrillsPerDay: 3, conditioningDrillsPerDay: 1 });
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Goal modals
  const [createGoalOpen, setCreateGoalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState<Partial<Goal>>({ type: 'total_drills', milestones: [] });
  const [editGoalOpen, setEditGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // PIN change modal
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Backup modal
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Rest day picker — selected day count per kid
  const [restDayPicks, setRestDayPicks] = useState<Record<string, number>>({});

  function grantRestDays(profile: Profile, days: number) {
    const newDates: string[] = [];
    for (let i = 0; i < days; i++) {
      newDates.push(format(new Date(Date.now() + i * 86400000), 'yyyy-MM-dd'));
    }
    const existing = (profile.restDays ?? []).filter(d => !newDates.includes(d));
    updateProfile({ ...profile, restDays: [...existing, ...newDates] });
    showNotification(`${days} rest day${days > 1 ? 's' : ''} granted for ${profile.name} 🛌`);
  }

  function clearRestDays(profile: Profile) {
    updateProfile({ ...profile, restDays: (profile.restDays ?? []).filter(d => d < todayStr) });
    showNotification('Rest days cleared.');
  }

  // Notification settings
  const [notifSubscribed, setNotifSubscribed] = useState(() =>
    'Notification' in window && Notification.permission === 'granted'
  );

  // Device assignment — which kid profile is pinned to this device
  const [deviceProfileId, setDeviceProfileId] = useState<string>(
    () => localStorage.getItem('deviceProfileId') ?? ''
  );

  function assignDevice(profileId: string) {
    setDeviceProfileId(profileId);
    if (profileId) {
      localStorage.setItem('deviceProfileId', profileId);
    } else {
      localStorage.removeItem('deviceProfileId');
    }
    showNotification(profileId ? 'Device assigned! Kids will skip straight to PIN.' : 'Device unassigned.');
  }

  // AI drill generation
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiSport, setAiSport] = useState<'soccer' | 'lacrosse' | 'conditioning'>('soccer');
  const [aiCount, setAiCount] = useState(5);
  const [aiGenerating, setAiGenerating] = useState(false);

  const kidProfiles = profiles.filter(p => p.role === 'kid');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayActivity = history.filter(h => h.date === todayStr);

  function toggleCategory(id: string) {
    setExpandedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  function openAddDrill() {
    setDrillForm({ sports: [], type: 'sport-specific' });
    setDrillModalOpen(true);
  }

  function openEditDrill(drill: Drill) {
    setDrillForm({ ...drill });
    setDrillModalOpen(true);
  }

  function saveDrill() {
    if (!drillForm.title || !drillForm.reps) { showNotification('Title and reps are required.'); return; }
    const sports = drillForm.sports?.length ? drillForm.sports : ['both' as Sport];
    if (drillForm.id) {
      updateDrill({ ...drillForm as Drill, sports });
    } else {
      addDrill({ title: drillForm.title!, description: drillForm.description || '', sports, type: drillForm.type as DrillType, reps: drillForm.reps! });
    }
    setDrillModalOpen(false);
  }

  function toggleDrillSport(sport: Sport) {
    const current = drillForm.sports || [];
    setDrillForm({ ...drillForm, sports: current.includes(sport) ? current.filter(s => s !== sport) : [...current, sport] });
  }

  function saveProfile() {
    if (!profileForm.name) { showNotification('Name is required.'); return; }
    addProfile(profileForm);
    setAddProfileOpen(false);
    setProfileForm({ name: '', sport: 'soccer', sportDrillsPerDay: 3, conditioningDrillsPerDay: 1 });
  }

  function saveEditProfile() {
    if (!editingProfile) return;
    updateProfile(editingProfile);
    showNotification('Profile updated! ✅');
    setEditProfileOpen(false);
    setEditingProfile(null);
  }

  function resetKidPin() {
    if (!editingProfile) return;
    updateProfile({ ...editingProfile, pin: undefined });
    showNotification('PIN Reset! They will set a new one next login. 🔄');
    setEditProfileOpen(false);
    setEditingProfile(null);
  }

  function openCreateGoal(isTeam = false) {
    setGoalForm({ type: 'total_drills', milestones: [], isTeam, profileId: isTeam ? 'team' : undefined });
    setCreateGoalOpen(true);
  }

  function saveNewGoal() {
    const ok = addGoal(goalForm);
    if (ok) {
      setCreateGoalOpen(false);
      setGoalForm({ type: 'total_drills', milestones: [] });
    }
  }

  function saveEditGoal() {
    if (!editingGoal) return;
    updateGoal(editingGoal);
    setEditGoalOpen(false);
    setEditingGoal(null);
  }

  function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const ok = importData(ev.target?.result as string);
      if (ok) setBackupModalOpen(false);
      setRestoring(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleChangePin() {
    if (newPin.length !== 4) { showNotification('PIN must be 4 digits.'); return; }
    if (newPin !== confirmPin) { showNotification('PINs do not match.'); return; }
    changeAdminPin(newPin);
    setPinModalOpen(false);
    setNewPin('');
    setConfirmPin('');
  }

  async function handleAiGenerate() {
    setAiGenerating(true);
    try {
      const sport = aiSport === 'conditioning' ? 'soccer' : aiSport;
      const res = await fetch('/api/generate-drills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport, name: 'Library', drillsPerDay: aiCount, recentDrills: [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');

      const sportMap: Record<string, Sport[]> = {
        soccer: ['soccer'],
        lacrosse: ['lacrosse'],
        conditioning: ['soccer', 'lacrosse', 'both' as Sport],
      };

      data.drills.forEach((d: { title: string; description: string; reps: string; type: string }) => {
        addDrill({
          title: d.title,
          description: d.description,
          reps: d.reps,
          type: d.type as DrillType,
          sports: sportMap[aiSport],
        });
      });

      showNotification(`${data.drills.length} drills added to library! ⚡`);
      setAiModalOpen(false);
    } catch (err: any) {
      showNotification(`AI error: ${err?.message ?? 'Generation failed'}`, true);
    } finally {
      setAiGenerating(false);
    }
  }

  function getCategoryDrills(catId: string) {
    if (catId === 'conditioning') return drills.filter(d => d.type === 'conditioning' || d.type === 'strength');
    return drills.filter(d => d.type === 'sport-specific' && d.sports.includes(catId as Sport));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen p-6 pb-12"
    >
      {/* ── Header ── */}
      <header className="mb-8 flex items-center justify-between">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm">
            {theme === 'light' ? <Moon size={20} className="text-slate-600" /> : <Sun size={20} className="text-yellow-400" />}
          </button>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Overview: kids + their quests ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black dark:text-slate-100">Overview</h2>
          <button
            onClick={() => setAddProfileOpen(true)}
            className="flex items-center gap-2 rounded-full bg-slate-800 dark:bg-slate-700 px-3 py-1.5 text-xs font-black text-white active:scale-95"
          >
            <Plus size={14} /> Add Kid
          </button>
        </div>

        <div className="space-y-8">
          {kidProfiles.map(p => {
            const kidGoals = goals.filter(g => g.profileId === p.id);
            return (
              <div key={p.id}>
                {/* Progress card */}
                <KidProgressCard
                  profile={p}
                  goals={goals}
                  history={history}
                  allProfiles={profiles}
                  onEdit={() => { setEditingProfile(p); setEditProfileOpen(true); }}
                />

                {/* Rest day controls */}
                <div className="flex items-center justify-between px-1 mt-3 mb-1 gap-2 flex-wrap">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">Quests</p>
                  {(() => {
                    const activeDays = (p.restDays ?? []).filter(d => d >= todayStr);
                    if (activeDays.length > 0) {
                      return (
                        <button onClick={() => clearRestDays(p)} className="text-[10px] font-bold text-purple-500 hover:text-red-400 transition-colors">
                          🛌 {activeDays.length} day{activeDays.length > 1 ? 's' : ''} granted · clear
                        </button>
                      );
                    }
                    const picked = restDayPicks[p.id] ?? 1;
                    return (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-slate-400">🛌</span>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5,6,7].map(n => (
                            <button
                              key={n}
                              onClick={() => setRestDayPicks(prev => ({ ...prev, [p.id]: n }))}
                              className={cn(
                                'h-5 w-5 rounded text-[9px] font-black transition-all',
                                picked === n ? 'bg-purple-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-purple-100'
                              )}
                            >{n}</button>
                          ))}
                        </div>
                        <button
                          onClick={() => grantRestDays(p, picked)}
                          className="text-[10px] font-bold text-purple-500 hover:text-purple-700 transition-colors"
                        >
                          Grant
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Kid's quests inline */}
                <div className="space-y-3 pl-1">
                  {kidGoals.map(g => {
                    const sorted = [...g.milestones].sort((a, b) => a.target - b.target);
                    const maxTarget = sorted.length > 0 ? sorted[sorted.length - 1].target : 1;
                    const fillPct = Math.min(100, (g.currentValue / maxTarget) * 100);
                    return (
                      <div key={g.id} className="rounded-2xl bg-white dark:bg-slate-900 px-4 pt-3 pb-4 shadow-sm">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-bold text-sm dark:text-slate-100">{g.title}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              {g.currentValue} / {maxTarget} {g.type === 'streak' ? 'days' : 'drills'}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => { setEditingGoal(g); setEditGoalOpen(true); }}
                              className="rounded-lg bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                            >Edit</button>
                            <button
                              onClick={() => { if (confirm('Delete this quest?')) deleteGoal(g.id); }}
                              className="rounded-lg px-2 py-1.5 text-slate-300 hover:text-red-400 transition-colors font-bold"
                            >×</button>
                          </div>
                        </div>

                        {/* Milestone track */}
                        {sorted.length > 0 && (
                          <div className="relative">
                            {/* Bar */}
                            <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full mx-2">
                              <div
                                className="h-full bg-[#FF6321] rounded-full transition-all duration-700"
                                style={{ width: `${fillPct}%` }}
                              />
                              {/* Milestone circles on the bar */}
                              {sorted.map(m => {
                                const pos = (m.target / maxTarget) * 100;
                                return (
                                  <div
                                    key={m.id}
                                    className={cn(
                                      'absolute top-1/2 h-4 w-4 rounded-full border-2 -translate-y-1/2 -translate-x-1/2 transition-colors',
                                      m.isAchieved
                                        ? 'bg-green-500 border-white dark:border-slate-900'
                                        : g.currentValue >= m.target
                                          ? 'bg-[#FF6321] border-white dark:border-slate-900'
                                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                                    )}
                                    style={{ left: `${pos}%` }}
                                  />
                                );
                              })}
                            </div>

                            {/* Reward labels below circles */}
                            <div className="relative h-8 mt-0.5 mx-2">
                              {sorted.map(m => {
                                const pos = (m.target / maxTarget) * 100;
                                return (
                                  <div
                                    key={m.id}
                                    className="absolute flex flex-col items-center -translate-x-1/2 pt-0.5"
                                    style={{ left: `${pos}%` }}
                                  >
                                    <span className={cn(
                                      'text-[8px] font-black whitespace-nowrap',
                                      m.isAchieved ? 'text-green-500' : 'text-slate-400 dark:text-slate-600'
                                    )}>
                                      {m.reward}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <DrillInsights ratings={ratings} drills={drills} profileId={p.id} />

                  <button
                    onClick={() => { setGoalForm({ type: 'total_drills', milestones: [], profileId: p.id }); setCreateGoalOpen(true); }}
                    className="w-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 py-2 text-[11px] font-black text-slate-400 uppercase tracking-wide hover:border-[#FF6321] hover:text-[#FF6321] transition-all"
                  >
                    + Add Quest for {p.name}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Team Goals */}
          {(() => {
            const teamGoals = goals.filter(g => g.isTeam);
            return (
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Team Goals</h3>
                <div className="space-y-2">
                  {teamGoals.map(g => {
                    const sorted = [...g.milestones].sort((a, b) => a.target - b.target);
                    const maxTarget = sorted.length > 0 ? sorted[sorted.length - 1].target : 1;
                    const fillPct = Math.min(100, (g.currentValue / maxTarget) * 100);
                    return (
                      <div key={g.id} className="rounded-2xl bg-[#FF6321]/10 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 px-4 pt-3 pb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-bold text-sm text-[#FF6321]">{g.title}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{g.currentValue} / {maxTarget} drills</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => { setEditingGoal(g); setEditGoalOpen(true); }} className="rounded-lg bg-white/60 dark:bg-slate-800 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 transition-colors">Edit</button>
                            <button onClick={() => { if (confirm('Delete this quest?')) deleteGoal(g.id); }} className="rounded-lg px-2 py-1.5 text-slate-300 hover:text-red-400 transition-colors font-bold">×</button>
                          </div>
                        </div>
                        {sorted.length > 0 && (
                          <div className="relative">
                            <div className="relative h-2 bg-orange-100 dark:bg-orange-950/40 rounded-full mx-2">
                              <div className="h-full bg-[#FF6321] rounded-full transition-all duration-700" style={{ width: `${fillPct}%` }} />
                              {sorted.map(m => {
                                const pos = (m.target / maxTarget) * 100;
                                return (
                                  <div key={m.id}
                                    className={cn('absolute top-1/2 h-4 w-4 rounded-full border-2 -translate-y-1/2 -translate-x-1/2 transition-colors',
                                      m.isAchieved ? 'bg-green-500 border-white dark:border-slate-900' :
                                      g.currentValue >= m.target ? 'bg-[#FF6321] border-white dark:border-slate-900' :
                                      'bg-white dark:bg-slate-800 border-orange-300 dark:border-slate-600'
                                    )}
                                    style={{ left: `${pos}%` }}
                                  />
                                );
                              })}
                            </div>
                            <div className="relative h-8 mt-0.5 mx-2">
                              {sorted.map(m => {
                                const pos = (m.target / maxTarget) * 100;
                                return (
                                  <div key={m.id} className="absolute flex flex-col items-center -translate-x-1/2 pt-0.5" style={{ left: `${pos}%` }}>
                                    <span className={cn('text-[8px] font-black whitespace-nowrap', m.isAchieved ? 'text-green-500' : 'text-slate-400 dark:text-slate-600')}>
                                      {m.reward}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button
                    onClick={() => openCreateGoal(true)}
                    className="w-full rounded-2xl border-2 border-dashed border-orange-200 dark:border-orange-900/30 py-2 text-[11px] font-black text-slate-400 uppercase tracking-wide hover:border-[#FF6321] hover:text-[#FF6321] transition-all"
                  >
                    + Add Team Goal
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── Practice Time ── */}
      {(() => {
        const kidsWithTime = kidProfiles
          .map(p => {
            const todayLog = history.find(h => h.profileId === p.id && h.date === todayStr);
            const times = todayLog?.drillTimes ?? {};
            const totalSecs = Object.values(times).reduce((a, b) => a + b, 0);
            return { profile: p, times, totalSecs };
          })
          .filter(k => k.totalSecs > 0);

        if (kidsWithTime.length === 0) return null;

        const familyTotal = kidsWithTime.reduce((acc, k) => acc + k.totalSecs, 0);

        return (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <Clock size={20} className="text-[#FF6321]" />
              <h2 className="text-xl font-black dark:text-slate-100">Practice Time Today</h2>
            </div>
            <div className="space-y-3">
              {kidsWithTime.map(({ profile: p, times, totalSecs }) => (
                <div key={p.id} className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-sm dark:text-slate-100">{p.name}</p>
                    <span className="text-sm font-black text-[#FF6321]">{formatAdminTime(totalSecs)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(times).map(([drillId, secs]) => {
                      const drill = drills.find(d => d.id === drillId);
                      return (
                        <div key={drillId} className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate mr-4">{drill?.title ?? 'Unknown drill'}</span>
                          <span className="text-xs font-mono font-bold text-slate-400 shrink-0">{formatAdminTime(secs)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {kidsWithTime.length > 1 && (
                <div className="rounded-2xl bg-slate-800 dark:bg-slate-700 px-4 py-3 flex items-center justify-between">
                  <p className="text-sm font-black text-white">Family Total</p>
                  <span className="text-sm font-black text-[#FF6321]">{formatAdminTime(familyTotal)}</span>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* ── Drill Library ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black dark:text-slate-100">Drill Library</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setAiModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-slate-800 dark:bg-slate-700 px-3 py-1.5 text-[10px] font-black text-white uppercase tracking-wide active:scale-90 shadow-md"
            >
              ✨ AI
            </button>
            <button onClick={openAddDrill} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6321] text-white active:scale-90 shadow-md">
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div className="grid gap-3">
          {DRILL_CATEGORIES.map(cat => {
            const catDrills = getCategoryDrills(cat.id);
            const isOpen = expandedCategories.includes(cat.id);
            return (
              <div key={cat.id} className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800">
                <button onClick={() => toggleCategory(cat.id)} className="flex w-full items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800">{cat.icon}</div>
                    <div className="text-left">
                      <p className="font-bold dark:text-slate-100">{cat.label}</p>
                      <p className="text-xs text-slate-400">{catDrills.length} Drills</p>
                    </div>
                  </div>
                  <ChevronDown className={cn('text-slate-300 transition-transform duration-300', isOpen && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-50 dark:border-slate-800"
                    >
                      <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                        {catDrills.map(drill => (
                          <AdminDrillCard key={drill.id} drill={drill} onDelete={deleteDrill} onEdit={openEditDrill} />
                        ))}
                        {catDrills.length === 0 && <p className="py-8 text-center text-sm text-slate-400 italic">No drills yet.</p>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Settings ── */}
      <section>
        <h2 className="text-xl font-black dark:text-slate-100 mb-5">Settings</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {/* Notifications */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold dark:text-slate-100">Notifications</p>
                <p className="text-xs text-slate-400">Daily drill reminders</p>
              </div>
              <button
                onClick={() => updateNotificationSettings({ enabled: !notificationEnabled })}
                className={cn('relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200', notificationEnabled ? 'bg-[#FF6321]' : 'bg-slate-200 dark:bg-slate-700')}
              >
                <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow translate-y-0.5 transition-transform duration-200', notificationEnabled ? 'translate-x-5' : 'translate-x-0.5')} />
              </button>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-[#9E9E9E] mb-1">Time (CT) — fires daily</p>
              <input
                type="time" value={notificationTime}
                onChange={e => updateNotificationSettings({ time: e.target.value })}
                disabled={!notificationEnabled}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm font-bold outline-none focus:border-[#FF6321] disabled:opacity-40"
              />
              <p className="text-[10px] text-slate-400 mt-1">Exact time requires Vercel Pro</p>
            </div>
            {notifSubscribed ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-bold">✓ Enabled on this device</div>
            ) : (
              <button
                onClick={async () => {
                  const adminProfile = profiles.find(p => p.role === 'admin');
                  if (!adminProfile) return;
                  const ok = await subscribeToNotifications(adminProfile.id);
                  if (ok) { setNotifSubscribed(true); showNotification('Notifications enabled! 🔔'); }
                  else showNotification('Could not enable — check browser settings.', true);
                }}
                className="w-full rounded-xl bg-slate-800 dark:bg-slate-700 py-2 text-xs font-black text-white active:scale-95"
              >
                🔔 Enable on this device
              </button>
            )}
          </div>

          {/* Device Assignment */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div>
              <p className="font-bold dark:text-slate-100">This Device</p>
              <p className="text-xs text-slate-400">Assign a kid — they skip straight to PIN</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => assignDevice('')}
                className={cn('rounded-xl px-3 py-1.5 text-xs font-black transition-all', !deviceProfileId ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500')}
              >
                Not assigned
              </button>
              {kidProfiles.map(p => (
                <button key={p.id} onClick={() => assignDevice(p.id)}
                  className={cn('rounded-xl px-3 py-1.5 text-xs font-black transition-all', deviceProfileId === p.id ? 'bg-[#FF6321] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500')}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div>
              <p className="font-bold dark:text-slate-100">Backup & Restore</p>
              <p className="text-xs text-slate-400">Export or import all data as JSON</p>
            </div>
            <button onClick={exportData} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF6321] py-2.5 text-xs font-black text-white active:scale-95">
              <Download size={14} /> Download Backup
            </button>
            <label className="w-full flex items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-2.5 text-xs font-black text-slate-400 hover:border-[#FF6321] hover:text-[#FF6321] transition-all">
              <Upload size={14} /> Restore from File
              <input type="file" accept=".json" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => { importData(ev.target?.result as string); };
                reader.readAsText(file);
                e.target.value = '';
              }} />
            </label>
          </div>
        </div>
      </section>

      {/* ── Modals ── */}

      {/* Drill modal */}
      <Modal isOpen={drillModalOpen} onClose={() => setDrillModalOpen(false)} title={drillForm.id ? 'Edit Drill' : 'Add New Drill'}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">Title</label>
            <input type="text" value={drillForm.title || ''} onChange={e => setDrillForm({ ...drillForm, title: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 focus:border-[#FF6321] focus:ring-1 focus:ring-[#FF6321] outline-none"
              placeholder="e.g. 50 Wall Balls" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">Description</label>
            <textarea value={drillForm.description || ''} onChange={e => setDrillForm({ ...drillForm, description: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none h-24"
              placeholder="Describe the movement..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Type</label>
              <select value={drillForm.type} onChange={e => setDrillForm({ ...drillForm, type: e.target.value as DrillType })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none">
                <option value="sport-specific">Sport Specific</option>
                <option value="conditioning">Conditioning</option>
                <option value="strength">Strength</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Reps / Goal</label>
              <input type="text" value={drillForm.reps || ''} onChange={e => setDrillForm({ ...drillForm, reps: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none"
                placeholder="25 reps" />
            </div>
          </div>
          {/* Sport selector only shown for sport-specific drills — S&C applies to all kids */}
          {drillForm.type === 'sport-specific' && (
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Sport</label>
              <div className="flex flex-wrap gap-2">
                {(['soccer', 'lacrosse', 'both'] as Sport[]).map(s => (
                  <button key={s} onClick={() => toggleDrillSport(s)}
                    className={cn('rounded-lg px-4 py-2 text-xs font-bold uppercase transition-all', drillForm.sports?.includes(s) ? 'bg-[#FF6321] text-white' : 'bg-slate-100 dark:bg-slate-800 text-[#9E9E9E]')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(drillForm.type === 'conditioning' || drillForm.type === 'strength') && (
            <p className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
              S&C drills are shown to all kids regardless of sport — no sport selection needed.
            </p>
          )}
          <button onClick={saveDrill} className="w-full rounded-2xl bg-black dark:bg-white dark:text-black py-4 font-black text-white active:scale-95 transition-transform">
            {drillForm.id ? 'Update Drill' : 'Save Drill'}
          </button>
        </div>
      </Modal>

      {/* Add Profile modal */}
      <Modal isOpen={addProfileOpen} onClose={() => setAddProfileOpen(false)} title="Add Kid Profile">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">Name</label>
            <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none focus:border-blue-500"
              placeholder="Child's name" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">Sport</label>
            <select value={profileForm.sport} onChange={e => setProfileForm({ ...profileForm, sport: e.target.value as Sport })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none">
              <option value="soccer">Soccer</option>
              <option value="lacrosse">Lacrosse</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Sport Drills / Day</label>
              <input type="number" min={0} value={profileForm.sportDrillsPerDay} onChange={e => setProfileForm({ ...profileForm, sportDrillsPerDay: parseInt(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">S&C Drills / Day</label>
              <input type="number" min={0} value={profileForm.conditioningDrillsPerDay} onChange={e => setProfileForm({ ...profileForm, conditioningDrillsPerDay: parseInt(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none" />
            </div>
          </div>
          <button onClick={saveProfile} className="w-full rounded-2xl bg-black dark:bg-white dark:text-black py-4 font-black text-white active:scale-95 transition-transform">
            Create Profile
          </button>
        </div>
      </Modal>

      {/* Edit Profile modal */}
      <Modal isOpen={editProfileOpen} onClose={() => { setEditProfileOpen(false); setEditingProfile(null); }} title="Edit Kid Profile">
        {editingProfile && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Name</label>
              <input type="text" value={editingProfile.name} onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Sport</label>
              <select value={editingProfile.sport} onChange={e => setEditingProfile({ ...editingProfile, sport: e.target.value as Sport })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none">
                <option value="soccer">Soccer</option>
                <option value="lacrosse">Lacrosse</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#9E9E9E]">Sport Drills / Day</label>
                <input type="number" min={0} value={editingProfile.sportDrillsPerDay ?? 3} onChange={e => setEditingProfile({ ...editingProfile, sportDrillsPerDay: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#9E9E9E]">S&C Drills / Day</label>
                <input type="number" min={0} value={editingProfile.conditioningDrillsPerDay ?? 1} onChange={e => setEditingProfile({ ...editingProfile, conditioningDrillsPerDay: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Profile Color</label>
              <div className="flex gap-2 flex-wrap">
                {PROFILE_COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setEditingProfile({ ...editingProfile, color: c.id })}
                    style={{ backgroundColor: c.hex }}
                    className={cn(
                      'h-8 w-8 rounded-full transition-all',
                      editingProfile.color === c.id ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'opacity-70 hover:opacity-100'
                    )}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <button onClick={resetKidPin} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-3 text-xs font-bold text-red-600 hover:bg-red-100 transition-all">
              <RotateCcw size={14} />Reset Kid PIN
            </button>
            <button onClick={saveEditProfile} className="w-full rounded-2xl bg-black dark:bg-white dark:text-black py-4 font-black text-white active:scale-95 transition-transform">
              Save Changes
            </button>
          </div>
        )}
      </Modal>

      {/* Create Goal modal */}
      <Modal isOpen={createGoalOpen} onClose={() => setCreateGoalOpen(false)} title="Start New Quest">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Who for?</label>
              <select value={goalForm.profileId || ''} onChange={e => { const v = e.target.value; setGoalForm({ ...goalForm, profileId: v, isTeam: v === 'team' }); }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none">
                <option value="" disabled>Select...</option>
                <option value="team">Shared Team Goal 👨‍👩‍👧‍👦</option>
                {kidProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Goal Type</label>
              <select value={goalForm.type} onChange={e => setGoalForm({ ...goalForm, type: e.target.value as GoalType })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none">
                <option value="total_drills">Total Drills</option>
                <option value="streak">Streak (Days)</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">Quest Title</label>
            <input type="text" value={goalForm.title || ''} onChange={e => setGoalForm({ ...goalForm, title: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 focus:border-[#FF6321] outline-none"
              placeholder="e.g. Summer Soccer Journey" />
          </div>
          <MilestoneEditor milestones={goalForm.milestones || []} type={goalForm.type || 'total_drills'} onChange={ms => setGoalForm({ ...goalForm, milestones: ms })} />
          <button onClick={saveNewGoal} disabled={!goalForm.profileId || !goalForm.title || !goalForm.milestones?.length}
            className="w-full rounded-2xl bg-[#FF6321] py-4 font-black text-white active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shadow-lg">
            Launch Quest
          </button>
        </div>
      </Modal>

      {/* Edit Goal modal */}
      <Modal isOpen={editGoalOpen} onClose={() => { setEditGoalOpen(false); setEditingGoal(null); }} title="Edit Quest">
        {editingGoal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#9E9E9E]">Quest Title</label>
                <input type="text" value={editingGoal.title} onChange={e => setEditingGoal({ ...editingGoal, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#9E9E9E]">Goal Type</label>
                <select value={editingGoal.type} onChange={e => setEditingGoal({ ...editingGoal, type: e.target.value as GoalType })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none">
                  <option value="total_drills">Total Drills</option>
                  <option value="streak">Streak (Days)</option>
                </select>
              </div>
            </div>
            <MilestoneEditor milestones={editingGoal.milestones} type={editingGoal.type} onChange={ms => setEditingGoal({ ...editingGoal, milestones: ms })} />
            <button onClick={saveEditGoal} className="w-full rounded-2xl bg-black dark:bg-white dark:text-black py-4 font-black text-white active:scale-95 transition-transform">
              Save Changes
            </button>
          </div>
        )}
      </Modal>

      {/* AI Drill Generation modal */}
      <Modal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} title="Generate Drills with AI">
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate new drills and add them directly to the library. Kids will see them in their daily rotation.
          </p>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">Sport / Category</label>
            <div className="grid grid-cols-3 gap-2">
              {(['soccer', 'lacrosse', 'conditioning'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setAiSport(s)}
                  className={cn(
                    'rounded-xl py-2.5 text-xs font-black uppercase transition-all capitalize',
                    aiSport === s ? 'bg-[#FF6321] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  )}
                >
                  {s === 'conditioning' ? 'Strength' : s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">How many drills?</label>
            <div className="flex gap-2">
              {[5, 10, 15].map(n => (
                <button
                  key={n}
                  onClick={() => setAiCount(n)}
                  className={cn(
                    'flex-1 rounded-xl py-2.5 text-sm font-black transition-all',
                    aiCount === n ? 'bg-[#FF6321] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleAiGenerate}
            disabled={aiGenerating}
            className="w-full rounded-2xl bg-slate-900 dark:bg-white dark:text-black py-4 font-black text-white active:scale-95 disabled:opacity-50 disabled:cursor-wait transition-all"
          >
            {aiGenerating ? 'Generating…' : `Generate ${aiCount} Drills`}
          </button>
        </div>
      </Modal>

      {/* Backup & Restore modal */}
      <Modal isOpen={backupModalOpen} onClose={() => setBackupModalOpen(false)} title="Backup & Restore">
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Export a backup of all profiles, drills, goals, and history. Import it on any device to restore.
          </p>
          <button
            onClick={exportData}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#FF6321] py-4 font-black text-white active:scale-95 transition-transform shadow-lg"
          >
            <Download size={18} />
            Download Backup
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800" /></div>
            <div className="relative flex justify-center"><span className="bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-400 uppercase">or restore</span></div>
          </div>
          <label className={cn(
            'flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-4 font-black transition-all',
            restoring
              ? 'border-slate-200 dark:border-slate-800 text-slate-300 cursor-wait'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-[#FF6321] hover:text-[#FF6321]'
          )}>
            <Upload size={18} />
            {restoring ? 'Restoring…' : 'Choose Backup File'}
            <input
              type="file" accept=".json" className="hidden"
              disabled={restoring}
              onChange={e => { setRestoring(true); handleRestore(e); }}
            />
          </label>
          <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 font-medium">
            Restoring will replace all current data
          </p>
        </div>
      </Modal>

      {/* Change PIN modal */}
      <Modal isOpen={pinModalOpen} onClose={() => { setPinModalOpen(false); setNewPin(''); setConfirmPin(''); }} title="Change Parent PIN">
        <div className="space-y-4">
          <p className="text-sm text-[#9E9E9E] text-center">Current PIN: {adminPin.replace(/./g, '•')}</p>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">New PIN (4 digits)</label>
            <input type="password" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value)}
              className="w-full text-center text-3xl font-black tracking-[1em] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 p-4 outline-none focus:border-[#FF6321]"
              autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">Confirm PIN</label>
            <input type="password" maxLength={4} value={confirmPin} onChange={e => setConfirmPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChangePin()}
              className="w-full text-center text-3xl font-black tracking-[1em] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 p-4 outline-none focus:border-[#FF6321]" />
          </div>
          <button onClick={handleChangePin} className="w-full rounded-2xl bg-black dark:bg-white dark:text-black py-4 font-black text-white active:scale-95 transition-transform">
            Update PIN
          </button>
        </div>
      </Modal>

      <datalist id="reward-suggestions">
        {PREDEFINED_REWARDS.map(r => <option key={r} value={r} />)}
      </datalist>
    </motion.div>
  );
}

function formatAdminTime(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const DIFF_LABEL: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

function DrillInsights({ ratings, drills, profileId }: { ratings: DrillRating[]; drills: Drill[]; profileId: string }) {
  const [open, setOpen] = useState(false);
  const profileRatings = ratings.filter(r => r.profileId === profileId);

  if (!profileRatings.length) return null;

  // Aggregate per drill
  const byDrill = profileRatings.reduce<Record<string, { liked: number; disliked: number; totalDiff: number; count: number }>>((acc, r) => {
    if (!acc[r.drillId]) acc[r.drillId] = { liked: 0, disliked: 0, totalDiff: 0, count: 0 };
    acc[r.drillId].liked    += r.liked ? 1 : 0;
    acc[r.drillId].disliked += r.liked ? 0 : 1;
    acc[r.drillId].totalDiff += r.difficulty;
    acc[r.drillId].count    += 1;
    return acc;
  }, {});

  const rows = Object.entries(byDrill)
    .map(([drillId, stats]) => ({
      drill: drills.find(d => d.id === drillId),
      ...stats,
      net: stats.liked - stats.disliked,
      avgDiff: stats.totalDiff / stats.count,
    }))
    .filter(r => r.drill)
    .sort((a, b) => b.net - a.net);

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Drill Insights · {profileRatings.length} rating{profileRatings.length !== 1 ? 's' : ''}
        </p>
        <ChevronDown size={14} className={cn('text-slate-300 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-50 dark:border-slate-800 overflow-hidden"
          >
            <div className="p-3 space-y-1.5 max-h-64 overflow-y-auto">
              {rows.map(({ drill, liked, disliked, avgDiff, net }) => (
                <div key={drill!.id} className="flex items-center gap-2 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold dark:text-slate-200 truncate">{drill!.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-black">
                    <span className="text-green-500">👍 {liked}</span>
                    <span className="text-red-400">👎 {disliked}</span>
                    <span className={cn(
                      'rounded-md px-1.5 py-0.5',
                      avgDiff >= 2.5 ? 'bg-red-100 dark:bg-red-950/30 text-red-500' :
                      avgDiff >= 1.5 ? 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-600' :
                      'bg-green-100 dark:bg-green-950/30 text-green-600'
                    )}>
                      {DIFF_LABEL[Math.round(avgDiff)]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MilestoneEditor({ milestones, type, onChange }: { milestones: Milestone[]; type: GoalType; onChange: (ms: Milestone[]) => void }) {
  function updateMilestone(idx: number, field: keyof Milestone, value: string | number) {
    const next = [...milestones];
    next[idx] = { ...next[idx], [field]: value };
    onChange(next);
  }

  function removeMilestone(idx: number) {
    onChange(milestones.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <label className="text-xs font-bold uppercase text-[#9E9E9E]">Milestones</label>
      <div className="space-y-2">
        {milestones.map((m, idx) => (
          <div key={m.id} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
            <div className="relative">
              <input type="number" value={m.target} onChange={e => updateMilestone(idx, 'target', parseInt(e.target.value) || 0)}
                className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 p-1.5 text-xs text-center pr-5 outline-none" />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400 pointer-events-none uppercase">
                {type === 'streak' ? 'd' : 'dr'}
              </span>
            </div>
            <input type="text" value={m.reward} onChange={e => updateMilestone(idx, 'reward', e.target.value)}
              list="reward-suggestions" placeholder="Reward"
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 p-1.5 text-xs outline-none" />
            <button onClick={() => removeMilestone(idx)} className="text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded font-bold transition-colors">×</button>
          </div>
        ))}
        <button onClick={() => onChange([...milestones, newMilestone()])}
          className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-400 uppercase hover:border-slate-300 hover:text-slate-500 transition-all">
          + Add Milestone
        </button>
      </div>
    </div>
  );
}
