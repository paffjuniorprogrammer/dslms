import { useNavigate, useLocation, Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, School, Users, Video, FileText, Settings } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const { profile, signOut } = useAuth();

  const roleEnum = profile?.role ?? 'student';
  const userName = profile?.full_name ?? '—';
  const avatarInitials = profile?.full_name ? getInitials(profile.full_name) : '?';
  const userRoleLabel =
    roleEnum === 'super_admin'
      ? 'Super Admin'
      : roleEnum === 'school_admin'
      ? 'School Admin'
      : roleEnum === 'teacher'
      ? 'Teacher'
      : 'Student';

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  // Students get their own full-screen portal without the shell
  if (roleEnum === 'student') {
    return <Outlet />;
  }

  const currentBase = '/' + location.pathname.split('/')[1];

  const mobileItems =
    roleEnum === 'super_admin'
      ? [
          { path: '/admin', label: t('dashboard'), icon: <LayoutDashboard size={18} /> },
          { path: '/admin/schools', label: t('schools'), icon: <School size={18} /> },
          { path: '/admin/questions', label: t('questions'), icon: <FileText size={18} /> },
          { path: '/admin/settings', label: t('settings'), icon: <Settings size={18} /> },
        ]
      : roleEnum === 'school_admin'
      ? [
          { path: '/school', label: t('dashboard'), icon: <LayoutDashboard size={18} /> },
          { path: '/school/teachers', label: t('teachers'), icon: <Users size={18} /> },
          { path: '/school/students', label: t('students'), icon: <School size={18} /> },
          { path: '/school/live-classes', label: t('liveClasses'), icon: <Video size={18} /> },
        ]
      : [
          { path: '/teacher', label: t('dashboard'), icon: <LayoutDashboard size={18} /> },
          { path: '/teacher/students', label: t('students'), icon: <Users size={18} /> },
          { path: '/teacher/live-classes', label: t('liveClasses'), icon: <Video size={18} /> },
          { path: '/teacher/exams', label: t('exams'), icon: <FileText size={18} /> },
        ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <Sidebar
        role={roleEnum as 'super_admin' | 'school_admin' | 'teacher' | 'student'}
        userName={userName}
        avatarInitials={avatarInitials}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          userName={userName}
          userRole={userRoleLabel}
          avatarInitials={avatarInitials}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6 overflow-auto bg-[#f8fafc]">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-2 grid grid-cols-4 gap-1 shadow-[0_-8px_30px_rgba(15,23,42,0.08)]">
        {mobileItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === currentBase}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-xl py-1.5 text-[9px] font-bold ${
                isActive ? 'text-blue-700 bg-blue-50' : 'text-slate-500'
              }`
            }
          >
            {item.icon}
            <span className="max-w-20 truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
