import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users, GraduationCap, Video, FileText, Award, BarChart3,
  Search, Calendar, Clock,
  ShieldCheck, CheckCircle2, Play, Download,
  Building2, UserPlus, ChevronRight, TrendingUp, X,
  Lock, Edit3, Printer, Send,
  Monitor, BookMarked, Lightbulb,
  Tv
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import { defaultStudents, type Student } from '@/data/studentsData';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchStudents, fetchLiveClasses, fetchExams, fetchQuestions,
  createLiveClass as createLiveClassDB, createPhysicalClass, createExam as createExamDB,
  fetchTeacherByProfileId, fetchAllPhysicalClassResults,
  type DBStudent, type DBLiveClass, type DBExam, type DBQuestion, type DBPhysicalClassResult
} from '@/lib/db';

// Interfaces for Teacher Portal Data
interface TeacherScheduleItem {
  id: string;
  time: string;
  className: string;
  type: 'Live Stream' | 'Physical Classroom';
  code: string;
  studentsCount: number;
  status: 'Live Now' | 'Upcoming' | 'Completed';
  locationOrUrl: string;
}

interface AssignedStudent extends Student {
  courseExpiry: string;
  completedExamsCount: number;
  avgScore: number;
  highestScore: number;
  lowestScore: number;
  attendanceRate: number;
  passRate: number;
  certificatesCount: number;
  teacherNotes: string;
  examHistory: {
    id: string;
    title: string;
    date: string;
    score: number;
    total: number;
    correct: number;
    wrong: number;
    timeTaken: string;
    status: 'Passed' | 'Failed';
  }[];
}

interface TeacherLiveClass {
  id: string;
  name: string;
  code: string;
  date: string;
  time: string;
  duration: number;
  topic: string;
  category: string;
  studentsJoined: number;
  status: 'Live' | 'Scheduled' | 'Completed';
  attendanceRate: number;
  chatMessagesCount: number;
}

interface TeacherExam {
  id: string;
  title: string;
  code: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  questionsCount: number;
  durationMinutes: number;
  passingScorePercent: number;
  attemptsAllowed: number;
  createdDate: string;
  totalSubmissions: number;
  passedCount: number;
  avgScore: number;
  status: 'Active' | 'Draft' | 'Closed';
}

const initialSchedule: TeacherScheduleItem[] = [
  { id: 'SCH-101', time: '09:00 AM - 10:30 AM', className: 'Category B - Priority Signs & Right of Way', type: 'Live Stream', code: 'LIVE-7049', studentsCount: 28, status: 'Live Now', locationOrUrl: 'Online Room #1' },
  { id: 'SCH-102', time: '11:00 AM - 12:30 PM', className: 'Traffic Signs & Road Markings Masterclass', type: 'Physical Classroom', code: 'PHYS-8842', studentsCount: 35, status: 'Upcoming', locationOrUrl: 'Room 2B - Main Campus' },
  { id: 'SCH-103', time: '02:00 PM - 03:30 PM', className: 'Speed Limits & Highway Overtaking Rules', type: 'Live Stream', code: 'LIVE-9102', studentsCount: 22, status: 'Upcoming', locationOrUrl: 'Online Room #2' },
  { id: 'SCH-104', time: '04:00 PM - 05:00 PM', className: 'Vehicle Mechanics & Light Control Systems', type: 'Physical Classroom', code: 'PHYS-9011', studentsCount: 18, status: 'Upcoming', locationOrUrl: 'Workshop Lab A' },
];

const initialAssignedStudents: AssignedStudent[] = defaultStudents.map((st, idx) => ({
  ...st,
  courseExpiry: '2026-12-31',
  completedExamsCount: 8 + (idx % 4),
  avgScore: 82 + (idx * 3) % 18,
  highestScore: 95 + (idx % 5),
  lowestScore: 65 + (idx % 10),
  attendanceRate: 92 + (idx * 2) % 8,
  passRate: 88 + (idx * 4) % 12,
  certificatesCount: idx % 2 === 0 ? 1 : 0,
  teacherNotes: idx === 0 ? 'Uwase is an exceptional student. She masters priority signs and highway speed regulations with ease.' : 'Regular attendee. Needs minor review on night driving headlight rules.',
  examHistory: [
    { id: 'EX-1', title: 'Official Theory Mock Exam #01', date: '2026-03-02', score: 19, total: 20, correct: 19, wrong: 1, timeTaken: '14 min', status: 'Passed' },
    { id: 'EX-2', title: 'Road Markings & Priority Signs Test', date: '2026-02-28', score: 18, total: 20, correct: 18, wrong: 2, timeTaken: '11 min', status: 'Passed' },
    { id: 'EX-3', title: 'Highway Speed & Overtaking Evaluation', date: '2026-02-24', score: 17, total: 20, correct: 17, wrong: 3, timeTaken: '15 min', status: 'Passed' },
    { id: 'EX-4', title: 'Vehicle Mechanics & Light Controls', date: '2026-02-20', score: 16, total: 20, correct: 16, wrong: 4, timeTaken: '16 min', status: 'Passed' },
  ]
}));

const initialLiveClasses: TeacherLiveClass[] = [
  { id: 'LC-1', name: 'Priority Signs & Right of Way Masterclass', code: 'LIVE-7049', date: 'Today', time: '09:00 AM', duration: 60, topic: 'Article 42 & 45 Traffic Code', category: 'Category B (Car)', studentsJoined: 28, status: 'Live', attendanceRate: 95, chatMessagesCount: 42 },
  { id: 'LC-2', name: 'Speed Limits & Highway Overtaking', code: 'LIVE-9102', date: 'Today', time: '02:00 PM', duration: 45, topic: 'National Speed & Lane Usage', category: 'Category B (Car)', studentsJoined: 22, status: 'Scheduled', attendanceRate: 0, chatMessagesCount: 0 },
  { id: 'LC-3', name: 'Motorcycle Road Rules & Safety Gear', code: 'LIVE-3011', date: 'Yesterday', time: '10:00 AM', duration: 60, topic: 'Two-Wheeler Safety', category: 'Category A (Motorcycle)', studentsJoined: 31, status: 'Completed', attendanceRate: 98, chatMessagesCount: 56 },
];

