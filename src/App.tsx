import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Profile } from './types';
import { useAppState } from './hooks/useAppState';
import { useAuth } from './hooks/useAuth';
import SelectionView from './views/SelectionView';
import DashboardView from './views/DashboardView';
import AdminView from './views/AdminView';
import ErrorBoundary from './components/ErrorBoundary';

type View = 'selection' | 'dashboard' | 'admin';

export default function App() {
  const [view, setView] = useState<View>('selection');
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const { session, authLoading, signInWithGoogle, signOut } = useAuth();
  const state = useAppState();

  const activeProfile = state.profiles.find(p => p.id === activeProfileId) ?? null;

  // Once loading is done, auto-route to admin if already signed in
  useEffect(() => {
    if (authLoading || state.isLoading) return;
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (session) setView('admin');
  }, [authLoading, state.isLoading, session]);

  function handleLogin(profile: Profile, dest: 'dashboard' | 'admin') {
    setActiveProfileId(profile.id);
    setView(dest);
  }

  function handleBack() {
    setView('selection');
    setActiveProfileId(null);
  }

  async function handleSignOut() {
    await signOut();
    setView('selection');
    setActiveProfileId(null);
  }

  // Loading screen (auth check + data fetch)
  if (authLoading || state.isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1929] flex items-center justify-center">
        <motion.img
          src="/logo.jpg"
          alt="SkillSpark"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="h-40 w-auto"
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
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
              signInWithGoogle={signInWithGoogle}
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
              subscribeToNotifications={state.subscribeToNotifications}
              onBack={handleBack}
            />
          )}
          {view === 'admin' && (
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
              exportData={state.exportData}
              importData={state.importData}
              notificationTime={state.notificationTime}
              notificationEnabled={state.notificationEnabled}
              updateNotificationSettings={state.updateNotificationSettings}
              subscribeToNotifications={state.subscribeToNotifications}
              onSignOut={handleSignOut}
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
              <div className={`rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-2xl max-w-sm text-center ${
                state.notification.isError ? 'bg-red-600' : 'bg-slate-900'
              }`}>
                {state.notification.msg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
