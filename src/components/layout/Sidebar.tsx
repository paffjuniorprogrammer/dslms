import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, School, BookOpen, Settings, LogOut,
  Users, User, GraduationCap, Video, FileText, Award, BarChart3, CreditCard, ShieldCheck, Building2
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  role: 'super_admin' | 'school_admin' | 'teacher' | 'student';
  userName: string;
  avatarInitials: string;
  onLogout?: () => void;
}

const superAdminNav: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={18} /> },
  { label: 'Schools', path: '/admin/schools', icon: <School size={18} /> },
  { label: 'Question Bank', path: '/admin/questions', icon: <BookOpen size={18} /> },
  { label: 'Settings', path: '/admin/settings', icon: <Settings size={18} /> },
];

const schoolAdminNav: NavItem[] = [
  { label: 'Dashboard', path: '/school', icon: <LayoutDashboard size={18} /> },
  { label: 'Teachers', path: '/school/teachers', icon: <Users size={18} /> },
  { label: 'Students', path: '/school/students', icon: <GraduationCap size={18} /> },
  { label: 'Live Classes', path: '/school/live-classes', icon: <Video size={18} /> },
  { label: 'Physical Classes', path: '/school/classes', icon: <Building2 size={18} /> },
  { label: 'Exams', path: '/school/exams', icon: <FileText size={18} /> },
  { label: 'Certificates', path: '/school/certificates', icon: <Award size={18} /> },
  { label: 'Reports', path: '/school/reports', icon: <BarChart3 size={18} /> },
  { label: 'Subscription', path: '/school/subscription', icon: <CreditCard size={18} /> },
  { label: 'Settings', path: '/school/settings', icon: <Settings size={18} /> },
];

const teacherNav: NavItem[] = [
  { label: 'Dashboard', path: '/teacher', icon: <LayoutDashboard size={18} /> },
  { label: 'My Classes', path: '/teacher/classes', icon: <BookOpen size={18} /> },
  { label: 'Live Classes', path: '/teacher/live-classes', icon: <Video size={18} /> },
  { label: 'Physical Classes', path: '/teacher/classes', icon: <Building2 size={18} /> },
  { label: 'Exams', path: '/teacher/exams', icon: <FileText size={18} /> },
  { label: 'Students', path: '/teacher/students', icon: <GraduationCap size={18} /> },
  { label: 'Results', path: '/teacher/results', icon: <BarChart3 size={18} /> },
  { label: 'Certificates', path: '/teacher/certificates', icon: <Award size={18} /> },
];

const studentNav: NavItem[] = [
  { label: 'Dashboard', path: '/student', icon: <LayoutDashboard size={18} /> },
  { label: 'Classes & Join', path: '/student/classes', icon: <BookOpen size={18} /> },
  { label: 'My Profile', path: '/student/profile', icon: <User size={18} /> },
];

const navMap = {
  super_admin: superAdminNav,
  school_admin: schoolAdminNav,
  teacher: teacherNav,
  student: studentNav,
};

export default function Sidebar({ role, userName, avatarInitials, onLogout }: SidebarProps) {
  const { t } = useI18n();
  const navItems = navMap[role];

  const labelKeys: Record<string, Parameters<typeof t>[0]> = {
    Dashboard: 'dashboard', Schools: 'schools', 'Question Bank': 'questionBank', Settings: 'settings',
    Teachers: 'teachers', Students: 'students', 'Live Classes': 'liveClasses', 'Physical Classes': 'physicalClasses', Questions: 'questions',
    Exams: 'exams', Certificates: 'certificates', Reports: 'reports', Subscription: 'subscription',
    'My Classes': 'myClasses', Results: 'results', 'Classes & Join': 'classesJoin', 'My Profile': 'profile',
  };

  const roleName =
    role === 'super_admin'
      ? t('superAdmin')
      : role === 'school_admin'
      ? t('schoolAdmin')
      : role === 'teacher'
      ? t('teacher')
      : t('student');

  return (
    <aside className="hidden lg:flex w-64 min-h-screen bg-slate-900 text-white flex-col border-r border-slate-800 flex-shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 font-black text-lg">
            <School size={20} />
          </div>
          <div>
            <div className="font-black text-sm text-white tracking-tight leading-snug">
              Driving School System
            </div>
            <div className="text-[10px] text-blue-400 font-extrabold flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-400" /> Rwanda Portal
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-1">
        <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-3 mb-2">
          {roleName} {t('portal')}
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin' || item.path === '/school' || item.path === '/teacher' || item.path === '/student'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <span className="transition-transform group-hover:scale-110">{item.icon}</span>
            <span>{t(labelKeys[item.label])}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Profile Card & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl mb-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
            {avatarInitials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{userName}</p>
            <p className="text-[10px] text-blue-400 font-semibold truncate">{roleName}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 transition-all"
        >
          <LogOut size={15} />
          <span>{t('logout')}</span>
        </button>
      </div>
    </aside>
  );
}
