import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface PageLayoutProps {
  role: 'super_admin' | 'school_admin' | 'teacher' | 'student';
  userName: string;
  userRole: string;
  children: React.ReactNode;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default function PageLayout({ role, userName, userRole, children }: PageLayoutProps) {
  const avatarInitials = userName ? getInitials(userName) : '?';

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} userName={userName} avatarInitials={avatarInitials} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar userName={userName} userRole={userRole} avatarInitials={avatarInitials} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
