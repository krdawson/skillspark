import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';
import { Profile, Drill, Goal, DailyLog, DrillRating, Sport, DrillType, GoalType } from '../types';
import { INITIAL_DRILLS } from '../constants';
import { BADGE_DEFINITIONS } from '../lib/badges';
import { calculateStreak, calculateLevelData } from '../lib/utils';
import { supabase, FAMILY_ID, toProfile, toDrill, toGoal, toLog, toRating, fromProfile, fromDrill, fromGoal, fromLog, fromRating } from '../lib/supabase';

// ── Default seed data ───────────────────────────────────────────────────────

const DEFAULT_PROFILES: Profile[] = [
  { id: '1', name: 'Parent',  role: 'admin', sport: 'none',     drillsPerDay: 0 },
  { id: '2', name: 'Kid 1',   role: 'kid',   sport: 'soccer',   drillsPerDay: 3 },
  { id: '3', name: 'Kid 2',   role: 'kid',   sport: 'lacrosse', drillsPerDay: 3 },
];

const DEFAULT_GOALS: Goal[] = [
  {
    id: 'g1', profileId: '2', title: 'Soccer Master Journey',
    type: 'total_drills', currentValue: 0, milestones: [
      { id: 'm1', target: 25,  reward: 'New Soccer Ball', isAchieved: false },
      { id: 'm2', target: 50,  reward: 'Soccer Cleats',   isAchieved: false },
      { id: 'm3', target: 100, reward: 'Full Uniform',    isAchieved: false },
    ],
  },
  {
    id: 'g2', profileId: '3', title: 'Lacrosse Pro Streak',
    type: 'streak', currentValue: 0, milestones: [
      { id: 'm1', target: 7,  reward: 'Ice Cream',  isAchieved: false },
      { id: 'm2', target: 15, reward: 'New Stick',  isAchieved: false },
      { id: 'm3', target: 30, reward: 'Pro Gloves', isAchieved: false },
    ],
  },
  {
    id: 'team-default', profileId: 'team', title: 'Team Pizza & Movie Night!',
    type: 'total_drills', currentValue: 0, isTeam: true, milestones: [
      { id: 'tm1', target: 20,  reward: 'Pizza Party',     isAchieved: false },
      { id: 'tm2', target: 50,  reward: 'Movie Night',     isAchieved: false },
      { id: 'tm3', target: 150, reward: 'Theme Park Trip', isAchieved: false },
    ],
  },
];

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useAppState() {
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [drills, setDrills]     = useState<Drill[]>([]);
  const [goals, setGoals]       = useState<Goal[]>([]);
  const [history, setHistory]   = useState<DailyLog[]>([]);
  const [dailyCompleted, setDailyCompleted] = useState<Record<string, boolean>>({});
  const [ratings, setRatings] = useState<DrillRating[]>([]);
  const [adminPin, setAdminPinState]         = useState('1234');
  const [theme, setTheme]                    = useState<'light' | 'dark'>('light');
  const [notificationTime, setNotificationTime]       = useState('09:00');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notification, setNotification] = useState<{ msg: string; isError: boolean } | null>(null);

  // ── Boot: load from Supabase ──────────────────────────────────────────────

  useEffect(() => { loadAllData(); }, []);

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), notification.isError ? 8000 : 3000);
    return () => clearTimeout(t);
  }, [notification]);

  // Supabase Realtime — keep admin overview live when kids complete drills
  useEffect(() => {
    if (isLoading) return;

    const channel = supabase
      .channel('family-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'daily_logs',
        filter: `family_id=eq.${FAMILY_ID}`,
      }, payload => {
        if (!payload.new) return;
        const updated = toLog(payload.new);
        setHistory(prev => {
          const idx = prev.findIndex(l => l.id === updated.id);
          if (idx > -1) { const next = [...prev]; next[idx] = updated; return next; }
          return [...prev, updated];
        });
        // Keep dailyCompleted in sync for today
        const today = format(new Date(), 'yyyy-MM-dd');
        if (updated.date === today) {
          setDailyCompleted(prev => {
            const next = { ...prev };
            updated.completedDrillIds.forEach(id => { next[`${updated.profileId}-${id}`] = true; });
            return next;
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles',
        filter: `family_id=eq.${FAMILY_ID}`,
      }, payload => {
        if (!payload.new) return;
        const updated = toProfile(payload.new);
        setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'goals',
        filter: `family_id=eq.${FAMILY_ID}`,
      }, payload => {
        if (!payload.new) return;
        const updated = toGoal(payload.new);
        setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLoading]);

  // Sync streak goals whenever history changes
  useEffect(() => {
    if (isLoading) return;
    setGoals(prev => {
      let changed = false;
      const next = prev.map(g => {
        if (g.type !== 'streak') return g;
        const streak = calculateStreak(g.profileId, history, profiles);
        if (g.currentValue === streak) return g;
        changed = true;
        const updated = { ...g, currentValue: streak, milestones: g.milestones.map(m => ({ ...m, isAchieved: streak >= m.target })) };
        supabase.from('goals')
          .update({ current_value: updated.currentValue, milestones: updated.milestones })
          .eq('id', g.id).eq('family_id', FAMILY_ID).then();
        return updated;
      });
      return changed ? next : prev;
    });
  }, [history, isLoading]);

  async function loadAllData() {
    setIsLoading(true);
    try {
      const [
        { data: profileRows },
        { data: drillRows },
        { data: goalRows },
        { data: logRows },
        { data: ratingRows },
        { data: settingsRow },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('family_id', FAMILY_ID),
        supabase.from('drills').select('*').eq('family_id', FAMILY_ID),
        supabase.from('goals').select('*').eq('family_id', FAMILY_ID),
        supabase.from('daily_logs').select('*').eq('family_id', FAMILY_ID),
        supabase.from('drill_ratings').select('*').eq('family_id', FAMILY_ID),
        supabase.from('settings').select('*').eq('family_id', FAMILY_ID).maybeSingle(),
      ]);

      if (!profileRows?.length) {
        await seedDefaults();
        return;
      }

      setProfiles(profileRows.map(toProfile));

      // Merge any new drills from INITIAL_DRILLS not yet in the DB
      const loadedDrills = drillRows?.map(toDrill) ?? [];
      const missingDefaults = INITIAL_DRILLS.filter(d => !loadedDrills.some(l => l.id === d.id));
      if (missingDefaults.length) {
        await supabase.from('drills').insert(missingDefaults.map(fromDrill));
      }
      setDrills([...loadedDrills, ...missingDefaults]);

      setGoals(goalRows?.map(toGoal) ?? []);
      setRatings(ratingRows?.map(toRating) ?? []);

      const logs = logRows?.map(toLog) ?? [];
      setHistory(logs);

      // Derive today's completed drills from logs
      const today = format(new Date(), 'yyyy-MM-dd');
      const completed: Record<string, boolean> = {};
      logs.filter(l => l.date === today).forEach(log => {
        log.completedDrillIds.forEach(id => { completed[`${log.profileId}-${id}`] = true; });
      });
      setDailyCompleted(completed);

      if (settingsRow) {
        setAdminPinState(settingsRow.admin_pin);
        setTheme(settingsRow.theme as 'light' | 'dark');
        setNotificationTime(settingsRow.notification_time ?? '09:00');
        setNotificationEnabled(settingsRow.notification_enabled ?? true);
      }
    } catch (err) {
      console.error('[useAppState] load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function seedDefaults() {
    await Promise.all([
      supabase.from('profiles').insert(DEFAULT_PROFILES.map(fromProfile)),
      supabase.from('drills').insert(INITIAL_DRILLS.map(fromDrill)),
      supabase.from('goals').insert(DEFAULT_GOALS.map(fromGoal)),
      supabase.from('settings').insert({ family_id: FAMILY_ID, admin_pin: '1234', theme: 'light' }),
    ]);
    setProfiles(DEFAULT_PROFILES);
    setDrills(INITIAL_DRILLS);
    setGoals(DEFAULT_GOALS);
    setHistory([]);
    setDailyCompleted({});
    setIsLoading(false);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

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
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    supabase.from('settings').update({ theme: next }).eq('family_id', FAMILY_ID).then();
  }

  function checkBadges(profileId: string, currentGoals: Goal[], currentHistory: DailyLog[], currentProfiles: Profile[]) {
    const profile = currentProfiles.find(p => p.id === profileId);
    if (!profile) return;

    const streak = calculateStreak(profileId, currentHistory, currentProfiles);
    const totalDrills = currentGoals
      .filter(g => g.profileId === profileId && g.type === 'total_drills')
      .reduce((acc, g) => acc + g.currentValue, 0);
    const questComplete = currentGoals.find(g => g.profileId === profileId && g.milestones.every(m => m.isAchieved));

    const current = profile.badges ?? [];
    const next = [...current];
    if (totalDrills >= 1   && !next.includes('rookie'))       next.push('rookie');
    if (streak >= 7        && !next.includes('week-streak'))  next.push('week-streak');
    if (streak >= 30       && !next.includes('month-streak')) next.push('month-streak');
    if (totalDrills >= 100 && !next.includes('century'))      next.push('century');
    if (questComplete      && !next.includes('quest-master')) next.push('quest-master');

    if (next.length === current.length) return;

    const newId = next.find(id => !current.includes(id))!;
    const badge = BADGE_DEFINITIONS.find(b => b.id === newId);
    if (badge) { showNotification(`NEW BADGE: ${badge.title}! 🎖️`); triggerConfetti(); }

    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, badges: next } : p));
    supabase.from('profiles').update({ badges: next }).eq('id', profileId).eq('family_id', FAMILY_ID).then();
  }

  // ── Core action: toggle drill completion ──────────────────────────────────

  function toggleDrill(drillId: string, profile: Profile) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const key = `${profile.id}-${drillId}`;
    const isDone = !dailyCompleted[key];

    // Compute new log
    const existingLog = history.find(h => h.profileId === profile.id && h.date === today);
    const newLog: DailyLog = existingLog
      ? {
          ...existingLog,
          completedDrillIds: isDone
            ? [...new Set([...existingLog.completedDrillIds, drillId])]
            : existingLog.completedDrillIds.filter(id => id !== drillId),
        }
      : { id: Math.random().toString(36).substr(2, 9), profileId: profile.id, date: today, completedDrillIds: isDone ? [drillId] : [] };

    // Compute new goals
    let milestoneReached = false;
    const newGoals = goals.map(g => {
      if (g.profileId !== profile.id && !g.isTeam) return g;
      if (g.type !== 'total_drills') return g;
      const newValue = isDone ? g.currentValue + 1 : Math.max(0, g.currentValue - 1);
      const newMilestones = g.milestones.map(m => {
        if (!m.isAchieved && newValue >= m.target && isDone) milestoneReached = true;
        return { ...m, isAchieved: newValue >= m.target };
      });
      return { ...g, currentValue: newValue, milestones: newMilestones };
    });

    // Compute new XP
    const newXP = isDone ? (profile.xp ?? 0) + 25 : Math.max(0, (profile.xp ?? 0) - 25);
    const leveledUp = isDone && calculateLevelData(newXP).level > calculateLevelData(profile.xp ?? 0).level;

    // ── Apply local state (optimistic) ────────────────────────────────────
    setDailyCompleted(prev => ({ ...prev, [key]: isDone }));
    setHistory(prev => {
      const idx = prev.findIndex(h => h.profileId === profile.id && h.date === today);
      if (idx > -1) { const u = [...prev]; u[idx] = newLog; return u; }
      return isDone ? [...prev, newLog] : prev;
    });
    setGoals(newGoals);

    const newProfiles = profiles.map(p => p.id === profile.id ? { ...p, xp: newXP } : p);
    setProfiles(newProfiles);
    if (isDone) {
      if (leveledUp && !milestoneReached) {
        showNotification(`LEVEL UP! You are now Level ${calculateLevelData(newXP).level}! ⚡️`);
        triggerConfetti();
      }
      setTimeout(() => checkBadges(profile.id, newGoals, [...history.filter(h => !(h.profileId === profile.id && h.date === today)), newLog], newProfiles), 100);
    }

    if (milestoneReached) { triggerConfetti(); showNotification('NEW MILESTONE REACHED! 🏆'); }

    // Notify parent when kid completes all drills for the day
    const wasComplete = existingLog ? existingLog.completedDrillIds.length >= profile.drillsPerDay : false;
    const isNowComplete = isDone && newLog.completedDrillIds.length >= profile.drillsPerDay;
    if (isNowComplete && !wasComplete) {
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: FAMILY_ID,
          targetAdmins: true,
          title: 'SkillSpark ✅',
          body: `${profile.name} finished all their drills today!`,
        }),
      }).catch(() => {});
    }

    // ── Background Supabase writes ────────────────────────────────────────
    ;(async () => {
      try {
        if (existingLog) {
          await supabase.from('daily_logs')
            .update({ completed_drill_ids: newLog.completedDrillIds })
            .eq('id', existingLog.id).eq('family_id', FAMILY_ID);
        } else if (isDone) {
          await supabase.from('daily_logs').insert(fromLog(newLog));
        }
        const changedGoals = newGoals.filter(g => goals.find(og => og.id === g.id)?.currentValue !== g.currentValue);
        for (const g of changedGoals) {
          await supabase.from('goals')
            .update({ current_value: g.currentValue, milestones: g.milestones })
            .eq('id', g.id).eq('family_id', FAMILY_ID);
        }
        await supabase.from('profiles').update({ xp: newXP }).eq('id', profile.id).eq('family_id', FAMILY_ID);
      } catch (err) {
        console.error('[toggleDrill] write failed:', err);
      }
    })();
  }

  // ── Drill CRUD ────────────────────────────────────────────────────────────

  function addDrill(data: Omit<Drill, 'id'>) {
    const drill: Drill = { ...data, id: Math.random().toString(36).substr(2, 9) };
    setDrills(prev => [...prev, drill]);
    supabase.from('drills').insert(fromDrill(drill)).then();
    showNotification('Drill added to library!');
  }

  function updateDrill(drill: Drill) {
    setDrills(prev => prev.map(d => d.id === drill.id ? drill : d));
    supabase.from('drills').update(fromDrill(drill)).eq('id', drill.id).eq('family_id', FAMILY_ID).then();
    showNotification('Drill updated!');
  }

  function deleteDrill(id: string) {
    setDrills(prev => prev.filter(d => d.id !== id));
    supabase.from('drills').delete().eq('id', id).eq('family_id', FAMILY_ID).then();
    showNotification('Drill deleted.');
  }

  // ── Profile CRUD ──────────────────────────────────────────────────────────

  function addProfile(data: { name: string; sport: Sport; drillsPerDay: number }) {
    const profile: Profile = { id: Math.random().toString(36).substr(2, 9), name: data.name, role: 'kid', sport: data.sport, drillsPerDay: data.drillsPerDay };
    setProfiles(prev => [...prev, profile]);
    supabase.from('profiles').insert(fromProfile(profile)).then();
    showNotification(`Profile for ${profile.name} created!`);
  }

  function updateProfile(profile: Profile) {
    setProfiles(prev => prev.map(p => p.id === profile.id ? profile : p));
    supabase.from('profiles').update(fromProfile(profile)).eq('id', profile.id).eq('family_id', FAMILY_ID).then();
  }

  // ── Goal CRUD ─────────────────────────────────────────────────────────────

  function addGoal(data: Partial<Goal>) {
    if (!data.profileId || !data.title || !data.milestones?.length) {
      showNotification('Add at least one milestone!');
      return false;
    }
    const goal: Goal = {
      id: Math.random().toString(36).substr(2, 9),
      profileId: data.profileId, title: data.title,
      type: (data.type ?? 'total_drills') as GoalType,
      milestones: [...(data.milestones ?? [])].sort((a, b) => a.target - b.target),
      currentValue: 0, isTeam: data.isTeam,
    };
    setGoals(prev => [...prev, goal]);
    supabase.from('goals').insert(fromGoal(goal)).then();
    showNotification(`Quest "${goal.title}" started! 🚀`);
    return true;
  }

  function updateGoal(goal: Goal) {
    const streak = calculateStreak(goal.profileId, history, profiles);
    const currentValue = goal.type === 'streak' ? streak : goal.currentValue;
    const updated = {
      ...goal, currentValue,
      milestones: [...goal.milestones].sort((a, b) => a.target - b.target).map(m => ({ ...m, isAchieved: currentValue >= m.target })),
    };
    setGoals(prev => prev.map(g => g.id === goal.id ? updated : g));
    supabase.from('goals').update(fromGoal(updated)).eq('id', goal.id).eq('family_id', FAMILY_ID).then();
    showNotification('Quest updated! 📝');
  }

  function deleteGoal(id: string) {
    setGoals(prev => prev.filter(g => g.id !== id));
    supabase.from('goals').delete().eq('id', id).eq('family_id', FAMILY_ID).then();
    showNotification('Quest deleted.');
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  // ── Push notifications ────────────────────────────────────────────────────

  async function subscribeToNotifications(profileId: string): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY as string),
      });

      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, subscription: sub.toJSON(), familyId: FAMILY_ID }),
      });
      return true;
    } catch (err) {
      console.error('[subscribe]', err);
      return false;
    }
  }

  function updateNotificationSettings(settings: { time?: string; enabled?: boolean }) {
    if (settings.time !== undefined)    setNotificationTime(settings.time);
    if (settings.enabled !== undefined) setNotificationEnabled(settings.enabled);
    supabase.from('settings').update({
      ...(settings.time    !== undefined && { notification_time: settings.time }),
      ...(settings.enabled !== undefined && { notification_enabled: settings.enabled }),
    }).eq('family_id', FAMILY_ID).then();
  }

  function changeAdminPin(newPin: string) {
    setAdminPinState(newPin);
    supabase.from('settings').update({ admin_pin: newPin }).eq('family_id', FAMILY_ID).then();
    showNotification('PIN updated! 🔒');
  }

  // ── Drill ratings ─────────────────────────────────────────────────────────

  function addDrillRating(drillId: string, liked: boolean, difficulty: 1 | 2 | 3, profileId: string) {
    const rating: DrillRating = {
      id: Math.random().toString(36).substr(2, 9),
      profileId, drillId,
      date: format(new Date(), 'yyyy-MM-dd'),
      liked, difficulty,
    };
    setRatings(prev => [...prev, rating]);
    supabase.from('drill_ratings').insert(fromRating(rating)).then();
  }

  // ── Backup / Restore ──────────────────────────────────────────────────────

  function exportData() {
    const payload = { version: 2, exportedAt: new Date().toISOString(), profiles, drills, goals, dailyCompleted, history };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skillspark-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Backup downloaded! 💾');
  }

  async function importData(jsonString: string) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.version || !data.profiles) throw new Error('Invalid backup file');

      // Wipe existing data then reinsert
      await Promise.all([
        supabase.from('profiles').delete().eq('family_id', FAMILY_ID),
        supabase.from('drills').delete().eq('family_id', FAMILY_ID),
        supabase.from('goals').delete().eq('family_id', FAMILY_ID),
        supabase.from('daily_logs').delete().eq('family_id', FAMILY_ID),
      ]);
      await Promise.all([
        data.profiles && supabase.from('profiles').insert((data.profiles as Profile[]).map(fromProfile)),
        data.drills   && supabase.from('drills').insert((data.drills as Drill[]).map(fromDrill)),
        data.goals    && supabase.from('goals').insert((data.goals as Goal[]).map(fromGoal)),
        data.history  && supabase.from('daily_logs').insert((data.history as DailyLog[]).map(fromLog)),
      ]);

      if (data.profiles)       setProfiles(data.profiles);
      if (data.drills)         setDrills(data.drills);
      if (data.goals)          setGoals(data.goals);
      if (data.dailyCompleted) setDailyCompleted(data.dailyCompleted);
      if (data.history)        setHistory(data.history);

      showNotification('Data restored! ✅');
      return true;
    } catch {
      showNotification('Invalid backup file — restore failed.', true);
      return false;
    }
  }

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    isLoading,
    theme, profiles, drills, goals, dailyCompleted, history, ratings, adminPin, notification,
    toggleTheme, showNotification, triggerConfetti,
    toggleDrill, addDrill, updateDrill, deleteDrill,
    addDrillRating,
    addProfile, updateProfile,
    addGoal, updateGoal, deleteGoal,
    changeAdminPin, exportData, importData,
    notificationTime, notificationEnabled, subscribeToNotifications, updateNotificationSettings,
    calculateStreak: (profileId: string) => calculateStreak(profileId, history, profiles),
  };
}

export type AppState = ReturnType<typeof useAppState>;
