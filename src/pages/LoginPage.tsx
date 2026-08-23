import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, School, ShieldCheck, Loader2, AlertCircle, WifiOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const roleRedirect: Record<string, string> = {
  super_admin: '/admin',
  school_admin: '/school',
  teacher: '/teacher',
  student: '/student',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, profile, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(() => (location.state as { authError?: string } | null)?.authError ?? '');

  // ── Offline detection ──
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // Already logged in → redirect immediately
  useEffect(() => {
    if (!loading && session && profile?.is_active) {
      if (profile.must_change_password) {
        navigate('/set-password', { replace: true });
        return;
      }
      navigate(roleRedirect[profile.role] ?? '/admin', { replace: true });
    }
  }, [loading, session, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Block submission immediately if offline
    if (!navigator.onLine) {
      setIsOffline(true);
      setError('You are offline. Please check your internet connection and try again.');
      return;
    }

    setSubmitting(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      // Detect network-level failure
      if (
        authError.message.toLowerCase().includes('fetch') ||
        authError.message.toLowerCase().includes('network') ||
        authError.message.toLowerCase().includes('failed to fetch')
      ) {
        setError('No internet connection. Please check your network and try again.');
      } else {
        setError(
          authError.message.includes('Invalid login credentials')
            ? 'Invalid email or password. Please try again.'
            : authError.message
        );
      }
      setSubmitting(false);
      return;
    }

    if (data.user) {
      // Fetch profile to determine role
      const { data: prof, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_active, must_change_password')
        .eq('id', data.user.id)
        .single();

      if (profileError || !prof) {
        await supabase.auth.signOut();
        setError('Your account setup is incomplete. Please contact your system administrator.');
        setSubmitting(false);
        return;
      }

      if (!prof.is_active) {
        await supabase.auth.signOut();
        setError('Your account has been deactivated. Please contact your system administrator.');
        setSubmitting(false);
        return;
      }

      if (prof.must_change_password) {
        navigate('/set-password', { replace: true });
        setSubmitting(false);
        return;
      }

      const role = prof.role ?? 'student';
      navigate(roleRedirect[role] ?? '/admin', { replace: true });
    }

    setSubmitting(false);
  };

  if (loading) return null; // ProtectedRoute spinner handles this


  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* ── Left Panel: Branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border-r border-slate-800 p-12 relative overflow-hidden">
        {/* Background glow orbs */}
        <div className="absolute top-1/4 -left-24 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-24 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40">
              <School size={22} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-base tracking-tight leading-tight">Driving School LMS</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck size={11} className="text-emerald-400" />
                <p className="text-emerald-400 text-[11px] font-extrabold">Rwanda Portal</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Text */}
        <div className="relative space-y-6">
          <h1 className="text-4xl font-black text-white leading-tight">
            Manage your driving school<br />
            <span className="text-blue-400">with confidence.</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            The all-in-one platform for driving schools in Rwanda — manage teachers, students, live classes, exams, certificates, and subscriptions from one place.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2">
            {['Live Classes', 'Exam Engine', 'Certificates', 'Multi-School', 'Role-Based Access'].map((f) => (
              <span key={f} className="px-3 py-1 bg-slate-800/60 border border-slate-700 text-slate-300 text-[11px] font-bold rounded-full">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-slate-600 text-xs">© 2026 DSLMS Rwanda · All rights reserved</p>
        </div>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40">
              <School size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm">Driving School LMS</p>
              <p className="text-slate-500 text-[10px] font-semibold">Rwanda Portal</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-white">Welcome back</h2>
            <p className="text-slate-400 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* ── Offline Banner ── */}
            {isOffline && (
              <div className="flex items-center gap-3 px-4 py-3.5 bg-amber-500/10 border border-amber-500/40 rounded-2xl">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <WifiOff size={15} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-amber-300 text-xs font-bold leading-tight">No Internet Connection</p>
                  <p className="text-amber-400/70 text-[11px] mt-0.5">You are currently offline. Sign-in requires internet access.</p>
                </div>
                <span className="ml-auto flex-shrink-0 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl animate-in fade-in slide-in-from-top-1">
                <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-rose-300 text-xs font-semibold leading-snug">{error}</p>
              </div>
            )}


            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-xs font-bold text-slate-300">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-xs font-bold text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 bg-slate-900 border border-slate-700 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={submitting || !email || !password || isOffline}
              className={`w-full flex items-center justify-center gap-2 py-3 px-6 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-extrabold rounded-2xl transition-all shadow-lg active:scale-[.98] ${
                isOffline
                  ? 'bg-slate-700 border border-slate-600 shadow-none'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30 hover:shadow-blue-500/40'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : isOffline ? (
                <>
                  <WifiOff size={15} />
                  No Internet
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Help text */}
          <p className="text-center text-slate-600 text-xs mt-8">
            Trouble signing in? Contact your{' '}
            <span className="text-slate-400 font-semibold">system administrator</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
