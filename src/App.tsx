import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Settings, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  ArrowLeft,
  Flame,
  Plus,
  Users,
  Dumbbell,
  Timer,
  Info,
  ChevronDown,
  Moon,
  Sun,
  RotateCcw,
  Medal,
  Award,
  Crown
} from 'lucide-react';
import { Profile, Drill, Goal, DailyLog, Sport, DrillType, GoalType } from './types';
import { INITIAL_DRILLS } from './constants';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Modal from './components/Modal';
import AdminDrillCard from './components/AdminDrillCard';

import confetti from 'canvas-confetti';

const PREDEFINED_REWARDS = [
  'Ice Cream Trip',
  'New Soccer Ball',
  'New Cleats',
  'Movie Night',
  'Video Game Time',
  'New Lacrosse Stick',
  'Dinner of Choice',
  'Stay Up Late (30 min)',
  'New Practice Shirt',
  'Water Bottle',
  'Trip to the Park',
  'Bowling Night'
];

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function RadialProgress({ progress, size = 80, strokeWidth = 8, color = "text-[#FF6321]" }: { progress: number, size?: number, strokeWidth?: number, color?: string }) {
  const safeProgress = isNaN(progress) || !isFinite(progress) ? 0 : progress;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (safeProgress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={color}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-black">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

export default function App() {
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('profiles');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Parent', role: 'admin', sport: 'none', drillsPerDay: 0 },
      { id: '2', name: 'Kid 1', role: 'kid', sport: 'soccer', drillsPerDay: 3 },
      { id: '3', name: 'Kid 2', role: 'kid', sport: 'lacrosse', drillsPerDay: 3 },
    ];
  });

  const [drills, setDrills] = useState<Drill[]>(() => {
    const saved = localStorage.getItem('drills');
    if (saved) {
      const parsed: Drill[] = JSON.parse(saved);
      // Merge: Keep saved state but add any new drills from INITIAL_DRILLS that aren't there yet
      const merged = [...parsed];
      INITIAL_DRILLS.forEach(initial => {
        if (!merged.some(m => m.id === initial.id)) {
          merged.push(initial);
        }
      });
      return merged;
    }
    return INITIAL_DRILLS;
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('goals');
    let currentGoals: Goal[] = [];
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration: if it's the old format, convert it
      if (parsed.length > 0 && parsed[0].targetDrills) {
        currentGoals = parsed.map((old: any) => ({
          id: old.id,
          profileId: old.profileId,
          title: old.reward,
          type: 'total_drills',
          currentValue: old.completedDrills,
          milestones: [
            { id: 'm1', target: old.targetDrills, reward: old.reward, isAchieved: old.isAchieved }
          ]
        }));
      } else {
        currentGoals = parsed;
      }
    } else {
      currentGoals = [
        { 
          id: 'g1', 
          profileId: '2', 
          title: 'Soccer Master Journey', 
          type: 'total_drills',
          currentValue: 15,
          milestones: [
            { id: 'm1', target: 25, reward: 'New Soccer Ball', isAchieved: false },
            { id: 'm2', target: 50, reward: 'Soccer Cleats', isAchieved: false },
            { id: 'm3', target: 100, reward: 'Full Uniform', isAchieved: false }
          ]
        },
        { 
          id: 'g2', 
          profileId: '3', 
          title: 'Lacrosse Pro Streak', 
          type: 'streak',
          currentValue: 5,
          milestones: [
            { id: 'm1', target: 7, reward: 'Ice Cream', isAchieved: false },
            { id: 'm2', target: 15, reward: 'New Stick', isAchieved: false },
            { id: 'm3', target: 30, reward: 'Pro Gloves', isAchieved: false }
          ]
        }
      ];
    }

    // Force add a team goal if none exists (Feature discovery migration)
    if (!currentGoals.some(g => g.isTeam)) {
      currentGoals.push({
        id: 'team-' + Math.random().toString(36).substr(2, 9),
        profileId: 'team',
        title: 'Team Pizza & Movie Night!',
        type: 'total_drills',
        currentValue: 0,
        isTeam: true,
        milestones: [
          { id: 'tm1', target: 20, reward: 'Pizza Party', isAchieved: false },
          { id: 'tm2', target: 50, reward: 'Movie Night', isAchieved: false },
          { id: 'tm3', target: 150, reward: 'Theme Park Trip', isAchieved: false }
        ]
      });
    }
    
    return currentGoals;
  });

  const [dailyCompleted, setDailyCompleted] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('dailyCompleted');
    return saved ? JSON.parse(saved) : {};
  });

  const [history, setHistory] = useState<DailyLog[]>(() => {
    const saved = localStorage.getItem('history');
    return saved ? JSON.parse(saved) : [];
  });

  const [view, setView] = useState<'selection' | 'dashboard' | 'admin'>('selection');
  const [dashboardTab, setDashboardTab] = useState<'today' | 'history'>('today');
  
  // Modal states
  const [isDrillModalOpen, setIsDrillModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isKidLoginOpen, setIsKidLoginOpen] = useState(false);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isCreateGoalModalOpen, setIsCreateGoalModalOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['soccer', 'lacrosse']);
  
  const [newDrill, setNewDrill] = useState<Partial<Drill>>({ sports: [], type: 'sport-specific' });
  const [newProfile, setNewProfile] = useState<Partial<Profile>>({ role: 'kid', sport: 'soccer', drillsPerDay: 3 });
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({ type: 'total_drills', milestones: [] });
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [adminPin, setAdminPin] = useState('');
  const [kidPin, setKidPin] = useState('');
  const [tempPin, setTempPin] = useState('');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Persistence effects
  useEffect(() => { localStorage.setItem('profiles', JSON.stringify(profiles)); }, [profiles]);
  useEffect(() => { localStorage.setItem('theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('drills', JSON.stringify(drills)); }, [drills]);
  useEffect(() => { localStorage.setItem('goals', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('dailyCompleted', JSON.stringify(dailyCompleted)); }, [dailyCompleted]);
  useEffect(() => { localStorage.setItem('history', JSON.stringify(history)); }, [history]);

  // Clear notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const selectProfile = (profile: Profile) => {
    setActiveProfile(profile);
    if (profile.role === 'admin') {
      setIsAdminLoginOpen(true);
    } else {
      if (!profile.pin) {
        setIsSettingPin(true);
        setIsKidLoginOpen(true);
      } else {
        setIsSettingPin(false);
        setIsKidLoginOpen(true);
      }
    }
  };

  const handleKidLogin = () => {
    if (isSettingPin) {
      if (tempPin.length === 4) {
        setProfiles(prev => prev.map(p => p.id === activeProfile?.id ? { ...p, pin: tempPin } : p));
        setNotification('PIN Created! Welcome 🚀');
        setView('dashboard');
        setIsKidLoginOpen(false);
        setTempPin('');
      } else {
        setNotification('Enter 4 digits!');
      }
    } else {
      if (kidPin === activeProfile?.pin) {
        setView('dashboard');
        setIsKidLoginOpen(false);
        setKidPin('');
      } else {
        setNotification('Wrong PIN! Try again.');
        setKidPin('');
      }
    }
  };

  const handleAdminLogin = () => {
    if (adminPin === '1234') {
      setView('admin');
      setIsAdminLoginOpen(false);
      setAdminPin('');
    } else {
      setNotification('Incorrect PIN!');
    }
  };

  // Sync streaks for goals
  useEffect(() => {
    setGoals(prev => prev.map(g => {
      if (g.type === 'streak') {
        const streak = calculateStreak(g.profileId);
        if (g.currentValue !== streak) {
          const newMilestones = g.milestones.map(m => ({
            ...m,
            isAchieved: streak >= m.target
          }));
          return { ...g, currentValue: streak, milestones: newMilestones };
        }
      }
      return g;
    }));
  }, [history]);

  const activeQuests = goals.filter(g => g.profileId === activeProfile?.id || g.isTeam);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const getXPForLevel = (level: number) => level * 100;
  
  const calculateLevelData = (xp: number = 0) => {
    let level = 1;
    let remainingXP = xp;
    while (remainingXP >= getXPForLevel(level)) {
      remainingXP -= getXPForLevel(level);
      level++;
    }
    return { level, currentXP: remainingXP, xpToNext: getXPForLevel(level) };
  };

  const BADGES = [
    { id: 'rookie', title: 'Rookie', description: 'First drill ever!', icon: <CheckCircle2 size={16} />, color: 'bg-green-100 text-green-700' },
    { id: 'week-streak', title: 'Week Warrior', description: '7-day practice streak', icon: <Flame size={16} />, color: 'bg-orange-100 text-orange-700' },
    { id: 'month-streak', title: 'Consistent', description: '30-day practice streak', icon: <Crown size={16} />, color: 'bg-purple-100 text-purple-700' },
    { id: 'century', title: '100 Club', description: '100 drills total', icon: <Trophy size={16} />, color: 'bg-yellow-100 text-yellow-700' },
    { id: 'quest-master', title: 'Quest Master', description: 'Finished a full quest', icon: <Medal size={16} />, color: 'bg-blue-100 text-blue-700' },
  ];

  const checkBadges = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;

    const streak = calculateStreak(profileId);
    const totalDrills = goals.filter(g => g.profileId === profileId && g.type === 'total_drills').reduce((acc, g) => acc + g.currentValue, 0);
    const questComplete = goals.find(g => g.profileId === profileId && g.milestones.every(m => m.isAchieved));
    
    const newBadges: string[] = [...(profile.badges || [])];
    
    if (totalDrills >= 1 && !newBadges.includes('rookie')) newBadges.push('rookie');
    if (streak >= 7 && !newBadges.includes('week-streak')) newBadges.push('week-streak');
    if (streak >= 30 && !newBadges.includes('month-streak')) newBadges.push('month-streak');
    if (totalDrills >= 100 && !newBadges.includes('century')) newBadges.push('century');
    if (questComplete && !newBadges.includes('quest-master')) newBadges.push('quest-master');

    if (newBadges.length > (profile.badges || []).length) {
      const added = newBadges.filter(b => !(profile.badges || []).includes(b));
      const badgeObj = BADGES.find(b => b.id === added[0]);
      if (badgeObj) {
        setNotification(`NEW BADGE: ${badgeObj.title}! 🎖️`);
        triggerConfetti();
      }
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, badges: newBadges } : p));
    }
  };

  const toggleDrill = (drillId: string) => {
    if (!activeProfile) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const key = `${activeProfile.id}-${drillId}`;

    setDailyCompleted(prev => {
      const isDone = !prev[key];
      
      // Update Goals
      let milestoneReached = false;
      setGoals(prevGoals => prevGoals.map(g => {
        const appliesToProfile = g.profileId === activeProfile.id || g.isTeam;
        if (!appliesToProfile || g.type !== 'total_drills') return g;
        
        const newValue = isDone ? g.currentValue + 1 : Math.max(0, g.currentValue - 1);
        const newMilestones = g.milestones.map(m => {
          const reached = newValue >= m.target;
          if (reached && !m.isAchieved && isDone) milestoneReached = true;
          return {
            ...m,
            isAchieved: reached
          };
        });

        return { ...g, currentValue: newValue, milestones: newMilestones };
      }));

      if (milestoneReached) {
        triggerConfetti();
        setNotification("NEW MILESTONE REACHED! 🏆");
      }

      // Update XP
      if (isDone) {
        setProfiles(prev => prev.map(p => {
          if (p.id === activeProfile.id) {
            const currentXP = p.xp || 0;
            const newXP = currentXP + 25;
            const oldLevel = calculateLevelData(currentXP).level;
            const newLevel = calculateLevelData(newXP).level;
            
            if (newLevel > oldLevel) {
              setNotification(`LEVEL UP! You are now Level ${newLevel}! ⚡️`);
              triggerConfetti();
            }
            
            return { ...p, xp: newXP, level: newLevel };
          }
          return p;
        }));
        setTimeout(() => checkBadges(activeProfile.id), 100);
      }

      // Update History
      setHistory(prevHistory => {
        const existingIndex = prevHistory.findIndex(h => h.profileId === activeProfile.id && h.date === today);
        if (existingIndex > -1) {
          const newHistory = [...prevHistory];
          const log = { ...newHistory[existingIndex] };
          if (isDone) {
            log.completedDrillIds = [...new Set([...log.completedDrillIds, drillId])];
          } else {
            log.completedDrillIds = log.completedDrillIds.filter(id => id !== drillId);
          }
          newHistory[existingIndex] = log;
          return newHistory;
        } else {
          return [...prevHistory, {
            id: Math.random().toString(36).substr(2, 9),
            profileId: activeProfile.id,
            date: today,
            drillIds: [], 
            completedDrillIds: isDone ? [drillId] : [],
            isDone: false
          }];
        }
      });

      return { ...prev, [key]: isDone };
    });
  };

  const addDrill = () => {
    if (newDrill.title && newDrill.reps) {
      if (newDrill.id) {
        // Update existing
        setDrills(prev => prev.map(d => d.id === newDrill.id ? {
          ...d,
          title: newDrill.title!,
          description: newDrill.description || '',
          sports: (newDrill.sports?.length ? newDrill.sports : ['both']) as Sport[],
          type: newDrill.type as DrillType,
          reps: newDrill.reps!
        } : d));
        setNotification('Drill updated!');
      } else {
        // Add new
        const drill: Drill = {
          id: Math.random().toString(36).substr(2, 9),
          title: newDrill.title,
          description: newDrill.description || '',
          sports: (newDrill.sports?.length ? newDrill.sports : ['both']) as Sport[],
          type: newDrill.type as DrillType,
          reps: newDrill.reps
        };
        setDrills(prev => [...prev, drill]);
        setNotification('Drill added to library!');
      }
      setIsDrillModalOpen(false);
      setNewDrill({ sports: [], type: 'sport-specific' });
    }
  };

  const addProfile = () => {
    if (newProfile.name) {
      const profile: Profile = {
        id: Math.random().toString(36).substr(2, 9),
        name: newProfile.name,
        role: 'kid',
        sport: newProfile.sport as Sport,
        drillsPerDay: newProfile.drillsPerDay || 3
      };
      setProfiles(prev => [...prev, profile]);
      setIsProfileModalOpen(false);
      setNewProfile({ role: 'kid', sport: 'soccer', drillsPerDay: 3 });
      setNotification(`Profile for ${profile.name} created!`);
    }
  };

  const addGoal = () => {
    if (newGoal.profileId && newGoal.title && newGoal.milestones && newGoal.milestones.length > 0) {
      const goal: Goal = {
        id: Math.random().toString(36).substr(2, 9),
        profileId: newGoal.profileId,
        title: newGoal.title,
        type: newGoal.type || 'total_drills',
        milestones: newGoal.milestones.sort((a,b) => a.target - b.target),
        currentValue: 0,
        isTeam: newGoal.isTeam
      };
      setGoals(prev => [...prev, goal]);
      setIsCreateGoalModalOpen(false);
      setNewGoal({ type: 'total_drills', milestones: [] });
      setNotification(`Quest for ${newGoal.title} started! 🚀`);
    } else {
      setNotification('Add at least one milestone!');
    }
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    setNotification('Quest deleted.');
  };

  const calculateStreak = (profileId: string) => {
    const logs = history
      .filter(h => h.profileId === profileId)
      .sort((a, b) => b.date.localeCompare(a.date));
    
    if (logs.length === 0) return 0;

    let streak = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
    
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return 0;

    let checkDate = logs[0].date === today ? today : logs[0].date === yesterday ? yesterday : null;
    if (!checkDate) return 0;

    let currentCheckIdx = logs[0].date === today ? 0 : 0; 
    // Simple streak: just count backwards from the most recent day if it's today or yesterday
    // and they hit their goal
    
    for (let i = 0; i < logs.length; i++) {
      if (logs[i].completedDrillIds.length >= profile.drillsPerDay) {
        streak++;
      } else {
        if (i === 0 && logs[i].date === today) continue; // Allow today to not be finished yet
        break;
      }
    }
    return streak;
  };

  const sendNotification = () => {
    setNotification('Nudge sent! ⚽️🥍');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  return (
    <div className={cn(
      "min-h-screen font-sans transition-colors duration-300",
      theme === 'dark' ? "bg-slate-950 text-slate-100 dark" : "bg-[#F5F5F5] text-[#1A1A1A] light"
    )}>
      <AnimatePresence mode="wait">
        {view === 'selection' && (
          <motion.div
            key="selection"
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
                  transition={{ type: "spring", stiffness: 200 }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#FF6321] text-white shadow-lg"
                >
                  <Trophy size={40} />
                </motion.div>
                <h1 className="mt-6 text-4xl font-black tracking-tight">SkillSpark</h1>
                <p className="text-[#9E9E9E]">Who is practicing today?</p>
              </div>

              <div className="grid gap-4">
                {profiles.map((p) => {
                  const goal = goals.find(g => g.profileId === p.id);
                  const streak = calculateStreak(p.id);
                  return (
                    <button
                      key={p.id}
                      id={`profile-${p.id}`}
                      onClick={() => selectProfile(p)}
                      className="flex w-full items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                    >
                      <div className="flex flex-1 items-center gap-4">
                        <div className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-full text-white shrink-0",
                          p.role === 'admin' ? "bg-slate-800 dark:bg-slate-700" : "bg-blue-500"
                        )}>
                          {p.role === 'admin' ? <Settings size={24} /> : <Users size={24} />}
                        </div>
                        <div className="text-left flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-black text-lg leading-tight dark:text-slate-100">{p.name}</p>
                            {p.role === 'kid' && (
                              <span className="rounded-md bg-yellow-100 dark:bg-yellow-950/30 px-1.5 py-0.5 text-[10px] font-black text-yellow-700 dark:text-yellow-500 uppercase">
                                LVL {calculateLevelData(p.xp || 0).level}
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
                              {goal && (
                                <div className="flex items-center gap-1.5 flex-1">
                                  <div className="h-1.5 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[80px]">
                                    <div 
                                      className="h-full bg-blue-500 rounded-full" 
                                      style={{ width: `${Math.min(100, goal.milestones.length > 0 ? (goal.currentValue / Math.max(...goal.milestones.map(m => m.target))) * 100 : 0)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                    {goal.milestones.length > 0 ? Math.round((goal.currentValue / Math.max(...goal.milestones.map(m => m.target))) * 100) : 0}% TO GOAL
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="text-slate-300 dark:text-slate-700 ml-4 shrink-0" />
                    </button>
                  );
                })}
              </div>

              {/* Shared Team Quests on Selection Screen (Bottom) */}
              {goals.filter(g => g.isTeam).length > 0 && (
                <div className="space-y-4 pt-4">
                  {goals.filter(g => g.isTeam).map(quest => {
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
                                <div 
                                  key={p.id} 
                                  className="h-9 w-9 rounded-full border-2 border-[#FF6321] bg-white flex items-center justify-center text-xs font-black text-[#FF6321] uppercase shadow-md transition-transform hover:-translate-y-1"
                                  title={p.name}
                                >
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

                          <div className="flex gap-2 items-center overflow-x-auto pb-1 no-scrollbar">
                            {quest.milestones.sort((a,b) => a.target - b.target).map(m => (
                              <div key={m.id} className={cn(
                                "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all",
                                m.isAchieved ? "bg-white text-[#FF6321]" : "bg-white/10 text-white border border-white/20"
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
        )}

        {view === 'dashboard' && activeProfile && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-screen p-6 pb-24"
          >
            <header className="mb-8 flex items-center justify-between">
              <button 
                onClick={() => setView('selection')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex gap-2 rounded-2xl bg-slate-100 dark:bg-slate-900 p-1 transition-all">
                <button 
                  onClick={() => setDashboardTab('today')}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-bold transition-all",
                    dashboardTab === 'today' ? "bg-white dark:bg-slate-800 text-black dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  Today
                </button>
                <button 
                  onClick={() => setDashboardTab('history')}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-bold transition-all",
                    dashboardTab === 'history' ? "bg-white dark:bg-slate-800 text-black dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  Log
                </button>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <p className="text-sm font-medium text-[#9E9E9E] uppercase tracking-wider">{format(new Date(), 'EEEE, MMM do')}</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black">{activeProfile.name}</h2>
                  <span className="rounded-lg bg-yellow-100 dark:bg-yellow-950/30 px-2 py-1 text-xs font-black text-yellow-700 dark:text-yellow-500">
                    LVL {calculateLevelData(activeProfile.xp || 0).level}
                  </span>
                </div>
                {(() => {
                  const { currentXP, xpToNext } = calculateLevelData(activeProfile.xp || 0);
                  return (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div 
                          className="h-full bg-yellow-400 transition-all duration-500" 
                          style={{ width: `${(currentXP / xpToNext) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">{currentXP}/{xpToNext} XP</span>
                    </div>
                  );
                })()}
              </div>
            </header>

            {dashboardTab === 'today' ? (
              <>
                {activeQuests.map(quest => {
                  const isStreak = quest.type === 'streak';
                  const themeColor = isStreak ? '#F97316' : '#3B82F6';
                  const themeBg = isStreak ? "bg-orange-50/50 dark:bg-orange-950/10" : "bg-blue-50/50 dark:bg-blue-950/10";
                  const themeBorder = isStreak ? "border-orange-500" : "border-blue-500";
                  const themeText = isStreak ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400";
                  const themeRadial = isStreak ? "text-orange-500" : "text-blue-500";

                  return (
                    <section 
                      key={quest.id} 
                      className={cn(
                        "mb-8 rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm overflow-hidden transition-all border-l-4",
                        themeBorder,
                        themeBg
                      )}
                    >
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                               <p className="text-xs font-bold uppercase tracking-widest text-[#9E9E9E]">
                                 {quest.isTeam ? 'Shared Team Quest' : 'Active Quest'}
                               </p>
                               {quest.isTeam && <Users size={12} className={cn("text-[#FF6321]", !isStreak && "text-blue-500")} />}
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{quest.title}</h3>
                          </div>
                          <div className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-2xl transition-all",
                            isStreak ? "bg-orange-100 dark:bg-orange-950/30 text-orange-600" : "bg-blue-100 dark:bg-blue-950/30 text-blue-600"
                          )}>
                            {isStreak ? <Flame size={24} /> : (quest.isTeam ? <Medal size={24} /> : <Trophy size={24} />)}
                          </div>
                        </div>

                        <div className="relative">
                          <div className="absolute top-1/2 left-0 h-1.5 w-full -translate-y-1/2 rounded-full bg-slate-100 dark:bg-slate-800" />
                          <div className="relative flex justify-between">
                            {quest.milestones.sort((a, b) => a.target - b.target).map((m, idx) => {
                              const isNext = !m.isAchieved && (idx === 0 || quest.milestones[idx - 1].isAchieved);
                              
                              return (
                                <div key={m.id} className="relative flex flex-col items-center">
                                  <div className={cn(
                                    "z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500",
                                    m.isAchieved ? "bg-green-500 text-white" : isNext ? (isStreak ? "bg-orange-500 text-white scale-110 shadow-lg" : "bg-blue-500 text-white scale-110 shadow-lg") : "bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-500"
                                  )}>
                                    {m.isAchieved ? <CheckCircle2 size={16} /> : <span className="text-[10px] font-black">{m.target}</span>}
                                  </div>
                                  <div className="mt-2 text-center">
                                    <p className={cn(
                                      "text-[10px] font-black uppercase tracking-wider transition-all", 
                                      m.isAchieved ? "text-green-600 dark:text-green-500" : isNext ? (isStreak ? "text-orange-600" : "text-blue-600") : "text-slate-400 dark:text-slate-600"
                                    )}>
                                      {m.reward}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        <div className={cn(
                          "flex items-center justify-between rounded-2xl p-4 transition-all",
                          isStreak ? "bg-orange-100/50 dark:bg-orange-900/10" : "bg-blue-100/50 dark:bg-blue-900/10"
                        )}>
                          <div className="flex items-center gap-3">
                            <RadialProgress 
                              progress={quest.milestones.length > 0 ? Math.min(100, (quest.currentValue / Math.max(...quest.milestones.map(m => m.target))) * 100) : 0} 
                              size={50} 
                              strokeWidth={6} 
                              color={themeRadial}
                            />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Overall Progress</p>
                              <p className="font-black text-slate-700 dark:text-slate-300">
                                 {quest.currentValue} {isStreak ? 'Day Streak' : 'Total Drills'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {(() => {
                              const next = quest.milestones.find(m => !m.isAchieved);
                              if (next) {
                                return (
                                  <>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Next Reward</p>
                                    <p className={cn("font-black", themeText)}>{next.target - quest.currentValue} more to go!</p>
                                  </>
                                );
                              }
                              return <p className="font-black text-green-500">Quest Complete! 🏆</p>;
                            })()}
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                })}

                {(activeProfile.badges && activeProfile.badges.length > 0) && (
                  <section className="mb-8">
                    <h3 className="mb-3 text-sm font-bold text-slate-400 uppercase tracking-widest">Badges Earned</h3>
                    <div className="flex flex-wrap gap-3">
                      {activeProfile.badges.map(badgeId => {
                        const badge = BADGES.find(b => b.id === badgeId);
                        if (!badge) return null;
                        return (
                          <motion.div 
                            key={badge.id}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileHover={{ y: -5 }}
                            className={cn(
                              "flex items-center gap-2 rounded-2xl px-4 py-2 shadow-sm transition-all cursor-default",
                              badge.color
                            )}
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

                <section className="space-y-4">
                  <h3 className="text-lg font-bold">Today's Drills</h3>
                  <div className="grid gap-4">
                    {drills.filter(d => activeProfile.sport === 'both' || d.sports.includes(activeProfile.sport) || d.sports.includes('both')).slice(0, activeProfile.drillsPerDay).map((drill) => {
                      const isDone = dailyCompleted[`${activeProfile.id}-${drill.id}`];
                      return (
                        <button 
                          key={drill.id}
                          onClick={() => toggleDrill(drill.id)}
                          className={cn(
                            "group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-5 text-left shadow-sm transition-all hover:shadow-md",
                            isDone && "opacity-60 bg-slate-50 dark:bg-slate-800"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                                  drill.type === 'sport-specific' ? "bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" :
                                  drill.type === 'conditioning' ? "bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400" : "bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400"
                                )}>
                                  {drill.type}
                                </span>
                              </div>
                              <h4 className={cn("text-lg font-bold dark:text-slate-100", isDone && "line-through opacity-50")}>{drill.title}</h4>
                              <p className="text-sm text-[#9E9E9E] dark:text-slate-400">{drill.description}</p>
                            </div>
                            <div className={cn(
                              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300",
                              isDone ? "bg-green-500 scale-110 text-white shadow-lg" : "bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
                            )}>
                              <CheckCircle2 size={28} />
                            </div>
                          </div>
                          <div className="mt-4 flex items-center gap-4 border-t border-slate-50 dark:border-slate-800 pt-3 text-sm font-bold text-slate-500">
                            <div className="flex items-center gap-1.5 text-[#FF6321]">
                              <Flame size={16} />
                              <span>{drill.reps}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </>
            ) : (
              <section className="space-y-4">
                <h3 className="text-lg font-bold">Past Activity</h3>
                <div className="grid gap-3">
                  {history
                    .filter(h => h.profileId === activeProfile.id)
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map(log => (
                      <div key={log.id} className="rounded-2xl bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="font-bold">{format(new Date(log.date), 'MMM do, yyyy')}</p>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                            {log.completedDrillIds.length} drills
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {log.completedDrillIds.map(id => {
                            const d = drills.find(drill => drill.id === id);
                            return d ? (
                              <span key={id} className="rounded-lg bg-green-50 px-2 py-1 text-[10px] font-bold text-green-600 border border-green-100">
                                {d.title}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    ))}
                  {history.filter(h => h.profileId === activeProfile.id).length === 0 && (
                    <div className="py-12 text-center text-slate-400">
                      <Timer size={48} className="mx-auto mb-4 opacity-20" />
                      <p>No drills logged yet. Start today!</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </motion.div>
        )}

        {view === 'admin' && activeProfile && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen p-6 pb-12"
          >
            <header className="mb-8 flex items-center justify-between">
              <button 
                onClick={() => setView('selection')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-4 transition-all">
                <button 
                  onClick={toggleTheme}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm transition-all"
                >
                  {theme === 'light' ? <Moon size={20} className="text-slate-600" /> : <Sun size={20} className="text-yellow-400" />}
                </button>
                <button 
                  onClick={sendNotification}
                  className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg active:scale-95 transition-all"
                >
                  <Timer size={16} />
                  <span>Nudge Kids</span>
                </button>
                <h2 className="text-2xl font-black dark:text-slate-100">Admin</h2>
              </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-3">
              <section className="space-y-4 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Kid Profiles</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setNewGoal({ isTeam: true, profileId: 'team' });
                        setIsCreateGoalModalOpen(true);
                      }}
                      className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-bold text-[#FF6321] uppercase transition-all hover:bg-orange-100"
                    >
                      <Users size={12} />
                      + Team Goal
                    </button>
                    <button 
                      onClick={() => setIsProfileModalOpen(true)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white active:scale-90"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div className="grid gap-3">
                  {profiles.filter(p => p.role === 'kid').map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm transition-all">
                      <div>
                        <p className="font-bold dark:text-slate-100">{p.name}</p>
                        <p className="text-xs text-[#9E9E9E] dark:text-slate-500 uppercase font-bold tracking-tight">{p.sport} • {p.drillsPerDay} / day</p>
                      </div>
                      <button 
                        onClick={() => {
                          setEditingProfile(p);
                          setIsEditProfileModalOpen(true);
                        }}
                        className="text-sm font-bold text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4 lg:col-span-1">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  Completed Alerts <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                    {history.filter(h => h.date === format(new Date(), 'yyyy-MM-dd')).length}
                  </span>
                </h3>
                <div className="grid gap-3">
                  {history
                    .filter(h => h.date === format(new Date(), 'yyyy-MM-dd'))
                    .map(log => {
                      const profile = profiles.find(p => p.id === log.profileId);
                      return (
                        <div key={log.id} className="rounded-2xl border-l-4 border-l-green-500 bg-white p-4 shadow-sm">
                          <p className="text-sm font-bold">{profile?.name} finished {log.completedDrillIds.length} drills!</p>
                          <p className="text-xs text-[#9E9E9E]">Today</p>
                        </div>
                      );
                    })}
                  {history.filter(h => h.date === format(new Date(), 'yyyy-MM-dd')).length === 0 && (
                    <p className="text-sm text-slate-400 italic">No activity yet today.</p>
                  )}
                </div>
              </section>

              <section className="space-y-4 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Drill Library</h3>
                  <button 
                    onClick={() => {
                      setNewDrill({ sports: [], type: 'sport-specific' });
                      setIsDrillModalOpen(true);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6321] text-white active:scale-90 shadow-md transition-shadow hover:shadow-lg"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="grid gap-3">
                  {(() => {
                    const categories = [
                      { id: 'soccer', title: 'Soccer Drills', icon: <Trophy size={18} className="text-blue-500" /> },
                      { id: 'lacrosse', title: 'Lacrosse Drills', icon: <Medal size={18} className="text-orange-500" /> },
                      { id: 'conditioning', title: 'Strength & Conditioning', icon: <Dumbbell size={18} className="text-green-500" /> }
                    ];

                    return categories.map(cat => {
                      const catDrills = drills.filter(d => {
                        if (cat.id === 'conditioning') return d.type === 'conditioning' || d.type === 'strength';
                        return d.sports.includes(cat.id as Sport);
                      });

                      const isOpen = expandedCategories.includes(cat.id);

                      return (
                        <div key={cat.id} className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800">
                          <button 
                            onClick={() => toggleCategory(cat.id)}
                            className="flex w-full items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800">
                                {cat.icon}
                              </div>
                              <div className="text-left">
                                <p className="font-bold text-slate-800 dark:text-slate-100">{cat.title}</p>
                                <p className="text-xs text-slate-400 font-medium">{catDrills.length} Drills Available</p>
                              </div>
                            </div>
                            <ChevronDown className={cn("text-slate-300 transition-transform duration-300", isOpen && "rotate-180")} />
                          </button>
                          
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-slate-50 dark:border-slate-800"
                              >
                                <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
                                  {catDrills.map((drill) => (
                                    <AdminDrillCard 
                                      key={drill.id} 
                                      drill={drill} 
                                      onDelete={(id) => {
                                        setDrills(prev => prev.filter(d => d.id !== id));
                                        setNotification('Drill deleted.');
                                      }}
                                      onEdit={(d) => {
                                        setNewDrill(d);
                                        setIsDrillModalOpen(true);
                                      }}
                                    />
                                  ))}
                                  {catDrills.length === 0 && (
                                    <p className="py-8 text-center text-sm text-slate-400 italic">No drills in this category yet.</p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    });
                  })()}
                </div>
              </section>

              <section className="space-y-4 lg:col-span-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Active Quests</h3>
                  <button 
                    onClick={() => setIsCreateGoalModalOpen(true)}
                    className="flex items-center gap-2 rounded-full bg-[#FF6321] px-4 py-2 text-sm font-bold text-white shadow-lg active:scale-95 transition-all"
                  >
                    <Plus size={16} />
                    <span>New Quest</span>
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {goals.map(g => {
                    const profile = profiles.find(p => p.id === g.profileId);
                    const maxTarget = g.milestones.length > 0 ? Math.max(...g.milestones.map(m => m.target)) : 100;
                    const overallProgress = g.milestones.length > 0 ? (g.currentValue / maxTarget) * 100 : 0;
                    
                    return (
                      <div key={g.id} className={cn(
                        "rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm border transition-all relative overflow-hidden",
                        g.isTeam ? "border-orange-200 dark:border-orange-950/30 ring-1 ring-orange-50 dark:ring-orange-950/10" : "border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                      )}>
                        {g.isTeam && (
                          <div className="absolute top-0 right-0 bg-[#FF6321] text-white px-3 py-1 rounded-bl-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Users size={10} />
                            Team Goal
                          </div>
                        )}
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-bold text-[#9E9E9E] dark:text-slate-500 uppercase tracking-wider">
                              {g.isTeam ? 'Entire Team' : profile?.name} • {g.type.replace('_', ' ')}
                            </p>
                            <h4 className="font-black text-[#FF6321] text-lg">{g.title}</h4>
                          </div>
                          <RadialProgress 
                            progress={Math.min(100, overallProgress)} 
                            size={56} 
                            strokeWidth={6} 
                          />
                        </div>

                        {/* Linear Progress Bar for team visibility */}
                        <div className="mb-4">
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Collective Progress</span>
                            <span className="text-[10px] font-black text-[#FF6321]">{g.currentValue} / {maxTarget}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, overallProgress)}%` }}
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                g.isTeam ? "bg-orange-500" : "bg-blue-500"
                              )}
                            />
                          </div>
                        </div>

                        <div className="mb-4 space-y-1">
                           {g.milestones.sort((a,b) => a.target - b.target).slice(0, 3).map(m => (
                             <div key={m.id} className="flex items-center justify-between text-[10px]">
                               <span className={cn(m.isAchieved ? "text-green-600 dark:text-green-500 font-bold" : "text-slate-400 dark:text-slate-600")}>{m.reward}</span>
                               <span className="text-slate-300 dark:text-slate-700 font-mono font-bold leading-none">{m.target}</span>
                             </div>
                           ))}
                           {g.milestones.length > 3 && <p className="text-[9px] text-slate-300 dark:text-slate-700 text-center font-bold">+{g.milestones.length - 3} more loot</p>}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setEditingGoal(g);
                              setIsGoalModalOpen(true);
                            }}
                            className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 py-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 uppercase tracking-widest transition-all"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm('Delete this quest?')) deleteGoal(g.id);
                            }}
                            className="rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2 text-[10px] font-bold text-slate-300 hover:text-red-400 hover:border-red-100 dark:hover:border-red-900 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {goals.length === 0 && (
                    <div className="col-span-full py-12 text-center rounded-3xl border-2 border-dashed border-slate-100">
                      <p className="text-slate-400">No active quests. Create one to motivate the kids!</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </motion.div>
        )}
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-0 z-[100] flex justify-center px-6 pointer-events-none"
          >
            <div className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-2xl">
              {notification}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal 
        isOpen={isDrillModalOpen} 
        onClose={() => setIsDrillModalOpen(false)}
        title={newDrill.id ? "Edit Drill" : "Add New Drill"}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">Title</label>
            <input 
              type="text" 
              value={newDrill.title || ''}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 focus:border-[#FF6321] focus:ring-1 focus:ring-[#FF6321] outline-none transition-all dark:text-slate-100"
              placeholder="e.g. 50 Wall Balls"
              onChange={(e) => setNewDrill({...newDrill, title: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">Description</label>
            <textarea 
              value={newDrill.description || ''}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 outline-none dark:text-slate-100 h-24"
              placeholder="Describe the movement..."
              onChange={(e) => setNewDrill({...newDrill, description: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Type</label>
              <select 
                value={newDrill.type}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 outline-none dark:text-slate-100"
                onChange={(e) => setNewDrill({...newDrill, type: e.target.value as DrillType})}
              >
                <option value="sport-specific">Sport Specific</option>
                <option value="conditioning">Conditioning</option>
                <option value="strength">Strength</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Reps / Goal</label>
              <input 
                type="text" 
                value={newDrill.reps || ''}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 outline-none dark:text-slate-100"
                placeholder="25 reps"
                onChange={(e) => setNewDrill({...newDrill, reps: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">Sports</label>
            <div className="flex flex-wrap gap-2">
              {['soccer', 'lacrosse', 'both'].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    const sports = newDrill.sports || [];
                    if (sports.includes(s as Sport)) {
                      setNewDrill({...newDrill, sports: sports.filter(x => x !== s)});
                    } else {
                      setNewDrill({...newDrill, sports: [...sports, s as Sport]});
                    }
                  }}
                  className={cn(
                    "rounded-lg px-4 py-2 text-xs font-bold uppercase transition-all",
                    newDrill.sports?.includes(s as Sport) ? "bg-[#FF6321] text-white" : "bg-slate-100 dark:bg-slate-800 text-[#9E9E9E] dark:text-slate-500"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={addDrill}
            className="w-full rounded-2xl bg-black py-4 font-black text-white active:scale-95 transition-transform"
          >
            {newDrill.id ? 'Update Drill' : 'Save Drill'}
          </button>
        </div>
      </Modal>

      <Modal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)}
        title="Add Kid Profile"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">Name</label>
            <input 
              type="text" 
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 outline-none focus:border-blue-500 dark:text-slate-100"
              placeholder="Child's name"
              onChange={(e) => setNewProfile({...newProfile, name: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Sport</label>
              <select 
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 outline-none dark:text-slate-100"
                value={newProfile.sport}
                onChange={(e) => setNewProfile({...newProfile, sport: e.target.value as Sport})}
              >
                <option value="soccer">Soccer</option>
                <option value="lacrosse">Lacrosse</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Drills / Day</label>
              <input 
                type="number" 
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 outline-none dark:text-slate-100"
                value={newProfile.drillsPerDay}
                onChange={(e) => setNewProfile({...newProfile, drillsPerDay: parseInt(e.target.value)})}
              />
            </div>
          </div>
          <button 
            onClick={addProfile}
            className="w-full rounded-2xl bg-black py-4 font-black text-white active:scale-95 transition-transform"
          >
            Create Profile
          </button>
        </div>
      </Modal>
      <Modal 
        isOpen={isKidLoginOpen} 
        onClose={() => setIsKidLoginOpen(false)}
        title={isSettingPin ? "Create Your PIN" : `${activeProfile?.name}'s Login`}
      >
        <div className="space-y-4">
          <p className="text-center text-sm text-[#9E9E9E]">
            {isSettingPin 
              ? "Choose 4 digits to protect your progress!" 
              : "Enter your 4-digit PIN to continue"}
          </p>
          <input 
            type="password" 
            maxLength={4}
            className="w-full text-center text-3xl font-black tracking-[1em] rounded-xl border border-slate-200 p-4 outline-none focus:border-[#FF6321]"
            value={isSettingPin ? tempPin : kidPin}
            onChange={(e) => isSettingPin ? setTempPin(e.target.value) : setKidPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleKidLogin()}
            autoFocus
          />
          <button 
            onClick={handleKidLogin}
            className="w-full rounded-2xl bg-[#FF6321] py-4 font-black text-white active:scale-95 transition-transform"
          >
            {isSettingPin ? "Set PIN & Start" : "Let's Go!"}
          </button>
        </div>
      </Modal>

      <Modal 
        isOpen={isAdminLoginOpen} 
        onClose={() => setIsAdminLoginOpen(false)}
        title="Parent Login"
      >
        <div className="space-y-4">
          <p className="text-center text-sm text-[#9E9E9E]">Enter PIN to access settings (Hint: 1234)</p>
          <input 
            type="password" 
            maxLength={4}
            className="w-full text-center text-3xl font-black tracking-[1em] rounded-xl border border-slate-200 p-4 outline-none focus:border-[#FF6321]"
            value={adminPin}
            onChange={(e) => setAdminPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
            autoFocus
          />
          <button 
            onClick={handleAdminLogin}
            className="w-full rounded-2xl bg-black py-4 font-black text-white active:scale-95 transition-transform"
          >
            Unlock Admin
          </button>
        </div>
      </Modal>

      <Modal 
        isOpen={isEditProfileModalOpen} 
        onClose={() => setIsEditProfileModalOpen(false)}
        title="Edit Kid Profile"
      >
        {editingProfile && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Name</label>
              <input 
                type="text" 
                className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
                value={editingProfile.name}
                onChange={(e) => setEditingProfile({...editingProfile, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#9E9E9E]">Sport</label>
                <select 
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 outline-none"
                  value={editingProfile.sport}
                  onChange={(e) => setEditingProfile({...editingProfile, sport: e.target.value as Sport})}
                >
                  <option value="soccer">Soccer</option>
                  <option value="lacrosse">Lacrosse</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#9E9E9E]">Drills / Day</label>
                <input 
                  type="number" 
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 outline-none"
                  value={editingProfile.drillsPerDay}
                  onChange={(e) => setEditingProfile({...editingProfile, drillsPerDay: parseInt(e.target.value)})}
                />
              </div>
            </div>
            
            <div className="pt-2">
              <button 
                onClick={() => {
                  const updatedProfile = { ...editingProfile, pin: undefined };
                  setProfiles(prev => prev.map(p => p.id === editingProfile.id ? updatedProfile : p));
                  setIsEditProfileModalOpen(false);
                  setEditingProfile(null);
                  setNotification('PIN Reset! They will set a new one next login. 🔄');
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-3 text-xs font-bold text-red-600 transition-all hover:bg-red-100"
              >
                <RotateCcw size={14} />
                Reset PIN
              </button>
            </div>

            <button 
              onClick={() => {
                setProfiles(prev => prev.map(p => p.id === editingProfile.id ? editingProfile : p));
                setIsEditProfileModalOpen(false);
                setEditingProfile(null);
                setNotification('Profile updated! ✅');
              }}
              className="w-full rounded-2xl bg-black dark:bg-white dark:text-black py-4 font-black text-white active:scale-95 transition-transform"
            >
              Save Changes
            </button>
          </div>
        )}
      </Modal>

      <Modal 
        isOpen={isCreateGoalModalOpen} 
        onClose={() => setIsCreateGoalModalOpen(false)}
        title="Start New Quest"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Who for?</label>
              <select 
                className="w-full rounded-xl border border-slate-200 p-3 outline-none"
                value={newGoal.profileId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewGoal({...newGoal, profileId: val, isTeam: val === 'team'});
                }}
              >
                <option value="" disabled>Select...</option>
                <option value="team" className="font-bold text-[#FF6321]">Shared Team Goal 👨‍👩‍👧‍👦</option>
                {profiles.filter(p => p.role === 'kid').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Goal Type</label>
              <select 
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 outline-none dark:text-slate-100"
                value={newGoal.type}
                onChange={(e) => setNewGoal({...newGoal, type: e.target.value as GoalType})}
              >
                <option value="total_drills">Total Drills</option>
                <option value="streak">Streak (Days)</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">Quest Title</label>
            <input 
              type="text" 
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 focus:border-[#FF6321] outline-none dark:text-slate-100"
              placeholder="e.g. Summer Soccer Journey"
              value={newGoal.title || ''}
              onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-[#9E9E9E]">Milestones</label>
            <div className="space-y-2">
              {newGoal.milestones?.map((m, idx) => (
                <div key={m.id} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                  <div className="relative group/input">
                    <input 
                      type="number" 
                      className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 text-xs text-center pr-6 dark:text-slate-100"
                      value={m.target}
                      onChange={(e) => {
                        const ms = [...(newGoal.milestones || [])];
                        ms[idx].target = parseInt(e.target.value);
                        setNewGoal({...newGoal, milestones: ms});
                      }}
                    />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400 pointer-events-none uppercase">
                      {newGoal.type === 'streak' ? 'd' : 'dr'}
                    </span>
                  </div>
                  <input 
                    type="text" 
                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                    placeholder="Reward"
                    list="reward-suggestions"
                    value={m.reward}
                    onChange={(e) => {
                      const ms = [...(newGoal.milestones || [])];
                      ms[idx].reward = e.target.value;
                      setNewGoal({...newGoal, milestones: ms});
                    }}
                  />
                  <button 
                    onClick={() => setNewGoal({...newGoal, milestones: newGoal.milestones?.filter(x => x.id !== m.id)})}
                    className="text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setNewGoal({...newGoal, milestones: [...(newGoal.milestones || []), { id: Math.random().toString(), target: 10, reward: '', isAchieved: false }]})}
                className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-500 transition-all font-black"
              >
                + Add Milestone
              </button>
            </div>
          </div>
          <button 
            onClick={addGoal}
            disabled={!newGoal.profileId || !newGoal.title || !newGoal.milestones?.length}
            className="w-full rounded-2xl bg-[#FF6321] py-4 font-black text-white active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shadow-lg"
          >
            Launch Quest
          </button>
        </div>
      </Modal>

      <Modal 
        isOpen={isGoalModalOpen} 
        onClose={() => setIsGoalModalOpen(false)}
        title="Edit Quest"
      >
        {editingGoal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#9E9E9E]">Quest Title</label>
                <input 
                  type="text" 
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 outline-none dark:text-slate-100 font-bold"
                  value={editingGoal.title}
                  onChange={(e) => setEditingGoal({...editingGoal, title: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#9E9E9E]">Goal Type</label>
                <select 
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 outline-none dark:text-slate-100"
                  value={editingGoal.type}
                  onChange={(e) => setEditingGoal({...editingGoal, type: e.target.value as GoalType})}
                >
                  <option value="total_drills">Total Drills</option>
                  <option value="streak">Streak (Days)</option>
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase text-[#9E9E9E]">Milestones</label>
              <div className="space-y-2">
                {editingGoal.milestones.map((m, idx) => (
                  <div key={m.id} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                    <div className="relative">
                      <input 
                        type="number" 
                        className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 text-xs text-center pr-6 dark:text-slate-100"
                        value={m.target}
                        onChange={(e) => {
                          const ms = [...editingGoal.milestones];
                          ms[idx].target = parseInt(e.target.value);
                          setEditingGoal({...editingGoal, milestones: ms});
                        }}
                      />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400 pointer-events-none uppercase">
                        {editingGoal.type === 'streak' ? 'd' : 'dr'}
                      </span>
                    </div>
                    <input 
                      type="text" 
                      className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 text-xs dark:text-slate-100"
                      list="reward-suggestions"
                      value={m.reward}
                      onChange={(e) => {
                        const ms = [...editingGoal.milestones];
                        ms[idx].reward = e.target.value;
                        setEditingGoal({...editingGoal, milestones: ms});
                      }}
                    />
                    <button 
                      onClick={() => setEditingGoal({...editingGoal, milestones: editingGoal.milestones.filter(x => x.id !== m.id)})}
                      className="text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => setEditingGoal({...editingGoal, milestones: [...editingGoal.milestones, { id: Math.random().toString(), target: 0, reward: '', isAchieved: false }]})}
                  className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-500 transition-all font-black"
                >
                  + Add Milestone
                </button>
              </div>
            </div>
            <button 
              onClick={() => {
                const streak = calculateStreak(editingGoal.profileId);
                const currentValue = editingGoal.type === 'streak' ? streak : editingGoal.currentValue;
                
                setGoals(prev => prev.map(g => g.id === editingGoal.id ? {
                  ...editingGoal,
                  currentValue,
                  milestones: editingGoal.milestones.sort((a,b) => a.target - b.target).map(m => ({ ...m, isAchieved: currentValue >= m.target }))
                } : g));
                setIsGoalModalOpen(false);
                setEditingGoal(null);
                setNotification('Quest updated! 📝');
              }}
              className="w-full rounded-2xl bg-black dark:bg-white dark:text-black py-4 font-black text-white active:scale-95 transition-transform"
            >
              Save Changes
            </button>
          </div>
        )}
      </Modal>

      <datalist id="reward-suggestions">
        {PREDEFINED_REWARDS.map(reward => (
          <option key={reward} value={reward} />
        ))}
      </datalist>
    </div>
  );
}