const initialExams: TeacherExam[] = [
  { id: 'EXAM-1', title: 'National Provisional Driver Theory Exam Bank A', code: 'EXAM-9021', category: 'Category B (Car)', difficulty: 'Intermediate', questionsCount: 20, durationMinutes: 20, passingScorePercent: 60, attemptsAllowed: 2, createdDate: '2026-02-15', totalSubmissions: 42, passedCount: 38, avgScore: 86.4, status: 'Active' },
  { id: 'EXAM-2', title: 'Traffic Signs & Highway Markings Assessment', code: 'EXAM-8810', category: 'Category B (Car)', difficulty: 'Beginner', questionsCount: 15, durationMinutes: 15, passingScorePercent: 60, attemptsAllowed: 3, createdDate: '2026-02-20', totalSubmissions: 55, passedCount: 51, avgScore: 91.0, status: 'Active' },
  { id: 'EXAM-3', title: 'Heavy Vehicle Commercial Driver Safety Test', code: 'EXAM-7702', category: 'Category C (Truck)', difficulty: 'Advanced', questionsCount: 25, durationMinutes: 30, passingScorePercent: 70, attemptsAllowed: 1, createdDate: '2026-02-25', totalSubmissions: 18, passedCount: 15, avgScore: 78.5, status: 'Active' },
];

