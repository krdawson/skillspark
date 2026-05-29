import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, ensureSession } from '../lib/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Establish a session on boot (anonymous unless the parent already signed in
    // with Google). Authenticated-only RLS needs one for any read/write.
    ensureSession().then(async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setAuthLoading(false);
    });

    // Listen for sign-in / sign-out changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  }

  // Drop the Google session but keep the app usable by reverting to anonymous.
  async function signOut() {
    await supabase.auth.signOut();
    await supabase.auth.signInAnonymously();
  }

  // A real (parent) session — anonymous sessions don't count as admin access.
  const isParent = !!session && !session.user.is_anonymous;

  return { session, isParent, authLoading, signInWithGoogle, signOut };
}
