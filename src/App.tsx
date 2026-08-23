import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import SetPasswordPage from '@/pages/SetPasswordPage';
import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import SchoolsManagement from '@/pages/SchoolsManagement';
import LiveClassPortal from '@/pages/LiveClassPortal';
import LiveClassRoom from '@/pages/LiveClassRoom';
import QuestionsPage from '@/pages/QuestionsPage';
import StudentsPage from '@/pages/StudentsPage';
import CertificatesPage from '@/pages/CertificatesPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import StudentMobilePortal from '@/pages/StudentMobilePortal';
import PhysicalClassesPage from '@/pages/PhysicalClassesPage';
import SchoolAdminDashboard from '@/pages/SchoolAdminDashboard';
import TeacherDashboard from '@/pages/TeacherDashboard';
import PlaceholderPage from '@/pages/PlaceholderPage';
import ExamsPage from '@/pages/ExamsPage';

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Protected: all role routes sit inside ProtectedRoute → AppLayout */}
      <Route element={<ProtectedRoute />}>
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route element={<AppLayout />}>
          {/* Super Admin */}
          <Route path="/admin" element={<SuperAdminDashboard />} />
          <Route path="/admin/questions" element={<QuestionsPage />} />
          <Route path="/admin/schools" element={<SchoolsManagement />} />
          <Route path="/admin/teachers" element={<PlaceholderPage title="Teachers" description="Manage all teachers across schools" />} />
          <Route path="/admin/students" element={<StudentsPage />} />
          <Route path="/admin/live-classes" element={<LiveClassPortal />} />
          <Route path="/admin/live-class/:id" element={<LiveClassRoom />} />
          <Route path="/admin/exams" element={<QuestionsPage />} />
          <Route path="/admin/certificates" element={<CertificatesPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/subscription" element={<PlaceholderPage title="Subscription" description="Manage platform subscriptions and billing" />} />
          <Route path="/admin/settings" element={<SettingsPage />} />

          {/* School Admin */}
          <Route path="/school" element={<SchoolAdminDashboard />} />
          <Route path="/school/teachers" element={<SchoolAdminDashboard />} />
          <Route path="/school/students" element={<StudentsPage />} />
          <Route path="/school/live-classes" element={<LiveClassPortal />} />
          <Route path="/school/live-class/:id" element={<LiveClassRoom />} />
          <Route path="/school/classes" element={<PhysicalClassesPage />} />
          <Route path="/school/exams" element={<ExamsPage />} />
          <Route path="/school/certificates" element={<CertificatesPage />} />
          <Route path="/school/reports" element={<ReportsPage />} />
          <Route path="/school/subscription" element={<PlaceholderPage title="Subscription" description="Your school's subscription and billing" />} />
          <Route path="/school/settings" element={<SettingsPage />} />

          {/* Teacher */}
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/classes" element={<PhysicalClassesPage />} />
          <Route path="/teacher/live-classes" element={<LiveClassPortal />} />
          <Route path="/teacher/live-class/:id" element={<LiveClassRoom />} />
          <Route path="/teacher/questions" element={<QuestionsPage />} />
          <Route path="/teacher/exams" element={<ExamsPage />} />
          <Route path="/teacher/students" element={<TeacherDashboard />} />
          <Route path="/teacher/results" element={<ReportsPage />} />
          <Route path="/teacher/certificates" element={<CertificatesPage />} />
          <Route path="/teacher/profile" element={<PlaceholderPage title="Profile" description="Your teacher profile" />} />

          {/* Student Portal */}
          <Route path="/student" element={<StudentMobilePortal />} />
          <Route path="/student/classes" element={<StudentMobilePortal />} />
          <Route path="/student/live-class/:id" element={<LiveClassRoom />} />
          <Route path="/student/results" element={<StudentMobilePortal />} />
          <Route path="/student/profile" element={<StudentMobilePortal />} />
          <Route path="/student/certificates" element={<CertificatesPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
