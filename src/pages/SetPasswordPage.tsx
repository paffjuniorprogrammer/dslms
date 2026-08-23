import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { KeyRound, Loader2, ShieldCheck, Eye, EyeOff, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const roleHome: Record<string, string> = {
  super_admin: '/admin',
  school_admin: '/school',
  teacher: '/teacher',
  student: '/student',
};

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const { session, profile, loading, refreshProfile } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) return null;
  if (!session || !profile) return <Navigate to="/login" replace />;
  if (!profile.must_change_password) return <Navigate to={roleHome[profile.role] || '/student'} replace />;

  const isMinLength = password.length >= 6;
  const isMatch = password.length > 0 && password === confirmation;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 6) {
      return setError('Password must contain at least 6 characters.');
    }
    if (password !== confirmation) {
      return setError('The passwords do not match. Please re-enter.');
    }

    setSubmitting(true);

    // Update Supabase Auth user password
    const { error: passwordError } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });

    if (passwordError) {
      setError(passwordError.message);
      setSubmitting(false);
      return;
    }

    // Update profiles table must_change_password flag
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', session.user.id);

    if (profileError) {
      setError('Password was updated, but we could not finalize activation. Please sign in again.');
      setSubmitting(false);
      return;
    }

    await refreshProfile();
    navigate(roleHome[profile.role] || '/student', { replace: true });
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <KeyRound className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Create New Password</h1>
              <p className="text-xs text-slate-400 mt-0.5">Welcome, {profile.full_name || 'Student'}!</p>
            </div>
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Lock size={14} className="text-blue-400" /> First-Time Security Requirement
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Your driving school created your account with a temporary password. Please set your own secure password to continue.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300 flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-colors pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmation ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-colors pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmation(!showConfirmation)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  {showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password Validation Checklist */}
            <div className="space-y-1.5 pt-1 text-[11px]">
              <div className={`flex items-center gap-1.5 ${isMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                <CheckCircle2 size={13} className={isMinLength ? 'text-emerald-400' : 'text-slate-600'} />
                <span>At least 6 characters long</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isMatch ? 'text-emerald-400' : 'text-slate-500'}`}>
                <CheckCircle2 size={13} className={isMatch ? 'text-emerald-400' : 'text-slate-600'} />
                <span>Passwords match</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !isMinLength || !isMatch}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-extrabold text-white hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Saving New Password...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Save Password & Continue to Portal</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
