import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';
import { Profile, Drill, Goal, DailyLog, Sport, DrillType, GoalType } from '../types';
import { INITIAL_DRILLS } from '../constants';
import { BADGE_DEFINITIONS } from '../lib/badges';
import { calculateStreak, calculateLevelData } from '../lib/utils';

const DEFAULT_PIN = '1234';

function loadGoals(): Goal[] {
  const saved = localStorage.getItem('goals');
  let goals: Goal[] = [];

  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.length > 0 && (parsed[0] as any).targetDrills) {
      goals = parsed.map((old: any) => ({
        id: old.id,
        profileId: old.profileId,
        title: old.reward,
        type: 'total_drills' as GoalType,
        currentValue: old.completedDrills,
        milestones: [{ id: 'm1', target: old.targetDrills, reward: old.reward, isAchieved: old.isAchieved }],
      }));
    } else {
      goals = parsed;
    }
  } else {
    goals = [
      {
        id: 'g1', profileId: '2', title: 'Soccer Master Journey', type: 'total_drills', currentValue: 15,
        milestones: [
          { id: 'm1', target: 25, reward: 'New Soccer Ball', isAchieved: false },
          { id: 'm2', target: 50, reward: 'Soccer Cleats', isAchieved: false },
          { id: 'm3', target: 100, reward: 'Full Uniform', isAchieved: false },
        ],
      },
      {
        id: 'g2', profileId: '3', title: 'Lacrosse Pro Streak', type: 'streak', currentValue: 5,
        milestones: [
          { id: 'm1', target: 7, reward: 'Ice Cream', isAchieved: false },
          { id: 'm2', target: 15, reward: 'New Stick', isAchieved: false },
          { id: 'm3', target: 30, reward: 'Pro Gloves', isAchieved: false },
        ],
      },
    ];
  }

  if (!goals.some(g => g.isTeam)) {
    goals.push({
      id: 'team-' + Math.random().toString(36).substr(2, 9),
      profileId: 'team', title: 'Team Pizza & Movie Night!', type: 'total_drills', currentValue: 0, isTeam: true,
      milestones: [
        { id: 'tm1', target: 20, reward: 'Pizza Party', isAchieved: false },
        { id: 'tm2', target: 50, reward: 'Movie Night', isAchieved: false },
        { id: 'tm3', target: 150, reward: 'Theme Park Trip', isAchieved: false },
      ],
    });
  }

  return goals;
}