// Helper Component for QR Code Display
function QRCodeGraphic({ code }: { code: string }) {
  return (
    <div className="w-32 h-32 bg-white p-2 rounded-2xl border border-slate-200 shadow-md flex flex-col items-center justify-center mx-auto">
      <div className="w-full h-full bg-slate-900 rounded-xl p-1.5 flex flex-wrap gap-1 items-center justify-center">
        {/* Mock QR Blocks */}
        <div className="grid grid-cols-5 gap-1 w-full h-full p-1 bg-white rounded-lg">
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-slate-200 rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-white rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-white rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-slate-200 rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-slate-200 rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-white rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-white rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-slate-200 rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
          <div className="bg-slate-900 rounded-xs"></div>
        </div>
      </div>
      <span className="text-[9px] font-mono font-bold text-slate-700 mt-1 truncate">{code}</span>
    </div>
  );
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'live' | 'physical' | 'exams'>('overview');

  // Sync tab with URL query parameter or path if loaded from sidebar
  useEffect(() => {
    if (location.pathname.includes('/teacher/students')) setActiveTab('students');
    else if (location.pathname.includes('/teacher/live-classes')) setActiveTab('live');
    else if (location.pathname.includes('/teacher/classes')) setActiveTab('physical');
    else if (location.pathname.includes('/teacher/exams')) setActiveTab('exams');
  }, [location.pathname]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const { profile } = useAuth();
  const [dbQuestions, setDbQuestions] = useState<DBQuestion[]>([]);

  // State Collections (populated purely from DB)
  const [assignedStudents, setAssignedStudents] = useState<AssignedStudent[]>([]);
  const [liveClasses, setLiveClasses] = useState<TeacherLiveClass[]>([]);
  const [examsList, setExamsList] = useState<TeacherExam[]>([]);
  const [schedule, setSchedule] = useState<TeacherScheduleItem[]>([]);

  // Fetch real data on mount / profile load
  useEffect(() => {
    async function loadData() {
      if (!profile) return;
      try {
        if (profile.school_id) {
          const students = await fetchStudents(profile.school_id);
          setAssignedStudents(students.map((st) => ({
            id: st.id,
            name: st.full_name,
            nin: st.id.slice(0, 10),
            email: st.email || '',
            phone: st.phone || '',
            category: (st.license_category || 'Cat B (Car)') as any,
            gender: 'Female' as const,
            schoolName: profile.full_name || 'Driving School',
            address: '',
            status: st.status === 'active' ? 'Active' : 'Completed',
            registrationDate: st.enrollment_date,
            avatar: '',
            courseExpiry: '2026-12-31',
            completedExamsCount: 0,
            avgScore: 0,
            highestScore: 0,
            lowestScore: 0,
            attendanceRate: 100,
            passRate: 100,
            certificatesCount: 0,
            teacherNotes: '',
            examHistory: []
          })));

          const classes = await fetchLiveClasses(profile.school_id);
          setLiveClasses(classes.map(c => ({
            id: c.id,
            name: c.title,
            code: c.access_code || c.meeting_url || `LIVE-${c.id.slice(0, 4)}`,
            date: c.scheduled_at ? new Date(c.scheduled_at).toLocaleDateString() : 'Today',
            time: c.scheduled_at ? new Date(c.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00 AM',
            duration: c.duration_minutes,
            topic: c.description || c.title,
            category: 'Category B (Car)',
            studentsJoined: 0,
            status: c.status === 'live' ? 'Live' : c.status === 'ended' ? 'Completed' : 'Scheduled',
            attendanceRate: 0,
            chatMessagesCount: 0
          })));

          setSchedule(classes.map(c => ({
            id: c.id,
            time: c.scheduled_at ? new Date(c.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00 AM',
            className: c.title,
            type: c.class_type === 'physical' ? 'Physical Classroom' : 'Live Stream',
            code: c.access_code || c.meeting_url || `CLASS-${c.id.slice(0, 4)}`,
            studentsCount: c.max_students || 30,
            status: c.status === 'live' ? 'Live Now' : c.status === 'ended' ? 'Completed' : 'Upcoming',
            locationOrUrl: c.class_type === 'physical' ? (c.room || 'Main Hall') : 'Online Room'
          })));

          const exams = await fetchExams(profile.school_id);
          setExamsList(exams.map(e => ({
            id: e.id,
            title: e.title,
            code: `EXAM-${e.id.slice(0, 4)}`,
            category: 'Category B (Car)',
            difficulty: 'Intermediate',
            questionsCount: 20,
            durationMinutes: e.duration_minutes,
            passingScorePercent: e.passing_score,
            attemptsAllowed: 2,
            createdDate: e.created_at.split('T')[0],
            totalSubmissions: 0,
            passedCount: 0,
            avgScore: 0,
            status: e.status === 'published' ? 'Active' : 'Draft'
          })));
        }

        const questions = await fetchQuestions();
        setDbQuestions(questions);
      } catch (err) {
        console.error('Error fetching teacher dashboard data:', err);
      }
    }
    loadData();
  }, [profile]);

  // Search & Filters for Students
  const [studentSearch, setStudentSearch] = useState('');
  const [studentCategoryFilter, setStudentCategoryFilter] = useState('all');

  // Selected Student for Drawer
  const [selectedStudent, setSelectedStudent] = useState<AssignedStudent | null>(null);
  const [editedNotes, setEditedNotes] = useState('');

  // Modals State
  const [showStartLiveModal, setShowStartLiveModal] = useState(false);
  const [showOpenPhysicalModal, setShowOpenPhysicalModal] = useState(false);
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [showProjectorModal, setShowProjectorModal] = useState(false);
  const [showExamReviewModal, setShowExamReviewModal] = useState(false);
  const [reviewStudent, setReviewStudent] = useState<AssignedStudent | null>(null);

  // New Live Class Form
  const [newLiveName, setNewLiveName] = useState('');
  const [newLiveTopic, setNewLiveTopic] = useState('');
  const [newLiveCategory, setNewLiveCategory] = useState('Category B (Car)');
  const [newLiveDuration, setNewLiveDuration] = useState('60');
  const [generatedLiveCode, setGeneratedLiveCode] = useState<string | null>(null);

  // New Physical Class Form
  const [physicalMaxStudents, setPhysicalMaxStudents] = useState('40');
  const [generatedPhysicalCode, setGeneratedPhysicalCode] = useState<string | null>(null);

  // New Exam Form
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamCategory] = useState('Category B (Car)');
  const [newExamQuestionsCount, setNewExamQuestionsCount] = useState('20');
  const [newExamDuration, setNewExamDuration] = useState('20');
  const [newExamPassingScore, setNewExamPassingScore] = useState('60');
  const [generatedExamCode, setGeneratedExamCode] = useState<string | null>(null);

  // Live Class Monitoring Active State
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Physical Class Interactive Presenter Index
  const [presenterQIndex, setPresenterQIndex] = useState(0);
  const [presenterShowAnswer, setPresenterShowAnswer] = useState(false);

  // Filtered Students
  const filteredStudents = assignedStudents.filter(st => {
    const matchesSearch = st.name.toLowerCase().includes(studentSearch.toLowerCase()) || st.nin.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesCategory = studentCategoryFilter === 'all' || st.category.includes(studentCategoryFilter);
    return matchesSearch && matchesCategory;
  });

  const handleSaveNotes = () => {
    if (!selectedStudent) return;
    setAssignedStudents(assignedStudents.map(s => s.id === selectedStudent.id ? { ...s, teacherNotes: editedNotes } : s));
    setSelectedStudent({ ...selectedStudent, teacherNotes: editedNotes });
    triggerToast(`📝 Teacher notes updated for ${selectedStudent.name}!`);
  };

  const handleSendResetEmail = (studentName: string) => {
    triggerToast(`🔑 Password reset link emailed to ${studentName}!`);
  };

  const handleCreateLiveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.school_id) return;
    const code = `LIVE-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      let teacherId: string | null = null;
      if (profile.id) {
        const t = await fetchTeacherByProfileId(profile.id);
        if (t) teacherId = t.id;
      }

      const created = await createLiveClassDB({
        school_id: profile.school_id,
        teacher_id: teacherId,
        class_id: null,
        title: newLiveName || 'General Road Rules & Priority Class',
        description: newLiveTopic || 'Traffic Signs & Regulations',
        scheduled_at: new Date().toISOString(),
        duration_minutes: parseInt(newLiveDuration) || 60,
        status: 'live',
        meeting_url: code,
        class_type: 'online',
        access_code: code,
        room: null,
        max_students: 100,
      });

      const newClass: TeacherLiveClass = {
        id: created.id,
        name: created.title,
        code: code,
        date: 'Today',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: created.duration_minutes,
        topic: created.description || created.title,
        category: newLiveCategory,
        studentsJoined: 1,
        status: 'Live',
        attendanceRate: 100,
        chatMessagesCount: 0
      };
      setLiveClasses([newClass, ...liveClasses]);
      setGeneratedLiveCode(code);
      triggerToast(`🎥 Live Class "${newClass.name}" created! Code: ${code}`);
    } catch (err: any) {
      triggerToast(`⚠️ Error creating class: ${err.message}`);
    }
  };

  const handleCreatePhysicalSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.school_id) return;
    const code = `PHYS-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      let teacherId: string | null = null;
      if (profile.id) {
        const t = await fetchTeacherByProfileId(profile.id);
        if (t) teacherId = t.id;
      }

      const created = await createPhysicalClass({
        school_id: profile.school_id,
        teacher_id: teacherId,
        class_id: null,
        class_type: 'physical',
        title: newLiveName || 'Physical Classroom Theory Lesson',
        description: newLiveTopic || 'Interactive Classroom Presenter',
        scheduled_at: new Date().toISOString(),
        duration_minutes: parseInt(newLiveDuration) || 60,
        status: 'live',
        access_code: code,
        room: 'Main Hall',
        max_students: parseInt(physicalMaxStudents) || 40,
      });

      const newClass: TeacherLiveClass = {
        id: created.id,
        name: created.title,
        code: code,
        date: 'Today',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: created.duration_minutes,
        topic: created.description || created.title,
        category: newLiveCategory,
        studentsJoined: 0,
        status: 'Live',
        attendanceRate: 100,
        chatMessagesCount: 0
      };
      setLiveClasses([newClass, ...liveClasses]);
      setGeneratedPhysicalCode(code);
      triggerToast(`🏫 Physical Classroom Session opened! Code: ${code}`);
    } catch (err: any) {
      triggerToast(`⚠️ Error opening session: ${err.message}`);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.school_id) return;
    const code = `EXAM-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      let teacherId: string | null = null;
      if (profile.id) {
        const t = await fetchTeacherByProfileId(profile.id);
        if (t) teacherId = t.id;
      }

      const created = await createExamDB({
        school_id: profile.school_id,
        teacher_id: teacherId,
        class_id: null,
        title: newExamTitle || 'Provisional Theory Exam',
        description: `Official Driving Theory Assessment (${newExamCategory})`,
        duration_minutes: parseInt(newExamDuration) || 20,
        passing_score: parseInt(newExamPassingScore) || 60,
        status: 'published',
        scheduled_at: null,
      });

      const exam: TeacherExam = {
        id: created.id,
        title: created.title,
        code: code,
        category: newExamCategory,
        difficulty: 'Intermediate',
        questionsCount: parseInt(newExamQuestionsCount) || 20,
        durationMinutes: created.duration_minutes,
        passingScorePercent: created.passing_score,
        attemptsAllowed: 2,
        createdDate: new Date().toISOString().split('T')[0],
        totalSubmissions: 0,
        passedCount: 0,
        avgScore: 0,
        status: 'Active'
      };
      setExamsList([exam, ...examsList]);
      setGeneratedExamCode(code);
      triggerToast(`📝 Formal Exam "${exam.title}" created in database! Code: ${code}`);
    } catch (err: any) {
      triggerToast(`⚠️ Error creating exam: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2"><X size={16} /></button>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-blue-600/30 flex-shrink-0">
            <GraduationCap size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[11px] border border-blue-200 flex items-center gap-1">
                <ShieldCheck size={12} className="text-blue-600" /> Instructor Portal
              </span>
              <span className="text-xs text-slate-400 font-medium">Friday, Aug 7, 2026</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome Back, Teacher Eric Mugisha! 👋</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned School: <strong className="text-slate-800">Kigali International Driving Academy</strong> • Senior Category B & Theory Instructor
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setShowStartLiveModal(true);
              setGeneratedLiveCode(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20"
          >
            <Video size={16} />
            <span>Start Live Class</span>
          </button>

          <button
            onClick={() => {
              setShowOpenPhysicalModal(true);
              setGeneratedPhysicalCode(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Building2 size={16} />
            <span>Open Physical Class</span>
          </button>

          <button
            onClick={() => {
              setShowCreateExamModal(true);
              setGeneratedExamCode(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
          >
            <FileText size={16} />
            <span>Create Exam</span>
          </button>

          <button
            onClick={() => navigate('/teacher/results')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
          >
            <BarChart3 size={16} />
            <span>View Results</span>
          </button>
        </div>
      </div>

      {/* Main Teacher Portal Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1 text-xs font-bold text-slate-600 overflow-x-auto">
        {[
          { id: 'overview', label: '🏠 Teacher Dashboard', icon: <BarChart3 size={14} /> },
          { id: 'students', label: `👨‍🎓 My Students (${assignedStudents.length})`, icon: <Users size={14} /> },
          { id: 'live', label: `💻 Live / Online Classes (${liveClasses.length})`, icon: <Video size={14} /> },
          { id: 'physical', label: '🏫 Physical Classes & Resources', icon: <Building2 size={14} /> },
          { id: 'exams', label: `📝 Formal Exams (${examsList.length})`, icon: <FileText size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white font-extrabold shadow-md shadow-blue-600/20'
                : 'hover:bg-white hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW / DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 8 Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            <StatCard
              title="My Students"
              value="68"
              change="Assigned"
              changeType="increase"
              icon={<Users size={18} className="text-blue-600" />}
            />
            <StatCard
              title="Physical Today"
              value="2"
              change="Sessions"
              changeType="neutral"
              icon={<Building2 size={18} className="text-purple-600" />}
            />
            <StatCard
              title="Live Today"
              value="3"
              change="Streams"
              changeType="increase"
              icon={<Video size={18} className="text-indigo-600" />}
            />
            <StatCard
              title="Exams Created"
              value="14"
              change="Total Banks"
              changeType="neutral"
              icon={<FileText size={18} className="text-slate-700" />}
            />
            <StatCard
              title="Completed Today"
              value="42"
              change="Submissions"
              changeType="increase"
              icon={<CheckCircle2 size={18} className="text-emerald-600" />}
            />
            <StatCard
              title="Students Passed"
              value="58"
              change="85.3% Rate"
              changeType="increase"
              icon={<Award size={18} className="text-amber-600" />}
            />
            <StatCard
              title="Avg Student Score"
              value="84.6%"
              change="+2.1% MoM"
              changeType="increase"
              icon={<TrendingUp size={18} className="text-teal-600" />}
            />
            <StatCard
              title="Upcoming Classes"
              value="4"
              change="Scheduled"
              changeType="neutral"
              icon={<Clock size={18} className="text-rose-600" />}
            />
          </div>

          {/* Analytics Visualizations & Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Student Performance & Exam Score Distribution Chart */}
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-600" /> Student Performance & Exam Score Distribution
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Average scores across recent theory mock exams and live quizzes</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  Target Pass: 60%
                </span>
              </div>

              {/* Bar Visualizer */}
              <div className="space-y-3 pt-2">
                {[
                  { topic: 'Priority & Right of Way (Article 42)', avg: 92, studentsCount: 68, color: 'bg-blue-600' },
                  { topic: 'Traffic Signs & Road Markings', avg: 88, studentsCount: 68, color: 'bg-indigo-600' },
                  { topic: 'Speed Limits & Highway Rules', avg: 84, studentsCount: 64, color: 'bg-teal-600' },
                  { topic: 'Vehicle Mechanics & Light Controls', avg: 76, studentsCount: 52, color: 'bg-amber-500' },
                  { topic: 'Night Driving & Alcohol Regulations', avg: 81, studentsCount: 60, color: 'bg-purple-600' },
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{item.topic}</span>
                      <span className="font-mono text-slate-900">{item.avg}% Avg ({item.studentsCount} Trainees)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                      <div className={`${item.color} h-full rounded-full transition-all duration-500`} style={{ width: `${item.avg}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-center text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 text-[10px] block font-medium">Monthly Classes Conducted</span>
                  <strong className="text-slate-900 text-sm font-extrabold">48 Classes</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 text-[10px] block font-medium">Student Attendance Rate</span>
                  <strong className="text-emerald-600 text-sm font-extrabold">94.8%</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 text-[10px] block font-medium">Weekly Teaching Activity</span>
                  <strong className="text-blue-600 text-sm font-extrabold">18.5 Hours</strong>
                </div>
              </div>
            </div>

            {/* Recent Teaching Activities Timeline */}
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Clock size={16} className="text-blue-600" /> Recent Activity Log
                </h2>
                <span className="text-[11px] text-slate-400">Real-time</span>
              </div>

              <div className="space-y-3.5 text-xs">
                {[
                  { text: 'Uwase Aline completed Theory Mock Exam #01 with 95% (19/20)', time: '10 mins ago', icon: <CheckCircle2 size={14} className="text-emerald-600" /> },
                  { text: 'New student Mugisha Divine assigned to your Category B class', time: '1 hour ago', icon: <UserPlus size={14} className="text-blue-600" /> },
                  { text: 'Live Class "LIVE-7049" started with 28 connected trainees', time: '2 hours ago', icon: <Play size={14} className="text-purple-600" /> },
                  { text: 'Physical Class session "PHYS-8842" completed in Room 2B', time: 'Yesterday', icon: <Building2 size={14} className="text-indigo-600" /> },
                  { text: 'New Formal Exam "EXAM-9021" created and published', time: 'Yesterday', icon: <FileText size={14} className="text-amber-600" /> },
                  { text: 'Exam results published for Category B Morning Cohort', time: '2 days ago', icon: <Award size={14} className="text-teal-600" /> },
                ].map((act, idx) => (
                  <div key={idx} className="flex gap-3 items-start pb-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="p-1.5 rounded-lg bg-slate-100 flex-shrink-0 mt-0.5">{act.icon}</div>
                    <div>
                      <p className="font-semibold text-slate-800 leading-snug">{act.text}</p>
                      <span className="text-[10px] text-slate-400">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Today's Schedule Timetable */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">Today's Class Timetable</h2>
                <p className="text-xs text-slate-500 mt-0.5">Manage your scheduled live online streams and physical classroom sessions</p>
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-200">
                4 Sessions Scheduled Today
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="p-3 rounded-l-xl">Time</th>
                    <th className="p-3">Class Title</th>
                    <th className="p-3">Type & Code</th>
                    <th className="p-3">Location / Link</th>
                    <th className="p-3">Students</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right rounded-r-xl">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {schedule.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="p-3 font-mono font-bold text-slate-700">{item.time}</td>
                      <td className="p-3 font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">{item.className}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.type === 'Live Stream' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {item.type}
                          </span>
                          <span className="font-mono text-slate-400 text-[11px]">{item.code}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 font-medium">{item.locationOrUrl}</td>
                      <td className="p-3 font-bold text-slate-800">{item.studentsCount} Trainees</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          item.status === 'Live Now' ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            if (item.type === 'Live Stream') {
                              setActiveTab('live');
                            } else {
                              setActiveTab('physical');
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-all flex items-center gap-1 ml-auto"
                        >
                          <Play size={12} /> Launch
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY STUDENTS */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-xl font-black text-slate-900">My Assigned Trainees</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage students assigned to Teacher Eric Mugisha</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Search student or NIN..."
                  className="pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl w-56 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
                />
              </div>

              <select
                value={studentCategoryFilter}
                onChange={e => setStudentCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="Cat B">Category B (Car)</option>
                <option value="Cat A">Category A (Motorcycle)</option>
                <option value="Cat C">Category C (Truck)</option>
              </select>

              <button
                onClick={() => triggerToast('📥 Student list exported to CSV/Excel!')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                <Download size={14} /> Export
              </button>
            </div>
          </div>

          {/* Table & Student Cards */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="p-3 rounded-l-xl">Student Info</th>
                    <th className="p-3">National ID (NIN)</th>
                    <th className="p-3">Course / Category</th>
                    <th className="p-3">Reg Date</th>
                    <th className="p-3">Exams Passed</th>
                    <th className="p-3">Average Score</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                            {st.avatar}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">{st.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{st.id} • {st.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{st.nin}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px]">
                          {st.category}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-600">{st.registrationDate}</td>
                      <td className="p-3 font-bold text-slate-800">{st.completedExamsCount} Exams</td>
                      <td className="p-3">
                        <span className={`font-black ${st.avgScore >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {st.avgScore}%
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {st.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedStudent(st);
                            setEditedNotes(st.teacherNotes);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-[11px] transition-all"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right-Side Drawer (Slide-Over Panel) for Student Details */}
          {selectedStudent && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
              <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 overflow-y-auto space-y-6 border-l border-slate-200 animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-base flex items-center justify-center">
                      {selectedStudent.avatar}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{selectedStudent.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">ID: {selectedStudent.id} • NIN: {selectedStudent.nin}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedStudent(null)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600">
                    <X size={18} />
                  </button>
                </div>

                {/* Contact & Meta Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Phone Number</span>
                    <strong className="text-slate-900 font-bold">{selectedStudent.phone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Email Address</span>
                    <strong className="text-slate-900 font-bold truncate block">{selectedStudent.email}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Address</span>
                    <strong className="text-slate-900 font-bold">{selectedStudent.address}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Course Category</span>
                    <strong className="text-blue-600 font-bold">{selectedStudent.category}</strong>
                  </div>
                </div>

                {/* Performance Highlights */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl">
                    <span className="text-slate-500 text-[10px] block font-medium">Avg Score</span>
                    <strong className="text-blue-700 text-base font-black">{selectedStudent.avgScore}%</strong>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <span className="text-slate-500 text-[10px] block font-medium">Highest Score</span>
                    <strong className="text-emerald-700 text-base font-black">{selectedStudent.highestScore}%</strong>
                  </div>
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-2xl">
                    <span className="text-slate-500 text-[10px] block font-medium">Attendance</span>
                    <strong className="text-purple-700 text-base font-black">{selectedStudent.attendanceRate}%</strong>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl">
                    <span className="text-slate-500 text-[10px] block font-medium">Pass Rate</span>
                    <strong className="text-amber-700 text-base font-black">{selectedStudent.passRate}%</strong>
                  </div>
                </div>

                {/* Teacher Notes Section */}
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold text-slate-800">Teacher Notes & Evaluations</label>
                  <textarea
                    rows={3}
                    value={editedNotes}
                    onChange={e => setEditedNotes(e.target.value)}
                    placeholder="Write observations about student theory progress or practical weaknesses..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button
                    onClick={handleSaveNotes}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    <Edit3 size={14} /> Save Notes
                  </button>
                </div>

                {/* Exam History Table */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-slate-900 text-sm">Recent Exam History</h4>
                  <div className="space-y-2 text-xs">
                    {selectedStudent.examHistory.map((ex) => (
                      <div key={ex.id} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900">{ex.title}</p>
                          <p className="text-[11px] text-slate-400">{ex.date} • {ex.timeTaken}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800">{ex.score} / {ex.total}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {ex.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Controls */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-bold">
                  <button
                    onClick={() => handleSendResetEmail(selectedStudent.name)}
                    className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Lock size={14} /> Send Password Reset
                  </button>
                  <button
                    onClick={() => triggerToast(`🖨️ Progress report generated for ${selectedStudent.name}!`)}
                    className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Printer size={14} /> Print Progress Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LIVE / ONLINE CLASSES */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Live Classes"
              value="1 Class"
              change="Streaming Now"
              changeType="increase"
              icon={<Video size={20} className="text-rose-600" />}
            />
            <StatCard
              title="Today's Classes"
              value="3 Streams"
              change="2 Scheduled"
              changeType="neutral"
              icon={<Calendar size={20} className="text-blue-600" />}
            />
            <StatCard
              title="Students Connected"
              value="28 Trainees"
              change="95% Attendance"
              changeType="increase"
              icon={<Users size={20} className="text-emerald-600" />}
            />
            <StatCard
              title="Completed Classes"
              value="42 Streams"
              change="This Month"
              changeType="neutral"
              icon={<CheckCircle2 size={20} className="text-indigo-600" />}
            />
          </div>

          {/* Top Actions & Live Monitoring Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Live Class Stream Control Panel */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <Video size={18} className="text-rose-600 animate-pulse" /> Live Online Stream Console
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Currently monitoring live broadcast for Kigali Trainees</p>
                </div>
                <button
                  onClick={() => navigate('/teacher/live-class/LC-7049')}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5"
                >
                  <Play size={14} /> Full Room View
                </button>
              </div>

              {/* Stream Preview Stage */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden space-y-4 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" /> LIVE BROADCAST
                  </span>
                  <span className="font-mono text-xs text-slate-400">Code: LIVE-7049</span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white">Priority & Right of Way Masterclass</h3>
                  <p className="text-xs text-slate-300 mt-1">Instructor: Teacher Eric Mugisha • Category B Theory</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <span className="text-slate-400 text-[10px] block">Connected</span>
                    <strong className="text-emerald-400 font-extrabold text-sm">28 Trainees</strong>
                  </div>
                  <div className="p-3 bg-white/10 rounded-xl">
                    <span className="text-slate-400 text-[10px] block">Screen Share</span>
                    <strong className="text-blue-300 font-extrabold text-sm">{isScreenSharing ? 'Active' : 'Off'}</strong>
                  </div>
                  <div className="p-3 bg-white/10 rounded-xl">
                    <span className="text-slate-400 text-[10px] block">Timer</span>
                    <strong className="text-amber-300 font-extrabold text-sm">42:15 Mins</strong>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setIsScreenSharing(!isScreenSharing)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      isScreenSharing ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700'
                    }`}
                  >
                    <Monitor size={14} className="inline mr-1" /> {isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                  </button>
                  <button
                    onClick={() => triggerToast('📢 Announcement broadcasted to all 28 connected students!')}
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all"
                  >
                    <Send size={14} className="inline mr-1" /> Broadcast Alert
                  </button>
                </div>
              </div>

              {/* Chat Simulation Box */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>Live Student Q&A Chat</span>
                  <span className="text-[10px] text-slate-400 font-normal">42 Messages</span>
                </h4>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 h-36 overflow-y-auto space-y-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <span className="font-extrabold text-blue-600">Uwase Aline:</span>
                    <span className="text-slate-700 ml-1">Teacher, if two vehicles arrive at the roundabout simultaneously, who yields?</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <span className="font-extrabold text-indigo-600">Nshimyumuremyi Eric:</span>
                    <span className="text-slate-700 ml-1">The vehicle inside the roundabout always has priority!</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Classes Table & History Log */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="font-extrabold text-slate-900 text-base">Class History Log</h2>
                  <button
                    onClick={() => setShowStartLiveModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all"
                  >
                    + New Stream
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  {liveClasses.map((lc) => (
                    <div key={lc.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          lc.status === 'Live' ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {lc.status}
                        </span>
                        <span className="font-mono text-slate-400 text-[11px]">{lc.code}</span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-sm">{lc.name}</h3>
                      <p className="text-slate-500 text-[11px]">{lc.topic} • {lc.category}</p>
                      <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 pt-1 border-t border-slate-200/60">
                        <span>{lc.studentsJoined} Trainees</span>
                        <span className="text-emerald-600 font-bold">{lc.attendanceRate}% Attendance</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PHYSICAL CLASSES & TEACHING RESOURCES */}
      {activeTab === 'physical' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-xl font-black text-slate-900">Physical Classroom Teaching Engine</h2>
              <p className="text-xs text-slate-500 mt-0.5">Assists face-to-face instruction, projector slides, and quick classroom code generation</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowProjectorModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
              >
                <Tv size={16} /> Open Interactive Projector
              </button>
              <button
                onClick={() => {
                  setShowOpenPhysicalModal(true);
                  setGeneratedPhysicalCode(null);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
              >
                <Building2 size={16} /> Generate Session Access Code
              </button>
            </div>
          </div>

          {/* Classroom Teaching Resources & Guides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 hover:border-blue-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                <BookMarked size={24} />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Digital Driving Manual 2026</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Official Rwandan road code manual with complete articles on priority, overtaking, and vehicle control laws.
              </p>
              <button
                onClick={() => triggerToast('📖 Digital Driving Manual opened!')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 pt-2"
              >
                Explore Modules <ChevronRight size={14} />
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 hover:border-blue-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-black">
                <Lightbulb size={24} />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Traffic Signs & Road Signs Guide</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                High-definition vector illustrations of warning signs, mandatory instructions, priority signs, and road markings.
              </p>
              <button
                onClick={() => setShowProjectorModal(true)}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 pt-2"
              >
                Launch Projector <ChevronRight size={14} />
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 hover:border-blue-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">
                <ShieldCheck size={24} />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Safety Instructions & First Aid</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Step-by-step guidance on emergency braking, seatbelt regulations, accident scene management, and first aid.
              </p>
              <button
                onClick={() => triggerToast('🚑 First Aid teaching module launched!')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 pt-2"
              >
                View Instructions <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Quick Classroom Test Results Dashboard */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">Recent Classroom Test Submissions</h2>
                <p className="text-xs text-slate-500 mt-0.5">Live scores submitted by students sitting in Room 2B using Session Code <strong className="text-slate-800">PHYS-8842</strong></p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200">
                35 Trainees Finished
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="p-3 rounded-l-xl">Student Name</th>
                    <th className="p-3">Score (out of 20)</th>
                    <th className="p-3">Correct / Wrong</th>
                    <th className="p-3">Time Used</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right rounded-r-xl">Detailed Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {assignedStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="p-3 font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">{st.name}</td>
                      <td className="p-3 font-mono font-black text-slate-900">{st.examHistory[0]?.score || 18} / 20</td>
                      <td className="p-3 font-bold text-slate-700">{st.examHistory[0]?.correct || 18} Correct • {st.examHistory[0]?.wrong || 2} Wrong</td>
                      <td className="p-3 font-medium text-slate-600">{st.examHistory[0]?.timeTaken || '12 min'}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          PASSED
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setReviewStudent(st);
                            setShowExamReviewModal(true);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-bold text-[11px] transition-all"
                        >
                          Question Breakdown
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FORMAL EXAMS */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-xl font-black text-slate-900">Formal Theory Examinations Engine</h2>
              <p className="text-xs text-slate-500 mt-0.5">Create, schedule, and monitor formal theory license examinations</p>
            </div>

            <button
              onClick={() => {
                setShowCreateExamModal(true);
                setGeneratedExamCode(null);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20"
            >
              <FileText size={16} /> Create New Formal Exam
            </button>
          </div>

          {/* Exams List Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="p-3 rounded-l-xl">Exam Title & Code</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Questions & Time</th>
                    <th className="p-3">Pass Mark</th>
                    <th className="p-3">Submissions</th>
                    <th className="p-3">Avg Score</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {examsList.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="p-3">
                        <p className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">{ex.title}</p>
                        <p className="text-[11px] font-mono text-slate-400">{ex.code} • Created {ex.createdDate}</p>
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px]">
                          {ex.category}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-700">{ex.questionsCount} Qs • {ex.durationMinutes} mins</td>
                      <td className="p-3 font-extrabold text-emerald-600">{ex.passingScorePercent}% Pass Mark</td>
                      <td className="p-3 font-bold text-slate-800">{ex.totalSubmissions} Trainees</td>
                      <td className="p-3 font-black text-blue-600">{ex.avgScore}%</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {ex.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => triggerToast(`📊 Exam leaderboard & detailed analytics loaded for ${ex.code}!`)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-[11px] transition-all"
                        >
                          View Analytics
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: START NEW LIVE CLASS */}
      {showStartLiveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Schedule New Live Online Stream</h3>
                <p className="text-xs text-slate-500">Generates unique stream code, link & QR code</p>
              </div>
              <button onClick={() => setShowStartLiveModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateLiveClass} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Class Name *</label>
                <input
                  type="text"
                  required
                  value={newLiveName}
                  onChange={e => setNewLiveName(e.target.value)}
                  placeholder="e.g. Priority Signs & Right of Way Masterclass"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Topic / Article Reference</label>
                <input
                  type="text"
                  value={newLiveTopic}
                  onChange={e => setNewLiveTopic(e.target.value)}
                  placeholder="e.g. Article 42 & 45 Traffic Code Rules"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newLiveCategory}
                    onChange={e => setNewLiveCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                  >
                    <option value="Category B (Car)">Category B (Car)</option>
                    <option value="Category A (Motorcycle)">Category A (Motorcycle)</option>
                    <option value="Category C (Truck)">Category C (Truck)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    value={newLiveDuration}
                    onChange={e => setNewLiveDuration(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {generatedLiveCode && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-center space-y-3">
                  <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block">Generated Class Access Code</span>
                  <span className="text-2xl font-black font-mono text-purple-950 tracking-widest">{generatedLiveCode}</span>
                  <QRCodeGraphic code={generatedLiveCode} />
                  <p className="text-[11px] text-purple-800 font-mono">https://driveclass.rw/live/{generatedLiveCode}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStartLiveModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-600/20"
                >
                  Generate Stream Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: OPEN PHYSICAL CLASSROOM SESSION */}
      {showOpenPhysicalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto font-black">
              <Building2 size={24} />
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Physical Classroom Access Code</h3>
              <p className="text-xs text-slate-500 mt-1">Issue session access code for students sitting in Room 2B.</p>
            </div>

            <form onSubmit={handleCreatePhysicalSession} className="space-y-4 text-xs text-left">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Max Classroom Trainees Limit</label>
                <input
                  type="number"
                  value={physicalMaxStudents}
                  onChange={e => setPhysicalMaxStudents(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                />
              </div>

              {generatedPhysicalCode ? (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-center space-y-3">
                  <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">Generated Session Code</span>
                  <span className="text-3xl font-black font-mono text-indigo-950 tracking-widest">{generatedPhysicalCode}</span>
                  <QRCodeGraphic code={generatedPhysicalCode} />
                  <p className="text-[11px] text-indigo-800">Students type this code into their portal to join the lesson.</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center">Click below to generate live code</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpenPhysicalModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20"
                >
                  Generate Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE FORMAL EXAM */}
      {showCreateExamModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Create Formal Theory Examination</h3>
                <p className="text-xs text-slate-500">Configure randomized theory questions and passing score</p>
              </div>
              <button onClick={() => setShowCreateExamModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Exam Title *</label>
                <input
                  type="text"
                  required
                  value={newExamTitle}
                  onChange={e => setNewExamTitle(e.target.value)}
                  placeholder="e.g. Provisional Theory License Exam Bank B"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Number of Qs</label>
                  <input
                    type="number"
                    value={newExamQuestionsCount}
                    onChange={e => setNewExamQuestionsCount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    value={newExamDuration}
                    onChange={e => setNewExamDuration(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Passing Score Percentage (%)</label>
                <input
                  type="number"
                  value={newExamPassingScore}
                  onChange={e => setNewExamPassingScore(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                />
              </div>

              {generatedExamCode && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Generated Formal Exam Code</span>
                  <span className="text-3xl font-black font-mono text-emerald-950 tracking-widest">{generatedExamCode}</span>
                  <QRCodeGraphic code={generatedExamCode} />
                  <p className="text-[11px] text-emerald-800">Students enter this code to start their timed theory test.</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateExamModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md shadow-emerald-600/20"
                >
                  Create & Publish Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: INTERACTIVE PROJECTOR VIEW */}
      {showProjectorModal && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-6 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white font-black">
                <Tv size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Classroom Projector Presenter</h2>
                <p className="text-xs text-slate-400">Projecting to Kigali Academy Classroom #2B</p>
              </div>
            </div>
            <button
              onClick={() => setShowProjectorModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Exit Projector
            </button>
          </div>

          {/* Projector Slide */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto text-center space-y-8 my-auto">
            <span className="px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold text-sm border border-indigo-500/30">
              Question {presenterQIndex + 1} of {dbQuestions.length || 1}
            </span>

            <h3 className="text-2xl sm:text-4xl font-black leading-tight text-white max-w-3xl">
              {dbQuestions[presenterQIndex]?.question_text || 'No question available'}
            </h3>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl text-left text-sm font-bold">
              {(dbQuestions[presenterQIndex]?.options || []).map((opt, i) => {
                const isCorrect = opt === dbQuestions[presenterQIndex]?.correct_answer;
                return (
                  <div
                    key={i}
                    className={`p-5 rounded-2xl border transition-all ${
                      presenterShowAnswer && isCorrect
                        ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-200'
                    }`}
                  >
                    <span className="text-slate-500 font-mono mr-3">Option {String.fromCharCode(65 + i)}:</span>
                    <span>{opt}</span>
                  </div>
                );
              })}
            </div>

            {/* Explanation box */}
            {presenterShowAnswer && (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs text-left max-w-2xl space-y-1">
                <span className="font-extrabold text-emerald-400 uppercase tracking-wider block">Official Explanation</span>
                <p>{dbQuestions[presenterQIndex]?.explanation || 'No explanation provided.'}</p>
              </div>
            )}

            {/* Presenter Controls */}
            <div className="flex items-center gap-4 pt-4">
              <button
                onClick={() => {
                  setPresenterQIndex(Math.max(0, presenterQIndex - 1));
                  setPresenterShowAnswer(false);
                }}
                disabled={presenterQIndex === 0}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs"
              >
                Previous Question
              </button>

              <button
                onClick={() => setPresenterShowAnswer(!presenterShowAnswer)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30"
              >
                {presenterShowAnswer ? 'Hide Correct Answer' : 'Reveal Correct Answer'}
              </button>

              <button
                onClick={() => {
                  setPresenterQIndex(Math.min((dbQuestions.length || 1) - 1, presenterQIndex + 1));
                  setPresenterShowAnswer(false);
                }}
                disabled={presenterQIndex >= (dbQuestions.length || 1) - 1}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs"
              >
                Next Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DETAILED STUDENT EXAM REVIEW */}
      {showExamReviewModal && reviewStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Question-by-Question Detailed Review</h3>
                <p className="text-xs text-slate-500">Student: <strong className="text-slate-800">{reviewStudent.name}</strong> • Score: <strong className="text-emerald-600">{reviewStudent.examHistory[0]?.score || 18} / 20</strong></p>
              </div>
              <button onClick={() => setShowExamReviewModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className="space-y-4 text-xs">
              {dbQuestions.slice(0, 5).map((q, idx) => {
                const isWrong = idx === 1;
                return (
                  <div key={q.id} className={`p-4 rounded-2xl border space-y-2 ${isWrong ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200/80'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-900">Question {idx + 1}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isWrong ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {isWrong ? 'Incorrect (0/1)' : 'Correct (+1)'}
                      </span>
                    </div>

                    <p className="font-semibold text-slate-800">{q.question_text}</p>

                    <div className="space-y-1 pt-1 text-[11px]">
                      <p className="text-slate-600">
                        <strong>Student Answer:</strong> <span className={isWrong ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>{(q.options ?? [])[isWrong ? 0 : Math.max(0, (q.options ?? []).indexOf(q.correct_answer))]}</span>
                      </p>
                      {isWrong && (
                        <p className="text-slate-600">
                          <strong>Correct Answer:</strong> <span className="text-emerald-600 font-bold">{q.correct_answer}</span>
                        </p>
                      )}
                      <p className="text-slate-500 pt-1 italic">
                        <strong>Explanation:</strong> {q.explanation || 'Official Traffic Code rule.'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowExamReviewModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
            >
              Close Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
