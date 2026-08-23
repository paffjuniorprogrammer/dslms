import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/database';

const roleHome: Record<UserRole, string> = {
  super_admin: '/admin',
  school_admin: '/school',
  teacher: '/teacher',
  student: '/student',
};

const routeRoles: Record<string, UserRole[]> = {
  admin: ['super_admin'],
  school: ['school_admin'],
  teacher: ['teacher'],
  student: ['student'],
};

export default function ProtectedRoute() {
  const location = useLocation();
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center animate-pulse shadow-lg shadow-blue-600/40">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white text-sm font-bold">Loading session…</p>
            <p className="text-slate-500 text-xs mt-0.5">Driving School LMS</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // A valid Supabase session is not enough: every app user must have an active
  // application profile. This also prevents disabled accounts from using routes
  // that were bookmarked before their access was revoked.
  if (!profile || !profile.is_active) {
    return <Navigate to="/login" replace state={{ authError: 'Your account is not active. Please contact your system administrator.' }} />;
  }

  if (profile.must_change_password && location.pathname !== '/set-password') {
    return <Navigate to="/set-password" replace />;
  }

  const section = location.pathname.split('/')[1];
  const allowedRoles = routeRoles[section];
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={roleHome[profile.role]} replace />;
  }

  return <Outlet />;
}
