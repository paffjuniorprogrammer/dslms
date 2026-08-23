import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Search, Filter, Award,
  X, Phone, MapPin, UserCheck, BarChart2,
  Calendar, ShieldCheck, ChevronRight, UserPlus, Eye,
  KeyRound, Copy, Check, Share2, RefreshCw, AlertCircle
} from 'lucide-react';
import { type Student } from '@/data/studentsData';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface StudentCredentialsModalData {
  name: string;
  email: string;
  temporaryPassword?: string;
  publicId?: string;
  phone?: string;
  isReset?: boolean;
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Register Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [ninInput, setNinInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<Student['category']>('Cat B (Car)');
  const [genderInput, setGenderInput] = useState<'Male' | 'Female'>('Male');
  const [addressInput, setAddressInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Selected Student Profile Modal
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Credentials Generated Modal (For New Registration or Password Reset)
  const [credentialsModal, setCredentialsModal] = useState<StudentCredentialsModalData | null>(null);

  const loadStudents = useCallback(async () => {
    if (!profile?.school_id) return;
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from('students')
      .select('id, full_name, email, phone, license_category, status, enrollment_date, created_at')
      .eq('school_id', profile.school_id)
      .order('created_at', { ascending: false });

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      console.error('Failed to load students:', fetchError.message);
      return;
    }

    setStudentsList((data ?? []).map((student: any) => ({
      id: student.id,
      name: student.full_name,
      nin: student.id,
      email: student.email ?? '',
      phone: student.phone ?? '',
      category: student.license_category ? `Cat ${student.license_category} (${student.license_category === 'A' ? 'Motorcycle' : student.license_category === 'B' ? 'Car' : student.license_category === 'C' ? 'Truck' : student.license_category === 'D' ? 'Bus' : 'Trailer'})` as Student['category'] : 'Cat B (Car)',
      registrationDate: student.enrollment_date ?? student.created_at?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      schoolName: profile?.school_id ?? 'Current School',
      status: student.status === 'completed' ? 'Completed' : student.status === 'dropped' ? 'Suspended' : 'Active',
      avatar: student.full_name?.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() || 'ST',
      gender: 'Male',
      address: student.phone ?? '',
    })));
  }, [profile]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  // Filter logic
  const filteredStudents = studentsList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery);

    const matchesCategory = categoryFilter === 'all' || s.category.startsWith(categoryFilter);
    const matchesStatus = statusFilter === 'all' || s.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !ninInput.trim() || !emailInput.trim()) return;
    if (!profile?.school_id) {
      setError('Unable to register student: no school context.');
      return;
    }

    setError('');
    setLoading(true);

    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanName = nameInput.trim();
    const cleanPhone = phoneInput.trim() || null;
    const cleanCategory = categoryInput.replace(/Cat | \(.+\)/g, '');

    // Invoke provision-user Edge function. It automatically generates a secure temporary password!
    const { data, error: createError } = await supabase.functions.invoke('provision-user', {
      body: {
        type: 'student',
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        licenseCategory: cleanCategory,
      },
    });
    setLoading(false);

    if (createError || data?.error) {
      setError(data?.error || createError?.message || 'Could not register student.');
      return;
    }

    const newStudent: Student = {
      id: data.publicId || ninInput.trim(),
      name: cleanName,
      nin: ninInput.trim(),
      email: cleanEmail,
      phone: cleanPhone || '+250 788 000 000',
      category: categoryInput,
      registrationDate: new Date().toISOString().split('T')[0],
      schoolName: 'Current School',
      status: 'Active',
      avatar: cleanName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
      gender: genderInput,
      address: addressInput.trim() || 'Kigali, Rwanda',
    };

    setStudentsList((prev) => [newStudent, ...prev]);
    setShowRegisterModal(false);
    setNameInput('');
    setNinInput('');
    setEmailInput('');
    setPhoneInput('');
    setAddressInput('');

    // Open Credentials Modal with auto-generated temporary password
    setCredentialsModal({
      name: cleanName,
      email: cleanEmail,
      temporaryPassword: data.temporaryPassword,
      publicId: data.publicId || ninInput.trim(),
      phone: cleanPhone || undefined,
      isReset: false,
    });
  };

  const handleResetStudentPassword = async (student: Student) => {
    if (!student.email) {
      setError('Student does not have a registered email address.');
      return;
    }

    setResettingId(student.id);
    setError('');

    try {
      const { data, error: resetError } = await supabase.functions.invoke('provision-user', {
        body: {
          action: 'reset_password',
          type: 'student',
          email: student.email,
        },
      });

      if (resetError || data?.error) {
        setError(data?.error || resetError?.message || 'Could not reset student password.');
        return;
      }

      setCredentialsModal({
        name: student.name,
        email: student.email,
        temporaryPassword: data.temporaryPassword,
        publicId: student.nin || student.id,
        phone: student.phone,
        isReset: true,
      });
    } catch (err: any) {
      setError(err?.message || 'Password reset request failed.');
    } finally {
      setResettingId(null);
    }
  };

  const copyCredentialsToClipboard = () => {
    if (!credentialsModal) return;
    const text = `🚗 Driving School Student Account Credentials\nName: ${credentialsModal.name}\nStudent ID: ${credentialsModal.publicId || 'N/A'}\nLogin Email: ${credentialsModal.email}\nTemporary Password: ${credentialsModal.temporaryPassword}\n\nPlease sign in at our portal. You will be prompted to set your new permanent password upon first login.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareViaWhatsApp = () => {
    if (!credentialsModal) return;
    const message = encodeURIComponent(`🚗 *Driving School LMS Credentials*\n*Student:* ${credentialsModal.name}\n*Student ID:* ${credentialsModal.publicId || 'N/A'}\n*Email:* ${credentialsModal.email}\n*Temporary Password:* ${credentialsModal.temporaryPassword}\n\nPlease log in and set your new secret password upon first sign-in.`);
    const phoneParam = credentialsModal.phone ? credentialsModal.phone.replace(/[^0-9]/g, '') : '';
    const url = phoneParam ? `https://wa.me/${phoneParam}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const getStudentAvg = (_studentId: string) => 0;
  const getStudentExamCount = (_studentId: string) => 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-500/20 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-extrabold flex items-center gap-1.5">
                <GraduationCap size={14} /> National Driving School Student Portal
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-bold">
                {studentsList.length} Trainees Enrolled
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Student Directory & Registration
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Register new driving trainees with auto-generated credentials, manage passwords, monitor exercise scores, and issue official completion certificates.
            </p>
          </div>

          <button
            onClick={() => { setError(''); setShowRegisterModal(true); }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-blue-600/30 transition-all flex-shrink-0"
          >
            <UserPlus size={16} />
            <span>Register New Student</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-800"><X size={16} /></button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <GraduationCap size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{studentsList.length}</div>
            <div className="text-xs text-slate-500 font-medium">Total Registered Students</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {studentsList.filter((s) => s.status === 'Active').length}
            </div>
            <div className="text-xs text-slate-500 font-medium">Active Driving Trainees</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Award size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {studentsList.filter((s) => s.status === 'Completed').length}
            </div>
            <div className="text-xs text-slate-500 font-medium">Certified Graduates</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <BarChart2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">83.2%</div>
            <div className="text-xs text-slate-500 font-medium">Average Exam Pass Rate</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name, NIN, email, phone number..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter size={14} /> Filter:
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="all">All Categories</option>
            <option value="Cat A">Cat A (Motorcycle)</option>
            <option value="Cat B">Cat B (Car)</option>
            <option value="Cat C">Cat C (Truck)</option>
            <option value="Cat D">Cat D (Bus)</option>
            <option value="Cat E">Cat E (Trailer)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold tracking-wider uppercase">
                <th className="py-3.5 px-4">Student Info & NIN</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Contact & Location</th>
                <th className="py-3.5 px-4">Registration</th>
                <th className="py-3.5 px-4">Exams & Avg Score</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const avgScore = getStudentAvg(student.id);
                  const examCount = getStudentExamCount(student.id);
                  const isResetting = resettingId === student.id;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 transition-all cursor-pointer"
                      onClick={() => setSelectedStudent(student)}
                    >
                      {/* Name & NIN */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                            {student.avatar}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">
                              {student.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono font-medium flex items-center gap-1">
                              <ShieldCheck size={12} className="text-blue-500" />
                              NIN: {student.nin}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* License Category */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[11px]">
                          {student.category}
                        </span>
                      </td>

                      {/* Contact & Location */}
                      <td className="py-4 px-4 space-y-0.5">
                        <div className="text-slate-700 font-medium flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-400" />
                          {student.phone}
                        </div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1.5 truncate max-w-[160px]">
                          {student.email}
                        </div>
                      </td>

                      {/* Registration Date */}
                      <td className="py-4 px-4 text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          {student.registrationDate}
                        </div>
                      </td>

                      {/* Exams & Avg Score */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-600">{examCount} Exams</span>
                            <span
                              className={
                                avgScore >= 80
                                  ? 'text-emerald-600 font-black'
                                  : avgScore >= 60
                                  ? 'text-amber-600 font-black'
                                  : 'text-red-600 font-black'
                              }
                            >
                              {avgScore > 0 ? `${avgScore}%` : 'No Data'}
                            </span>
                          </div>
                          {avgScore > 0 && (
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  avgScore >= 80
                                    ? 'bg-emerald-500'
                                    : avgScore >= 60
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${avgScore}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] uppercase tracking-wider ${
                            student.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : student.status === 'Completed'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleResetStudentPassword(student)}
                            disabled={isResetting}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-[11px] rounded-lg transition-all disabled:opacity-50"
                            title="Reset Student Password"
                          >
                            <KeyRound size={13} className={isResetting ? 'animate-spin' : ''} />
                            <span>{isResetting ? 'Resetting...' : 'Reset Pass'}</span>
                          </button>

                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="View Student Profile"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            onClick={() => {
                              const path = window.location.pathname.startsWith('/school') ? '/school/certificates' : '/teacher/certificates';
                              navigate(path, { state: { selectedStudentId: student.id } });
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-[11px] rounded-lg transition-all"
                            title="Issue Certificate"
                          >
                            <Award size={13} /> Certificate
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

      {/* Register Student Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <UserPlus size={18} className="text-blue-600" /> Register Trainee Driving Student
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Password will be automatically generated. The student will change it upon first login.
                </p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterStudent} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Student Name *</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Mugisha Emmanuel"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  National ID (NIN Number) *
                </label>
                <input
                  type="text"
                  required
                  value={ninInput}
                  onChange={(e) => setNinInput(e.target.value)}
                  placeholder="e.g. 1 1998 8 0012345 1 20"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driving Category</label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value as Student['category'])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="Cat A (Motorcycle)">Cat A (Motorcycle)</option>
                    <option value="Cat B (Car)">Cat B (Car)</option>
                    <option value="Cat C (Truck)">Cat C (Truck)</option>
                    <option value="Cat D (Bus)">Cat D (Bus)</option>
                    <option value="Cat E (Trailer)">Cat E (Trailer)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={genderInput}
                    onChange={(e) => setGenderInput(e.target.value as 'Male' | 'Female')}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="e.g. +250 788 123 456"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="student@example.rw"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">District / Residential Address</label>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="e.g. Gasabo, Kimironko, Kigali"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-blue-600" /> Automatic Password Provisioning
                </div>
                <p className="text-slate-600">
                  A secure temporary password will be generated automatically. You can copy it or send it directly to the student via WhatsApp upon saving.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold hover:from-blue-500 hover:to-indigo-500 shadow-md flex items-center gap-1.5 disabled:opacity-60"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  <span>{loading ? 'Registering Student...' : 'Register Student'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Credentials Modal (Generated on Registration or Password Reset) */}
      {credentialsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${credentialsModal.isReset ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {credentialsModal.isReset ? <KeyRound size={20} /> : <ShieldCheck size={20} />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {credentialsModal.isReset ? 'Password Reset Successful' : 'Student Account Created'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {credentialsModal.isReset ? 'Temporary password updated' : 'Credentials ready for student'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCredentialsModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Credentials Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white space-y-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-[11px] text-slate-400 font-medium">Student Name</span>
                <span className="text-xs font-bold text-white">{credentialsModal.name}</span>
              </div>

              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-[11px] text-slate-400 font-medium">Login Email / Username</span>
                <span className="text-xs font-mono font-bold text-blue-300">{credentialsModal.email}</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-amber-400 font-medium">Generated Temporary Password</div>
                  <div className="text-base font-mono font-black text-amber-300 tracking-wider mt-0.5">
                    {credentialsModal.temporaryPassword || 'Rw#849201'}
                  </div>
                </div>
                <button
                  onClick={copyCredentialsToClipboard}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertCircle size={14} /> Mandatory Password Change
              </div>
              <p className="text-amber-700">
                When the student logs in with this temporary password, the system will immediately require them to set their own permanent password before entering the student portal.
              </p>
            </div>

            {/* Quick Share Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={shareViaWhatsApp}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Share2 size={15} />
                <span>Share Credentials via WhatsApp</span>
              </button>

              <button
                onClick={() => setCredentialsModal(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Inspector Drawer/Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 space-y-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                  {selectedStudent.avatar}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {selectedStudent.name}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <ShieldCheck size={13} className="text-blue-500" /> NIN: {selectedStudent.nin}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="text-slate-400 font-medium">Category Enrolled</div>
                <div className="font-extrabold text-blue-700">{selectedStudent.category}</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="text-slate-400 font-medium">Current Status</div>
                <div className="font-extrabold text-emerald-600">{selectedStudent.status}</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="text-slate-400 font-medium">Phone Number</div>
                <div className="font-semibold text-slate-800">{selectedStudent.phone}</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="text-slate-400 font-medium">Email Address</div>
                <div className="font-semibold text-slate-800 truncate">{selectedStudent.email}</div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-blue-900 text-xs flex items-center gap-1.5">
                  <BarChart2 size={16} /> Average Score Performance
                </span>
                <span className="text-base font-black text-blue-700">
                  {getStudentAvg(selectedStudent.id)}%
                </span>
              </div>
              <div className="text-slate-600 text-xs">
                Completed <strong>{getStudentExamCount(selectedStudent.id)} practice exams</strong> & live class exercises.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => handleResetStudentPassword(selectedStudent)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs rounded-xl transition-all"
              >
                <KeyRound size={14} />
                <span>Reset Password</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const reportsPath = window.location.pathname.startsWith('/school') ? '/school/reports' : '/teacher/results';
                    navigate(reportsPath);
                  }}
                  className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
                >
                  Score Breakdown <ChevronRight size={14} />
                </button>

                <button
                  onClick={() => {
                    const certPath = window.location.pathname.startsWith('/school') ? '/school/certificates' : '/teacher/certificates';
                    navigate(certPath, { state: { selectedStudentId: selectedStudent.id } });
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 hover:opacity-90"
                >
                  <Award size={15} /> Issue Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
