import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Profile } from './types';
import { useAppState } from './hooks/useAppState';
import SelectionView from './views/SelectionView';
import DashboardView from './views/DashboardView';
import AdminView from './views/AdminView';

type View = 'selection' | 'dashboard' | 'admin';

export default function App() {
  const [view, setView] = useState<View>('selection');
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  const state = useAppState();

  // Always derive active profile from current state so XP/badges update live
  const activeProfile = state.profiles.find(p => p.id === activeProfileId) ?? null;

  function handleLogin(profile: Profile, dest: 'dashboard' | 'admin') {
    setActiveProfileId(profile.id);
    setView(dest);
  }

  function handleBack() {
    setView('selection');
    setActiveProfileId(null);
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${
      state.theme === 'dark' ? 'bg-slate-950 text-slate-100 dark' : 'bg-[#F5F5F5] text-[#1A1A1A] light'
    }`}>
      <AnimatePresence mode="wait">
        {view === 'selection' && (
          <SelectionView
            key="selection"
            profiles={state.profiles}
            goals={state.goals}
            adminPin={state.adminPin}
            calculateStreak={state.calculateStreak}
            showNotification={state.showNotification}
            updateProfile={state.updateProfile}
            onLogin={handleLogin}
          />
        )}
        {view === 'dashboard' && activeProfile && (
          <DashboardView
            key="dashboard"
            activeProfile={activeProfile}
            drills={state.drills}
            goals={state.goals}
            dailyCompleted={state.dailyCompleted}
            history={state.history}
            calculateStreak={state.calculateStreak}
            toggleDrill={state.toggleDrill}
            onBack={handleBack}
          />
        )}
        {view === 'admin' && activeProfile && (
          <AdminView
            key="admin"
            profiles={state.profiles}
            drills={state.drills}
            goals={state.goals}
            history={state.history}
            theme={state.theme}
            adminPin={state.adminPin}
            toggleTheme={state.toggleTheme}
            showNotification={state.showNotification}
            addProfile={state.addProfile}
            updateProfile={state.updateProfile}
            addDrill={state.addDrill}
            updateDrill={state.updateDrill}
            deleteDrill={state.deleteDrill}
            addGoal={state.addGoal}
            updateGoal={state.updateGoal}
            deleteGoal={state.deleteGoal}
            changeAdminPin={state.changeAdminPin}
            onBack={handleBack}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-0 z-[100] flex justify-center px-6 pointer-events-none"
          >
            <div className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-2xl">
              {state.notification}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
