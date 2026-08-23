import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const roleHome: Record<string, string> = {
  super_admin: '/admin', school_admin: '/school', teacher: '/teacher', student: '/student',
};

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const { session, profile, loading, refreshProfile } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) return null;
  if (!session || !profile) return <Navigate to="/login" replace />;
  if (!profile.must_change_password) return <Navigate to={roleHome[profile.role]} replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirmation) return setError('The passwords do not match.');
    setSubmitting(true);

    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) {
      setError(passwordError.message);
      setSubmitting(false);
      return;
    }

    const { error: profileError } = await supabase.from('profiles').update({ must_change_password: false }).eq('id', session.user.id);
    if (profileError) {
      setError('Your password was changed, but we could not complete account activation. Please sign in again.');
      setSubmitting(false);
      return;
    }

    await refreshProfile();
    navigate(roleHome[profile.role], { replace: true });
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center"><KeyRound className="text-white" size={22} /></div>
        <div><h1 className="text-2xl font-black text-white">Set your new password</h1><p className="text-sm text-slate-400 mt-1">For your security, replace the temporary password before continuing.</p></div>
        {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">{error}</p>}
        <label className="block text-xs font-bold text-slate-300">New password
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-blue-500" required />
        </label>
        <label className="block text-xs font-bold text-slate-300">Confirm new password
          <input type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-blue-500" required />
        </label>
        <button disabled={submitting} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-extrabold text-white disabled:opacity-60">{submitting ? <span className="flex justify-center gap-2"><Loader2 className="animate-spin" size={16} />Saving…</span> : <span className="flex justify-center gap-2"><ShieldCheck size={16} />Save password</span>}</button>
      </form>
    </main>
  );
}
