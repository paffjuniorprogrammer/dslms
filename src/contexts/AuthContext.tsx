import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** Reload the signed-in user's profile after an admin changes access. */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, authUser?: { email?: string; user_metadata?: Record<string, any> }) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to fetch profile:', error.message);
      setProfile(null);
      return;
    }

    const raw = data as Profile;
    let effectiveName = raw.full_name?.trim();

    // If profile.full_name is missing, try user_metadata
    if (!effectiveName && authUser?.user_metadata?.full_name) {
      effectiveName = authUser.user_metadata.full_name;
    }

    // If still missing, check teachers table if role is teacher
    if (!effectiveName && raw.role === 'teacher') {
      const { data: teacherRow } = await supabase.from('teachers').select('full_name').eq('profile_id', userId).maybeSingle();
      if (teacherRow?.full_name) effectiveName = teacherRow.full_name;
    }

    // If still missing, check students table if role is student
    if (!effectiveName && raw.role === 'student') {
      const { data: studentRow } = await supabase.from('students').select('full_name').eq('profile_id', userId).maybeSingle();
      if (studentRow?.full_name) effectiveName = studentRow.full_name;
    }

    // If still missing, check schools table if role is school_admin
    if (!effectiveName && raw.role === 'school_admin' && raw.school_id) {
      const { data: schoolRow } = await supabase.from('schools').select('name').eq('id', raw.school_id).maybeSingle();
      if (schoolRow?.name) effectiveName = schoolRow.name;
    }

    setProfile({
      ...raw,
      full_name: effectiveName || authUser?.email?.split('@')[0] || 'User',
    });
  }, []);

  useEffect(() => {
    // Restore existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id, session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          await fetchProfile(session.user.id, session.user);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    await fetchProfile(session.user.id);
  }, [fetchProfile, session]);

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
