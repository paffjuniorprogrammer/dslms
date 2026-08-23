import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users, GraduationCap, Video, FileText, Award, BarChart3,
  Search, ShieldCheck, CheckCircle2, Play,
  Sparkles, Building2, UserPlus, Phone, Mail, ChevronRight,
  TrendingUp, X, Eye, Edit3, Key, Power, Trash2, Send, RotateCcw
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import { type Student } from '@/data/studentsData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Teacher {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

interface StudentRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  license_category: string | null;
  status: 'active' | 'completed' | 'dropped';
  enrollment_date: string | null;
  created_at: string;
}

interface TeacherCredentials {
  email: string;
  password: string;
}

export default function SchoolAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'classes'>('overview');

  // Sync tab with URL
  useEffect(() => {
    if (location.pathname.includes('/school/teachers')) setActiveTab('teachers');
    else if (location.pathname.includes('/school/students')) setActiveTab('students');
    else if (location.pathname.includes('/school/classes') || location.pathname.includes('/school/live-classes')) setActiveTab('classes');
    else if (location.pathname === '/school') setActiveTab('overview');
  }, [location.pathname]);

  // Search and filter state
  const [studentSearch, setStudentSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter] = useState('all');

  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState('all');

  // Drawer and Detail state
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Modal states
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showQuickExamModal, setShowQuickExamModal] = useState(false);
  const [generatedExamCode, setGeneratedExamCode] = useState<string | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Teacher state
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [newTeacherCategory, setNewTeacherCategory] = useState('Category B (Car) & Theory');
  const [newTeacherAccount, setNewTeacherAccount] = useState<TeacherCredentials | null>(null);

  // Student state
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentNin, setNewStudentNin] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [newStudentCategory, setNewStudentCategory] = useState('Category B (Car)');
  const [provisioning, setProvisioning] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchSchoolData = useCallback(async () => {
    if (!profile?.school_id) return;

    const [{ data: teachers, error: teachersError }, { data: students, error: studentsError }] = await Promise.all([
      supabase
        .from('teachers')
        .select('id, full_name, email, phone, specialization, status, created_at')
        .eq('school_id', profile.school_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('students')
        .select('id, full_name, email, phone, license_category, status, enrollment_date, created_at')
        .eq('school_id', profile.school_id)
        .order('created_at', { ascending: false }),
    ]);

    if (teachersError) {
      console.error('Failed to load teachers:', teachersError.message);
    } else {
      setTeachersList(teachers as Teacher[]);
    }

    if (studentsError) {
      console.error('Failed to load students:', studentsError.message);
    } else {
      setStudentsList((students as unknown as StudentRow[]).map((student) => ({
        id: student.id,
        name: student.full_name,
        nin: student.id,
        email: student.email ?? '',
        phone: student.phone ?? '',
        category: student.license_category ? `Cat ${student.license_category} (${student.license_category === 'A' ? 'Motorcycle' : student.license_category === 'B' ? 'Car' : student.license_category === 'C' ? 'Truck' : student.license_category === 'D' ? 'Bus' : 'Trailer'})` as Student['category'] : 'Cat B (Car)',
        registrationDate: student.enrollment_date ?? student.created_at.split('T')[0],
        schoolName: profile?.school_id ?? 'Current School',
        status: student.status === 'completed' ? 'Completed' : student.status === 'dropped' ? 'Suspended' : 'Active',
        avatar: student.full_name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
        gender: 'Male',
        address: '',
      })));
    }
  }, [profile]);

  useEffect(() => {
    void fetchSchoolData();
  }, [fetchSchoolData]);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeacherEmail.trim()) return;
    setProvisioning(true);
    const { data, error } = await supabase.functions.invoke('provision-user', {
      body: { type: 'teacher', fullName: newTeacherName.trim(), email: newTeacherEmail.trim(), phone: newTeacherPhone.trim(), specialization: newTeacherCategory },
    });
    setProvisioning(false);
    if (error || data?.error) { triggerToast(data?.error || error?.message || 'Could not create teacher account.'); return; }

    const teacher: Teacher = {
      id: data.publicId,
      full_name: newTeacherName.trim(),
      email: newTeacherEmail.trim(),
      phone: newTeacherPhone.trim() || null,
      specialization: newTeacherCategory,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    setTeachersList([teacher, ...teachersList]);
    setShowAddTeacherModal(false);
    setNewTeacherName('');
    setNewTeacherEmail('');
    setNewTeacherPhone('');
    setNewTeacherAccount({ email: teacher.email, password: data.temporaryPassword });
    triggerToast(`👨‍🏫 Teacher ${teacher.full_name} successfully registered!`);
  };

  const handleToggleTeacherStatus = async (teacherId: string, currentStatus: 'active' | 'inactive') => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('teachers')
      .update({ status: nextStatus })
      .eq('id', teacherId);

    if (error) {
      triggerToast(`⚠️ Failed to update status: ${error.message}`);
    } else {
      setTeachersList(prev => prev.map(t => t.id === teacherId ? { ...t, status: nextStatus } : t));
      if (selectedTeacher?.id === teacherId) {
        setSelectedTeacher(prev => prev ? { ...prev, status: nextStatus } : null);
      }
      triggerToast(`👨‍🏫 Teacher account status updated to ${nextStatus === 'active' ? 'Active' : 'Suspended'}`);
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!window.confirm('Are you sure you want to remove this teacher?')) return;
    const { error } = await supabase.from('teachers').delete().eq('id', teacherId);
    if (error) {
      triggerToast(`⚠️ Error deleting teacher: ${error.message}`);
    } else {
      setTeachersList(prev => prev.filter(t => t.id !== teacherId));
      if (selectedTeacher?.id === teacherId) setSelectedTeacher(null);
      triggerToast('🗑️ Teacher removed successfully.');
    }
  };

  const handleEditTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    const { error } = await supabase
      .from('teachers')
      .update({
        full_name: editingTeacher.full_name,
        email: editingTeacher.email,
        phone: editingTeacher.phone,
        specialization: editingTeacher.specialization,
      })
      .eq('id', editingTeacher.id);

    if (error) {
      triggerToast(`⚠️ Update error: ${error.message}`);
    } else {
      setTeachersList(prev => prev.map(t => t.id === editingTeacher.id ? editingTeacher : t));
      if (selectedTeacher?.id === editingTeacher.id) setSelectedTeacher(editingTeacher);
      setEditingTeacher(null);
      triggerToast(`✨ Teacher details for ${editingTeacher.full_name} updated!`);
    }
  };

  const handleResetTeacherPassword = async (email: string) => {
    setProvisioning(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-user', {
        body: { action: 'reset_password', email },
      });
      if (error || data?.error) {
        triggerToast(`⚠️ Password reset failed: ${data?.error || error?.message}`);
        return;
      }
      setNewTeacherAccount({ email, password: data.temporaryPassword });
      triggerToast(`🔑 Temporary password for ${email} reset to ${data.temporaryPassword}`);
    } catch (err: any) {
      triggerToast(`⚠️ Password reset failed: ${err.message}`);
    } finally {
      setProvisioning(false);
    }
  };

  const handleSendResetEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`,
      });
      if (error) {
        triggerToast(`⚠️ Could not send reset email: ${error.message}`);
      } else {
        triggerToast(`📧 Password reset instructions emailed to ${email}`);
      }
    } catch (err: any) {
      triggerToast(`⚠️ Could not send reset email: ${err.message}`);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentNin.trim() || !newStudentEmail.trim()) return;
    setProvisioning(true);
    const { data, error } = await supabase.functions.invoke('provision-user', {
      body: {
        type: 'student',
        fullName: newStudentName.trim(),
        email: newStudentEmail.trim(),
        phone: newStudentPhone.trim() || null,
        licenseCategory: newStudentCategory,
      },
    });
    setProvisioning(false);
    if (error || data?.error) { triggerToast(data?.error || error?.message || 'Could not create student account.'); return; }

    const newSt: Student = {
      id: data.publicId,
      name: newStudentName.trim(),
      nin: newStudentNin.trim(),
      phone: newStudentPhone.trim() || '+250 788 123 789',
      category: newStudentCategory as Student['category'],
      enrollmentDate: new Date().toISOString().split('T')[0],
      registrationDate: new Date().toISOString().split('T')[0],
      email: newStudentEmail.trim(),
      avatar: newStudentName.trim().split(/\s+/).map(name => name[0]).join('').slice(0, 2).toUpperCase(),
      gender: 'Male',
      address: 'Kigali, Rwanda',
      status: 'Active',
      theoryProgressPercent: 0,
      practicalProgressPercent: 0,
      examStatus: 'Not Started',
      paymentStatus: 'Paid',
      certificateStatus: 'Not Issued',
      schoolName: 'Kigali International Driving Academy'
    };

    setStudentsList([newSt, ...studentsList]);
    setShowAddStudentModal(false);
    setNewStudentName('');
    setNewStudentNin('');
    setNewStudentPhone('');
    setNewStudentEmail('');
    setNewStudentPassword('');
    if (data.temporaryPassword) {
      setNewTeacherAccount({ email: newStudentEmail.trim(), password: data.temporaryPassword });
    }
    triggerToast(`🎓 Student ${newSt.name} enrolled with temporary password!`);
  };

  const handleResetStudentPassword = async (email: string) => {
    setProvisioning(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-user', {
        body: { action: 'reset_password', type: 'student', email },
      });
      if (error || data?.error) {
        triggerToast(`⚠️ Password reset failed: ${data?.error || error?.message}`);
        return;
      }
      setNewTeacherAccount({ email, password: data.temporaryPassword });
      triggerToast(`🔑 Temporary password for ${email} reset to ${data.temporaryPassword}`);
    } catch (err: any) {
      triggerToast(`⚠️ Password reset failed: ${err.message}`);
    } finally {
      setProvisioning(false);
    }
  };

  const handleGenerateExamCode = () => {
    const code = `PHYS-${Math.floor(1000 + Math.random() * 9000)}`;
    setGeneratedExamCode(code);
    triggerToast(`⚡ Physical Exam Code "${code}" generated!`);
  };

  // Filtered Teachers
  const filteredTeachers = teachersList.filter(t => {
    const matchesSearch =
      t.full_name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      t.email.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      (t.phone ?? '').includes(teacherSearch);
    const matchesStatus =
      teacherStatusFilter === 'all' ||
      (teacherStatusFilter === 'active' && t.status === 'active') ||
      (teacherStatusFilter === 'inactive' && t.status === 'inactive');

    return matchesSearch && matchesStatus;
  });

  // Filtered Students
  const filteredStudents = studentsList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.nin.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || s.category.includes(categoryFilter);
    const matchesStatus = statusFilter === 'all' || s.examStatus === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2"><X size={16} /></button>
        </div>
      )}

      {/* Top Banner: School Name & Quick Controls */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 sm:p-7 shadow-xl shadow-slate-300/50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-blue-600/30 flex-shrink-0">
            <Building2 size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 font-extrabold text-[11px] border border-emerald-400/30 flex items-center gap-1">
                <ShieldCheck size={12} /> Verified Driving Academy
              </span>
              <span className="text-xs text-slate-400 font-medium">Licence No: NLA/RDA-CERT/2024/0942</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Kigali International Driving Academy</h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Managed by <strong className="text-white">Karenzi Eric (School Admin)</strong> • 240 Active Seats • Premium Enterprise Plan
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAddStudentModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20"
          >
            <UserPlus size={16} />
            <span>Enroll Student</span>
          </button>

          <button
            onClick={() => setShowAddTeacherModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm border border-slate-700"
          >
            <Users size={16} />
            <span>Add Teacher</span>
          </button>

          <button
            onClick={() => setShowQuickExamModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
          >
            <Sparkles size={16} />
            <span>Issue Exam Code</span>
          </button>
        </div>
      </div>

      {/* Credentials Banner */}
      {newTeacherAccount && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-xs text-slate-700 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900">New teacher credentials created</p>
              <p className="text-slate-600 text-[11px]">Share these login details securely with the instructor.</p>
            </div>
            <button onClick={() => setNewTeacherAccount(null)} className="text-slate-500 hover:text-slate-700 text-xs font-bold">Dismiss</button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-slate-800">
            <div className="rounded-2xl bg-white px-4 py-2 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Email</span>
              <span className="font-mono text-xs font-black">{newTeacherAccount.email}</span>
            </div>
            <div className="rounded-2xl bg-white px-4 py-2 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Temporary Password</span>
              <span className="font-mono text-xs font-black text-blue-600">{newTeacherAccount.password}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold text-slate-600">
        {[
          { id: 'overview', label: '🏠 School Overview', path: '/school' },
          { id: 'teachers', label: `👨‍🏫 Teachers Directory (${teachersList.length})`, path: '/school/teachers' },
          { id: 'students', label: `👨‍🎓 Student Roster (${studentsList.length})`, path: '/school/students' },
          { id: 'classes', label: '💻 Live & Physical Classes', path: '/school/classes' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as typeof activeTab);
              navigate(tab.path);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white font-extrabold shadow-md shadow-blue-600/20'
                : 'hover:bg-white hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 6 Core Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              title="Active Students"
              value={studentsList.length.toString()}
              change="+14% this month"
              changeType="increase"
              icon={<GraduationCap size={20} className="text-blue-600" />}
            />
            <StatCard
              title="Registered Teachers"
              value={teachersList.length.toString()}
              change="Instructors"
              changeType="neutral"
              icon={<Users size={20} className="text-emerald-600" />}
            />
            <StatCard
              title="Classes Today"
              value="6 Classes"
              change="2 Live Now"
              changeType="increase"
              icon={<Video size={20} className="text-purple-600" />}
            />
            <StatCard
              title="Exam Pass Rate"
              value="91.2%"
              change="+3.4% vs Nat. Avg"
              changeType="increase"
              icon={<Award size={20} className="text-amber-600" />}
            />
            <StatCard
              title="Certificates Issued"
              value="184"
              change="Verified & Printed"
              changeType="neutral"
              icon={<FileText size={20} className="text-indigo-600" />}
            />
            <StatCard
              title="Monthly Revenue"
              value="4.2M RWF"
              change="96% Paid Rate"
              changeType="increase"
              icon={<TrendingUp size={20} className="text-teal-600" />}
            />
          </div>

          {/* Quick Shortcuts & Live Class Status Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Video size={16} className="text-blue-600" /> Today's Live & Physical Schedule
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Classes running at Kigali Academy today</p>
                </div>
                <button
                  onClick={() => navigate('/school/live-classes')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View All Streams <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  { id: '1', title: 'Priority & Right of Way Masterclass', type: 'Live Stream', code: 'LIVE-7049', teacher: 'Teacher Eric Mugisha', time: '10:00 AM - 11:30 AM', status: 'Live Now', enrolled: 24 },
                  { id: '2', title: 'Traffic Signs & Road Markings Exam', type: 'Physical Exam', code: 'PHYS-8842', teacher: 'Teacher Chantal Akimana', time: '02:00 PM - 03:00 PM', status: 'Upcoming', enrolled: 30 },
                  { id: '3', title: 'Vehicle Mechanics & Light Controls', type: 'Live Stream', code: 'LIVE-9102', teacher: 'Teacher Jean Claude Uwimana', time: '04:00 PM - 05:00 PM', status: 'Upcoming', enrolled: 18 },
                ].map((cls) => (
                  <div key={cls.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          cls.status === 'Live Now' ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {cls.status}
                        </span>
                        <span className="font-mono text-slate-400 text-[11px]">{cls.code}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm">{cls.title}</h3>
                      <p className="text-slate-500 text-[11px]">{cls.teacher} • {cls.time}</p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[11px] font-semibold text-slate-600">{cls.enrolled} Enrolled</span>
                      <button
                        onClick={() => navigate('/school/live-classes')}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-all flex items-center gap-1"
                      >
                        <Play size={12} /> Launch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* School Seat Capacity & Subscription Status Widget */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-5 border border-blue-500/30">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-[11px] border border-emerald-400/30">
                  Active Subscription
                </span>
                <span className="text-xs text-slate-400 font-mono">Renews Dec 2026</span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Enterprise Driving Academy Plan</h3>
                <p className="text-xs text-slate-300 mt-1">Unlimited theory exams, live streams, and official certificate printing.</p>
              </div>

              <div className="space-y-2 bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Active Student Seats Used</span>
                  <span className="text-emerald-400 font-bold">240 / 300 Seats (80%)</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full w-[80%] rounded-full" />
                </div>
                <p className="text-[10px] text-slate-400 pt-1">60 remaining seats available for new enrollment.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEACHERS DIRECTORY (Full Data Table & Action Controls) */}
      {activeTab === 'teachers' && (
        <div className="space-y-6">
          {/* Top Bar Controls */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Instructors & Teaching Staff</h2>
              <p className="text-xs text-slate-500 mt-0.5">Click any teacher row to view full credentials, manage status, or reset credentials</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Search name, email, or phone..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <select
                value={teacherStatusFilter}
                onChange={(e) => setTeacherStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Instructors</option>
                <option value="inactive">Suspended / Inactive</option>
              </select>

              <button
                onClick={() => setShowAddTeacherModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-all shadow-md shadow-blue-600/20"
              >
                <UserPlus size={15} /> Add New Teacher
              </button>
            </div>
          </div>

          {/* Teacher Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold tracking-wider uppercase">
                    <th className="py-3.5 px-4">Instructor Name & Code</th>
                    <th className="py-3.5 px-4">Email & Phone</th>
                    <th className="py-3.5 px-4">Specialization</th>
                    <th className="py-3.5 px-4">Registration Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-bold text-xs">
                        {teachersList.length === 0 ? 'No teachers registered in this school yet.' : 'No instructors match your search.'}
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((tch) => {
                      const initials = tch.full_name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
                      const isActive = tch.status === 'active';

                      return (
                        <tr
                          key={tch.id}
                          onClick={() => setSelectedTeacher(tch)}
                          className="hover:bg-slate-50/80 transition-all cursor-pointer group"
                        >
                          {/* Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs flex-shrink-0">
                                {initials}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                                  {tch.full_name}
                                </p>
                                <p className="text-[11px] text-slate-400 font-mono">ID: {tch.id.slice(0, 8)}…</p>
                              </div>
                            </div>
                          </td>

                          {/* Email & Phone */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-800 flex items-center gap-1">
                                <Mail size={12} className="text-slate-400" /> {tch.email}
                              </div>
                              <div className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                                <Phone size={12} className="text-slate-400" /> {tch.phone ?? 'N/A'}
                              </div>
                            </div>
                          </td>

                          {/* Specialty */}
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px]">
                              {tch.specialization ?? 'General Driving Instructor'}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-slate-500 font-mono">
                            {new Date(tch.created_at).toLocaleDateString('en-GB')}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] uppercase tracking-wider ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {isActive ? 'Active' : 'Suspended'}
                            </span>
                          </td>

                          {/* Quick Action Buttons */}
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedTeacher(tch)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>

                              <button
                                onClick={() => setEditingTeacher(tch)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all"
                                title="Edit Teacher"
                              >
                                <Edit3 size={16} />
                              </button>

                              <button
                                onClick={() => handleResetTeacherPassword(tch.email)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-all"
                                title="Reset Password"
                              >
                                <Key size={16} />
                              </button>

                              <button
                                onClick={() => handleToggleTeacherStatus(tch.id, tch.status)}
                                className={`p-1.5 rounded-lg transition-all ${
                                  isActive ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={isActive ? 'Suspend Teacher' : 'Activate Teacher'}
                              >
                                <Power size={16} />
                              </button>

                              <button
                                onClick={() => handleDeleteTeacher(tch.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                title="Delete Teacher"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STUDENT ROSTER FULL VIEW */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg">Full Trainee Roster</h2>
              <p className="text-xs text-slate-500">Manage all registered driving school students</p>
            </div>
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20"
            >
              <UserPlus size={16} /> Enroll New Trainee
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="p-3">Student Name</th>
                  <th className="p-3">National ID (NIN)</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Theory Score</th>
                  <th className="p-3">Exam Status</th>
                  <th className="p-3">Certificate</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {studentsList.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50 transition-all">
                    <td className="p-3 font-bold text-slate-900">{st.name}</td>
                    <td className="p-3 font-mono text-slate-600">{st.nin}</td>
                    <td className="p-3 font-semibold text-slate-800">{st.category}</td>
                    <td className="p-3 font-bold text-blue-600">{st.theoryProgressPercent}%</td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                        {st.examStatus}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-600">{st.certificateStatus}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => navigate('/school/certificates', { state: { selectedStudentId: st.id } })}
                        className="px-3 py-1 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-[11px] transition-all"
                      >
                        Certificate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TEACHER DETAILS SLIDING SIDE DRAWER */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end" onClick={() => setSelectedTeacher(null)}>
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl p-6 space-y-6 overflow-y-auto animate-in slide-in-from-right duration-200 border-l border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[11px] border border-blue-200 uppercase tracking-wider">
                Instructor Details
              </span>
              <button onClick={() => setSelectedTeacher(null)} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {/* Profile Avatar & Info */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                {selectedTeacher.full_name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-slate-900 text-lg">{selectedTeacher.full_name}</h3>
                <p className="text-xs text-blue-700 font-bold">{selectedTeacher.specialization ?? 'General Instructor'}</p>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  selectedTeacher.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedTeacher.status}
                </span>
              </div>
            </div>

            {/* Detail Fields */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl space-y-2">
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500 font-semibold">Teacher ID:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedTeacher.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500 font-semibold">Email:</span>
                  <span className="font-bold text-slate-900">{selectedTeacher.email}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500 font-semibold">Phone Number:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedTeacher.phone ?? 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Joined Date:</span>
                  <span className="font-mono font-bold text-slate-900">{new Date(selectedTeacher.created_at).toLocaleDateString('en-GB')}</span>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-center">
                  <span className="text-[10px] text-blue-700 font-bold uppercase block">Classes Conducted</span>
                  <span className="text-xl font-black text-blue-900">12 Classes</span>
                </div>
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl text-center">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Enrolled Students</span>
                  <span className="text-xl font-black text-emerald-900">45 Trainees</span>
                </div>
              </div>
            </div>

            {/* Action Buttons inside Drawer */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Administrative Actions</p>

              <button
                onClick={() => setEditingTeacher(selectedTeacher)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs transition-all"
              >
                <span className="flex items-center gap-2"><Edit3 size={15} className="text-amber-600" /> Edit Instructor Details</span>
                <ChevronRight size={14} className="text-slate-400" />
              </button>

              <button
                onClick={() => handleResetTeacherPassword(selectedTeacher.email)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs transition-all"
              >
                <span className="flex items-center gap-2"><Key size={15} className="text-purple-600" /> Reset Teacher Password</span>
                <ChevronRight size={14} className="text-slate-400" />
              </button>

              <button
                onClick={() => handleSendResetEmail(selectedTeacher.email)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs transition-all"
              >
                <span className="flex items-center gap-2"><Send size={15} className="text-blue-600" /> Send Password Reset Email</span>
                <ChevronRight size={14} className="text-slate-400" />
              </button>

              <button
                onClick={() => handleToggleTeacherStatus(selectedTeacher.id, selectedTeacher.status)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border font-bold text-xs transition-all ${
                  selectedTeacher.status === 'active'
                    ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-900'
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Power size={15} /> {selectedTeacher.status === 'active' ? 'Suspend Teacher Account' : 'Reactivate Teacher Account'}
                </span>
                <ChevronRight size={14} />
              </button>

              <button
                onClick={() => handleDeleteTeacher(selectedTeacher.id)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/20 mt-2"
              >
                <span className="flex items-center gap-2"><Trash2 size={15} /> Delete Teacher Record</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TEACHER MODAL */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Edit3 size={18} className="text-amber-600" /> Edit Instructor Profile
              </h3>
              <button onClick={() => setEditingTeacher(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleEditTeacherSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingTeacher.full_name}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, full_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editingTeacher.email}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, email: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editingTeacher.phone ?? ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, phone: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Specialization / License Category</label>
                <input
                  type="text"
                  value={editingTeacher.specialization ?? ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, specialization: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD TEACHER */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Register School Teacher</h3>
                <p className="text-xs text-slate-500">Add an instructor to your school</p>
              </div>
              <button onClick={() => setShowAddTeacherModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleAddTeacher} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newTeacherName}
                  onChange={e => setNewTeacherName(e.target.value)}
                  placeholder="e.g. Teacher Patrick Habimana"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newTeacherEmail}
                    onChange={e => setNewTeacherEmail(e.target.value)}
                    placeholder="p.habimana@kigalidriving.rw"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newTeacherPhone}
                    onChange={e => setNewTeacherPhone(e.target.value)}
                    placeholder="+250 788 123 456"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Teaching Specialty / License Category</label>
                <select
                  value={newTeacherCategory}
                  onChange={e => setNewTeacherCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                >
                  <option value="Category B (Car) & Theory">Category B (Car) & Theory</option>
                  <option value="Category A (Motorcycle) & Signs">Category A (Motorcycle) & Signs</option>
                  <option value="Category C (Truck) & Mechanics">Category C (Truck) & Mechanics</option>
                  <option value="Category D (Bus) & First Aid">Category D (Bus) & First Aid</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provisioning}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-600/20 disabled:opacity-60"
                >
                  {provisioning ? 'Saving…' : 'Save Instructor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ENROLL STUDENT */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Enroll Trainee Student</h3>
                <p className="text-xs text-slate-500">Register new student for driving course</p>
              </div>
              <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  placeholder="e.g. Mugisha Divine"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">National ID Number (NIN) *</label>
                <input
                  type="text"
                  required
                  value={newStudentNin}
                  onChange={e => setNewStudentNin(e.target.value)}
                  placeholder="1199880022334455"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Driving Category</label>
                <select
                  value={newStudentCategory}
                  onChange={e => setNewStudentCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                >
                  <option value="Category B (Car)">Category B (Car)</option>
                  <option value="Category A (Motorcycle)">Category A (Motorcycle)</option>
                  <option value="Category C (Truck)">Category C (Truck)</option>
                  <option value="Category D (Bus)">Category D (Bus)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Student Email Address *</label>
                <input
                  type="email"
                  required
                  value={newStudentEmail}
                  onChange={e => setNewStudentEmail(e.target.value)}
                  placeholder="student@example.rw"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Student Phone Number</label>
                <input
                  type="text"
                  value={newStudentPhone}
                  onChange={e => setNewStudentPhone(e.target.value)}
                  placeholder="+250 788 123 456"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200/60 text-[11px] text-blue-900">
                A temporary password will be automatically generated and displayed upon enrollment.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provisioning}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-600/20 disabled:opacity-60"
                >
                  {provisioning ? 'Enrolling…' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: QUICK EXAM CODE GENERATOR */}
      {showQuickExamModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto font-black">
              <Sparkles size={24} />
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Classroom Exam Access Code</h3>
              <p className="text-xs text-slate-500 mt-1">Generate a 20-question randomized theory exam code for physical classroom projecting.</p>
            </div>

            {generatedExamCode ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Generated Access Code</span>
                <span className="text-3xl font-black font-mono text-emerald-950 tracking-widest">{generatedExamCode}</span>
                <p className="text-[11px] text-emerald-800">Students enter this code in their portal to start the 20-min test.</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Click below to issue instant code</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowQuickExamModal(false);
                  setGeneratedExamCode(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleGenerateExamCode}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md shadow-emerald-600/20 text-xs"
              >
                Generate Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
