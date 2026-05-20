import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Moon, Sun, Plus, Users, Trophy, Medal, Dumbbell, ChevronDown, RotateCcw, Lock, Download, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { Profile, Drill, Goal, DailyLog, Sport, DrillType, GoalType, Milestone } from '../types';
import { cn } from '../lib/cn';
import { calculateStreak as calcStreak } from '../lib/utils';
import { PREDEFINED_REWARDS } from '../constants';
import Modal from '../components/Modal';
import AdminDrillCard from '../components/AdminDrillCard';
import RadialProgress from '../components/RadialProgress';

interface Props {
  profiles: Profile[];
  drills: Drill[];
  goals: Goal[];
  history: DailyLog[];
  theme: 'light' | 'dark';
  adminPin: string;
  toggleTheme: () => void;
  showNotification: (msg: string) => void;
  addProfile: (data: { name: string; sport: Sport; drillsPerDay: number }) => void;
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

export default function AdminView({ profiles, drills, goals, history, theme, adminPin, toggleTheme, showNotification, addProfile, updateProfile, addDrill, updateDrill, deleteDrill, addGoal, updateGoal, deleteGoal, changeAdminPin, exportData, importData, onBack }: Props) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['soccer', 'lacrosse']);

  // Drill modal
  const [drillModalOpen, setDrillModalOpen] = useState(false);
  const [drillForm, setDrillForm] = useState<Partial<Drill>>({ sports: [], type: 'sport-specific' });

  // Profile modals
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<{ name: string; sport: Sport; drillsPerDay: number }>({ name: '', sport: 'soccer', drillsPerDay: 3 });
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
    setProfileForm({ name: '', sport: 'soccer', drillsPerDay: 3 });
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

  function getCategoryDrills(catId: string) {
    if (catId === 'conditioning') return drills.filter(d => d.type === 'conditioning' || d.type === 'strength');
    return drills.filter(d => d.sports.includes(catId as Sport));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen p-6 pb-12"
    >
      <header className="mb-8 flex items-center justify-between">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm">
            {theme === 'light' ? <Moon size={20} className="text-slate-600" /> : <Sun size={20} className="text-yellow-400" />}
          </button>
          <button onClick={() => setBackupModalOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm" title="Backup & Restore">
            <Download size={18} className="text-slate-500" />
          </button>
          <button onClick={() => setPinModalOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm" title="Change PIN">
            <Lock size={18} className="text-slate-500" />
          </button>
          <h2 className="text-2xl font-black dark:text-slate-100">Admin</h2>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kid Profiles */}
        <section className="space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Kid Profiles</h3>
            <div className="flex gap-2">
              <button
                onClick={() => openCreateGoal(true)}
                className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-bold text-[#FF6321] uppercase transition-all hover:bg-orange-100"
              >
                <Users size={12} />+ Team Goal
              </button>
              <button onClick={() => setAddProfileOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white active:scale-90">
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div className="grid gap-3">
            {kidProfiles.map(p => {
              const streak = calcStreak(p.id, history, profiles);
              return (
                <div key={p.id} className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm">
                  <div>
                    <p className="font-bold dark:text-slate-100">{p.name}</p>
                    <p className="text-xs text-[#9E9E9E] dark:text-slate-500 uppercase font-bold tracking-tight">
                      {p.sport} • {p.drillsPerDay}/day {streak > 0 && `• 🔥 ${streak} streak`}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditingProfile(p); setEditProfileOpen(true); }}
                    className="text-sm font-bold text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Today's Activity */}
        <section className="space-y-4 lg:col-span-1">
          <h3 className="text-lg font-bold flex items-center gap-2">
            Today's Activity
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF6321] text-[10px] text-white font-black">
              {todayActivity.length}
            </span>
          </h3>
          <div className="grid gap-3">
            {todayActivity.map(log => {
              const profile = profiles.find(p => p.id === log.profileId);
              return (
                <div key={log.id} className="rounded-2xl border-l-4 border-l-green-500 bg-white dark:bg-slate-900 p-4 shadow-sm">
                  <p className="text-sm font-bold dark:text-slate-100">{profile?.name} — {log.completedDrillIds.length} drills done</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {log.completedDrillIds.map(id => {
                      const d = drills.find(x => x.id === id);
                      return d ? <span key={id} className="text-[9px] font-bold bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">{d.title}</span> : null;
                    })}
                  </div>
                </div>
              );
            })}
            {todayActivity.length === 0 && <p className="text-sm text-slate-400 italic">No activity yet today.</p>}
          </div>
        </section>

        {/* Drill Library */}
        <section className="space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold dark:text-slate-100">Drill Library</h3>
            <button onClick={openAddDrill} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6321] text-white active:scale-90 shadow-md">
              <Plus size={16} />
            </button>
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

        {/* Active Quests */}
        <section className="space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Active Quests</h3>
            <button onClick={() => openCreateGoal(false)} className="flex items-center gap-2 rounded-full bg-[#FF6321] px-4 py-2 text-sm font-bold text-white shadow-lg active:scale-95">
              <Plus size={16} /><span>New Quest</span>
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {goals.map(g => {
              const profile = profiles.find(p => p.id === g.profileId);
              const maxTarget = g.milestones.length > 0 ? Math.max(...g.milestones.map(m => m.target)) : 100;
              const pct = Math.min(100, (g.currentValue / maxTarget) * 100);
              return (
                <div key={g.id} className={cn('rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm border transition-all relative overflow-hidden', g.isTeam ? 'border-orange-200 dark:border-orange-950/30' : 'border-transparent')}>
                  {g.isTeam && (
                    <div className="absolute top-0 right-0 bg-[#FF6321] text-white px-3 py-1 rounded-bl-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                      <Users size={10} />Team Goal
                    </div>
                  )}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#9E9E9E] dark:text-slate-500 uppercase tracking-wider truncate">
                        {g.isTeam ? 'Entire Team' : profile?.name} • {g.type.replace('_', ' ')}
                      </p>
                      <h4 className="font-black text-[#FF6321] text-lg truncate">{g.title}</h4>
                    </div>
                    <RadialProgress progress={pct} size={56} strokeWidth={6} />
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Progress</span>
                      <span className="text-[10px] font-black text-[#FF6321]">{g.currentValue} / {maxTarget}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className={cn('h-full rounded-full', g.isTeam ? 'bg-orange-500' : 'bg-blue-500')} />
                    </div>
                  </div>
                  <div className="mb-4 space-y-1">
                    {g.milestones.sort((a, b) => a.target - b.target).slice(0, 3).map(m => (
                      <div key={m.id} className="flex items-center justify-between text-[10px]">
                        <span className={m.isAchieved ? 'text-green-600 dark:text-green-500 font-bold' : 'text-slate-400'}>{m.reward}</span>
                        <span className="text-slate-300 dark:text-slate-700 font-mono font-bold">{m.target}</span>
                      </div>
                    ))}
                    {g.milestones.length > 3 && <p className="text-[9px] text-slate-300 text-center font-bold">+{g.milestones.length - 3} more</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingGoal(g); setEditGoalOpen(true); }} className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 py-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 uppercase tracking-widest transition-all">
                      Edit
                    </button>
                    <button onClick={() => { if (confirm('Delete this quest?')) deleteGoal(g.id); }} className="rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2 text-[10px] font-bold text-slate-300 hover:text-red-400 hover:border-red-100 transition-all">
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {goals.length === 0 && (
              <div className="col-span-full py-12 text-center rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                <p className="text-slate-400">No active quests. Create one to motivate the kids!</p>
              </div>
            )}
          </div>
        </section>
      </div>

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
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">Sports</label>
            <div className="flex flex-wrap gap-2">
              {(['soccer', 'lacrosse', 'both'] as Sport[]).map(s => (
                <button key={s} onClick={() => toggleDrillSport(s)}
                  className={cn('rounded-lg px-4 py-2 text-xs font-bold uppercase transition-all', drillForm.sports?.includes(s) ? 'bg-[#FF6321] text-white' : 'bg-slate-100 dark:bg-slate-800 text-[#9E9E9E]')}>
                  {s}
                </button>
              ))}
            </div>
          </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Sport</label>
              <select value={profileForm.sport} onChange={e => setProfileForm({ ...profileForm, sport: e.target.value as Sport })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none">
                <option value="soccer">Soccer</option>
                <option value="lacrosse">Lacrosse</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Drills / Day</label>
              <input type="number" value={profileForm.drillsPerDay} onChange={e => setProfileForm({ ...profileForm, drillsPerDay: parseInt(e.target.value) || 1 })}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#9E9E9E]">Sport</label>
                <select value={editingProfile.sport} onChange={e => setEditingProfile({ ...editingProfile, sport: e.target.value as Sport })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none">
                  <option value="soccer">Soccer</option>
                  <option value="lacrosse">Lacrosse</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#9E9E9E]">Drills / Day</label>
                <input type="number" value={editingProfile.drillsPerDay} onChange={e => setEditingProfile({ ...editingProfile, drillsPerDay: parseInt(e.target.value) || 1 })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-100 p-3 outline-none" />
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