export function useAppState() {
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
      const merged = [...parsed];
      INITIAL_DRILLS.forEach(initial => {
        if (!merged.some(m => m.id === initial.id)) merged.push(initial);
      });
      return merged;
    }
    return INITIAL_DRILLS;
  });

  const [goals, setGoals] = useState<Goal[]>(loadGoals);

  const [dailyCompleted, setDailyCompleted] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('dailyCompleted');
    return saved ? JSON.parse(saved) : {};
  });

  const [history, setHistory] = useState<DailyLog[]>(() => {
    const saved = localStorage.getItem('history');
    return saved ? JSON.parse(saved) : [];
  });

  const [adminPin, setAdminPinState] = useState<string>(() => {
    return localStorage.getItem('parentPin') || DEFAULT_PIN;
  });

  const [notification, setNotification] = useState<{ msg: string; isError: boolean } | null>(null);

  // Persistence
  useEffect(() => { localStorage.setItem('theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('profiles', JSON.stringify(profiles)); }, [profiles]);
  useEffect(() => { localStorage.setItem('drills', JSON.stringify(drills)); }, [drills]);
  useEffect(() => { localStorage.setItem('goals', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('dailyCompleted', JSON.stringify(dailyCompleted)); }, [dailyCompleted]);
  useEffect(() => { localStorage.setItem('history', JSON.stringify(history)); }, [history]);

  // Notification auto-clear — errors stay 8s, others 3s
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), notification.isError ? 8000 : 3000);
    return () => clearTimeout(t);
  }, [notification]);

  // Sync streak goals when history changes
  useEffect(() => {
    setGoals(prev => prev.map(g => {
      if (g.type !== 'streak') return g;
      const streak = calculateStreak(g.profileId, history, profiles);
      if (g.currentValue === streak) return g;
      return { ...g, currentValue: streak, milestones: g.milestones.map(m => ({ ...m, isAchieved: streak >= m.target })) };
    }));
  }, [history]);

  function showNotification(msg: string, isError = false) {
    if (isError) console.error('[SkillSpark]', msg);
    setNotification({ msg, isError });
  }

  function triggerConfetti() {
    const end = Date.now() + 3000;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const rand = (min: number, max: number) => Math.random() * (max - min) + min;
    const interval = setInterval(() => {
      const timeLeft = end - Date.now();
      if (timeLeft <= 0) { clearInterval(interval); return; }
      const count = 50 * (timeLeft / 3000);
      confetti({ ...defaults, particleCount: count, origin: { x: rand(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount: count, origin: { x: rand(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  }

  function toggleTheme() {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }

  function checkBadges(profileId: string) {
    setProfiles(prev => {
      const profile = prev.find(p => p.id === profileId);
      if (!profile) return prev;

      const streak = calculateStreak(profileId, history, prev);
      const totalDrills = goals
        .filter(g => g.profileId === profileId && g.type === 'total_drills')
        .reduce((acc, g) => acc + g.currentValue, 0);
      const questComplete = goals.find(g => g.profileId === profileId && g.milestones.every(m => m.isAchieved));

      const current = profile.badges || [];
      const next = [...current];
      if (totalDrills >= 1 && !next.includes('rookie')) next.push('rookie');
      if (streak >= 7 && !next.includes('week-streak')) next.push('week-streak');
      if (streak >= 30 && !next.includes('month-streak')) next.push('month-streak');
      if (totalDrills >= 100 && !next.includes('century')) next.push('century');
      if (questComplete && !next.includes('quest-master')) next.push('quest-master');

      if (next.length === current.length) return prev;

      const newId = next.find(id => !current.includes(id))!;
      const badge = BADGE_DEFINITIONS.find(b => b.id === newId);
      if (badge) {
        showNotification(`NEW BADGE: ${badge.title}! 🎖️`);
        triggerConfetti();
      }
      return prev.map(p => p.id === profileId ? { ...p, badges: next } : p);
    });
  }

  function toggleDrill(drillId: string, profile: Profile) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const key = `${profile.id}-${drillId}`;
    const isDone = !dailyCompleted[key];

    setDailyCompleted(prev => ({ ...prev, [key]: isDone }));

    setHistory(prev => {
      const idx = prev.findIndex(h => h.profileId === profile.id && h.date === today);
      if (idx > -1) {
        const updated = [...prev];
        const log = { ...updated[idx] };
        log.completedDrillIds = isDone
          ? [...new Set([...log.completedDrillIds, drillId])]
          : log.completedDrillIds.filter(id => id !== drillId);
        updated[idx] = log;
        return updated;
      }
      if (!isDone) return prev;
      return [...prev, { id: Math.random().toString(36).substr(2, 9), profileId: profile.id, date: today, completedDrillIds: [drillId] }];
    });

    let milestoneReached = false;
    setGoals(prev => prev.map(g => {
      if (g.profileId !== profile.id && !g.isTeam) return g;
      if (g.type !== 'total_drills') return g;
      const newValue = isDone ? g.currentValue + 1 : Math.max(0, g.currentValue - 1);
      const newMilestones = g.milestones.map(m => {
        if (!m.isAchieved && newValue >= m.target && isDone) milestoneReached = true;
        return { ...m, isAchieved: newValue >= m.target };
      });
      return { ...g, currentValue: newValue, milestones: newMilestones };
    }));

    if (milestoneReached) {
      triggerConfetti();
      showNotification('NEW MILESTONE REACHED! 🏆');
    }

    if (isDone) {
      setProfiles(prev => prev.map(p => {
        if (p.id !== profile.id) return p;
        const newXP = (p.xp || 0) + 25;
        const oldLevel = calculateLevelData(p.xp || 0).level;
        const newLevel = calculateLevelData(newXP).level;
        if (newLevel > oldLevel && !milestoneReached) {
          showNotification(`LEVEL UP! You are now Level ${newLevel}! ⚡️`);
          triggerConfetti();
        }
        return { ...p, xp: newXP };
      }));
      setTimeout(() => checkBadges(profile.id), 100);
    }
  }

  function addDrill(data: Omit<Drill, 'id'>) {
    setDrills(prev => [...prev, { ...data, id: Math.random().toString(36).substr(2, 9) }]);
    showNotification('Drill added to library!');
  }

  function updateDrill(drill: Drill) {
    setDrills(prev => prev.map(d => d.id === drill.id ? drill : d));
    showNotification('Drill updated!');
  }

  function deleteDrill(id: string) {
    setDrills(prev => prev.filter(d => d.id !== id));
    showNotification('Drill deleted.');
  }

  function addProfile(data: { name: string; sport: Sport; drillsPerDay: number }) {
    const profile: Profile = { id: Math.random().toString(36).substr(2, 9), name: data.name, role: 'kid', sport: data.sport, drillsPerDay: data.drillsPerDay };
    setProfiles(prev => [...prev, profile]);
    showNotification(`Profile for ${profile.name} created!`);
  }

  function updateProfile(profile: Profile) {
    setProfiles(prev => prev.map(p => p.id === profile.id ? profile : p));
  }

  function addGoal(data: Partial<Goal>) {
    if (!data.profileId || !data.title || !data.milestones?.length) {
      showNotification('Add at least one milestone!');
      return false;
    }
    const goal: Goal = {
      id: Math.random().toString(36).substr(2, 9),
      profileId: data.profileId,
      title: data.title,
      type: data.type || 'total_drills',
      milestones: [...(data.milestones || [])].sort((a, b) => a.target - b.target),
      currentValue: 0,
      isTeam: data.isTeam,
    };
    setGoals(prev => [...prev, goal]);
    showNotification(`Quest "${goal.title}" started! 🚀`);
    return true;
  }

  function updateGoal(goal: Goal) {
    const streak = calculateStreak(goal.profileId, history, profiles);
    const currentValue = goal.type === 'streak' ? streak : goal.currentValue;
    setGoals(prev => prev.map(g => g.id === goal.id ? {
      ...goal,
      currentValue,
      milestones: [...goal.milestones].sort((a, b) => a.target - b.target).map(m => ({ ...m, isAchieved: currentValue >= m.target })),
    } : g));
    showNotification('Quest updated! 📝');
  }

  function deleteGoal(id: string) {
    setGoals(prev => prev.filter(g => g.id !== id));
    showNotification('Quest deleted.');
  }

  function changeAdminPin(newPin: string) {
    localStorage.setItem('parentPin', newPin);
    setAdminPinState(newPin);
    showNotification('PIN updated! 🔒');
  }

  function exportData() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profiles,
      drills,
      goals,
      dailyCompleted,
      history,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skillspark-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Backup downloaded! 💾');
  }

  function importData(jsonString: string) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.version || !data.profiles) throw new Error('Invalid backup file');
      if (data.profiles)       setProfiles(data.profiles);
      if (data.drills)         setDrills(data.drills);
      if (data.goals)          setGoals(data.goals);
      if (data.dailyCompleted) setDailyCompleted(data.dailyCompleted);
      if (data.history)        setHistory(data.history);
      showNotification('Data restored! ✅ Refresh to see everything.');
      return true;
    } catch {
      showNotification('Invalid backup file — restore failed.');
      return false;
    }
  }

  return {
    theme, profiles, drills, goals, dailyCompleted, history, adminPin, notification,
    toggleTheme, showNotification, triggerConfetti,
    toggleDrill, addDrill, updateDrill, deleteDrill,
    addProfile, updateProfile,
    addGoal, updateGoal, deleteGoal,
    changeAdminPin, exportData, importData,
    calculateStreak: (profileId: string) => calculateStreak(profileId, history, profiles),
  };
}

export type AppState = ReturnType<typeof useAppState>;
