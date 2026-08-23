import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Video, BookOpen, Award, BarChart3,
  MapPin, Phone, Mail, User, ShieldCheck, ArrowRight,
  Clock, Bell, Lock, KeyRound,
  Play, CheckCircle2, AlertCircle, X, Send,
  Hand, Users, Mic, MicOff, Camera, CameraOff,
  Download, FileText, Building2,
  Calendar, Globe, Edit, CheckSquare, LogOut
} from 'lucide-react';
import { defaultTheoryQuestionBank, type ExerciseQuestion } from '@/data/rnpQuestions';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import StudentLiveRoom from '@/components/live-class/StudentLiveRoom';

// Interfaces for Student Portal
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'exam' | 'test' | 'live' | 'physical' | 'announcement' | 'expiry' | 'certificate';
  unread: boolean;
}

export default function StudentMobilePortal() {
  const { language, setLanguage } = useI18n();
  const [searchParams] = useSearchParams();

  // Bottom Navigation Active Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'classes' | 'profile'>('dashboard');

  // Toast Notification
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Notifications Drawer State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: '1', title: '💻 Live Stream Started', message: 'Teacher Eric Mugisha started Priority Signs Masterclass.', time: '10 mins ago', type: 'live', unread: true },
    { id: '2', title: '📝 New Exam Available', message: 'National Provisional Theory Exam Bank A is now open.', time: '1 hour ago', type: 'exam', unread: true },
    { id: '3', title: '🏫 Physical Classroom Session', message: 'Room 2B is open for Traffic Signs Lab Workshop.', time: '2 hours ago', type: 'physical', unread: true },
    { id: '4', title: '💬 Teacher Announcement', message: 'Please review Article 42 on Right of Way before class.', time: 'Yesterday', type: 'announcement', unread: false },
    { id: '5', title: '🎓 Certificate Issued', message: 'Category B Theory Completion Certificate is available.', time: '3 days ago', type: 'certificate', unread: false },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;
  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
    showToast('All notifications marked as read');
  };

  // Student Data Profile
  const [studentInfo] = useState({
    name: 'Uwase Aline',
    studentId: 'STU-2026-089',
    schoolName: 'Kigali International Driving Academy',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phone: '+250 788 123 456',
    email: 'uwase.aline@gmail.com',
    courseName: 'Category B - Private Car & SUV',
    instructorName: 'Teacher Eric Mugisha',
    enrollmentDate: 'Jan 10, 2026',
    courseExpiry: 'Dec 31, 2026',
    avgScore: 90.5,
    attendanceRate: 96.5,
    certificatesCount: 1,
    schoolLogo: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=120&q=80',
    address: 'Kigali City, Nyarugenge KN 5 Rd',
    website: 'www.kigalidriving.rw',
    status: 'Active Student'
  });

  // Access Code State
  const [accessCode, setAccessCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  // Active Joined Overlays
  const [activeJoinedView, setActiveJoinedView] = useState<'none' | 'online_class' | 'physical_class' | 'exam' | 'test'>('none');
  const [joinedActivityTitle, setJoinedActivityTitle] = useState('');

  // Online Class Live Interactive State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: '1', sender: 'Teacher Eric Mugisha', text: 'Welcome everyone! Today we master Priority Signs & Right of Way.', time: '09:00 AM', isTeacher: true },
    { id: '2', sender: 'Uwase Aline (You)', text: 'Good morning teacher! Ready for the lesson.', time: '09:02 AM', isTeacher: false },
    { id: '3', sender: 'Mugisha Divine', text: 'Teacher, will we review roundabouts?', time: '09:04 AM', isTeacher: false },
    { id: '4', sender: 'Teacher Eric Mugisha', text: 'Yes Divine! Roundabout rules are in Chapter 3 on slide 12.', time: '09:05 AM', isTeacher: true },
  ]);
  const [handRaised, setHandRaised] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [activeSlide, setActiveSlide] = useState(1);

  // Physical Classroom Test State (DB-driven)
  const [physSessionId, setPhysSessionId] = useState<string | null>(null);
  const [physSchoolId, setPhysSchoolId] = useState<string | null>(null);
  const [physDbQuestions, setPhysDbQuestions] = useState<Array<{
    id: string;
    question_text: string;
    options: string[];
    correct_answer: string;
    explanation: string | null;
  }>>([]);
  const [physLoading, setPhysLoading] = useState(false);
  const [physQuestionIndex, setPhysQuestionIndex] = useState(0);
  const [physUserAnswers, setPhysUserAnswers] = useState<Record<number, number>>({});
  const [physFinished, setPhysFinished] = useState(false);
  const [physScore, setPhysScore] = useState<number | null>(null);
  const [physStartTime, setPhysStartTime] = useState<number>(0);
  const [physRemainingSeconds, setPhysRemainingSeconds] = useState(1200);
  const [physSubmitting, setPhysSubmitting] = useState(false);

  // Exam Engine State
  const [examQuestions] = useState<ExerciseQuestion[]>(defaultTheoryQuestionBank.slice(0, 20));
  const [examQuestionIndex, setExamQuestionIndex] = useState(0);
  const [examUserAnswers, setExamUserAnswers] = useState<Record<number, number>>({});
  const [reviewedLaterQuestions, setReviewedLaterQuestions] = useState<Record<number, boolean>>({});
  const [examRemainingSeconds, setExamRemainingSeconds] = useState(1200); // 20 mins
  const [examFinished, setExamFinished] = useState(false);
  const [examResultScore, setExamResultScore] = useState<number | null>(null);

  // Test Engine State
  const [testQuestions] = useState<ExerciseQuestion[]>(defaultTheoryQuestionBank.slice(0, 5));
  const [testQuestionIndex, setTestQuestionIndex] = useState(0);
  const [testUserAnswers, setTestUserAnswers] = useState<Record<number, number>>({});
  const [testFinished, setTestFinished] = useState(false);

  // Join Physical Classroom — fetch session + questions from DB
  const joinPhysicalClass = useCallback(async (code: string) => {
    setPhysLoading(true);
    setCodeError(null);
    try {
      // Look up the session by access_code in live_classes
      const { data: session } = await supabase
        .from('live_classes')
        .select('id, school_id, title, max_students')
        .eq('access_code', code)
        .eq('class_type', 'physical')
        .maybeSingle();

      if (!session) {
        // Code not found in DB — still join with fallback local questions
        setPhysSessionId(null);
        setPhysSchoolId(null);
        setPhysDbQuestions([]);
        setPhysQuestionIndex(0);
        setPhysUserAnswers({});
        setPhysFinished(false);
        setPhysScore(null);
        setPhysStartTime(Date.now());
        setPhysRemainingSeconds(1200);
        setJoinedActivityTitle(`Physical Classroom (${code})`);
        setActiveJoinedView('physical_class');
        showToast(`Joined classroom: ${code}`);
        return;
      }

      setPhysSessionId(session.id);
      setPhysSchoolId(session.school_id);

      // Fetch active questions from the platform question bank
      const { data: questions } = await supabase
        .from('questions')
        .select('id, question_text, options, correct_answer, explanation')
        .eq('status', 'active')
        .is('exam_id', null)
        .order('created_at', { ascending: false });

      const qList = (questions ?? []) as Array<{
        id: string;
        question_text: string;
        options: string[];
        correct_answer: string;
        explanation: string | null;
      }>;

      // Shuffle for this student
      const shuffled = [...qList].sort(() => 0.5 - Math.random()).slice(0, 20);
      setPhysDbQuestions(shuffled);
      setPhysQuestionIndex(0);
      setPhysUserAnswers({});
      setPhysFinished(false);
      setPhysScore(null);
      setPhysStartTime(Date.now());
      setPhysRemainingSeconds(shuffled.length * 60); // 1 min per question
      setJoinedActivityTitle(`${session.title} (${code})`);
      setActiveJoinedView('physical_class');
      showToast(`✅ Joined "${session.title}" — ${shuffled.length} questions loaded!`);
    } catch (err) {
      console.error('Error joining physical class:', err);
      setCodeError('Could not connect to classroom. Check your internet connection.');
    } finally {
      setPhysLoading(false);
    }
  }, []);

  // Submit physical class test results to DB
  const handleSubmitPhysicalTest = useCallback(async () => {
    const qs = physDbQuestions.length > 0 ? physDbQuestions : [];
    let correct = 0;
    const answersRecord: Record<string, unknown> = {};

    qs.forEach((q, idx) => {
      const selectedIdx = physUserAnswers[idx];
      const selectedAnswer = selectedIdx !== undefined ? q.options[selectedIdx] : null;
      const isCorrect = selectedAnswer === q.correct_answer;
      if (isCorrect) correct++;
      answersRecord[q.id] = {
        questionText: q.question_text,
        studentAnswer: selectedAnswer ?? 'No answer',
        correctAnswer: q.correct_answer,
        isCorrect,
      };
    });

    const total = qs.length || 20;
    const score = correct;
    const passed = (score / total) >= 0.6;
    const timeUsed = Math.round((Date.now() - physStartTime) / 1000);

    setPhysScore(score);
    setPhysFinished(true);

    if (physSessionId && physSchoolId) {
      setPhysSubmitting(true);
      try {
        await supabase.from('physical_class_results').insert({
          session_id: physSessionId,
          school_id: physSchoolId,
          student_name: studentInfo.name,
          nin: null,
          score,
          total_questions: total,
          correct_count: correct,
          wrong_count: total - correct,
          time_used_secs: timeUsed,
          passed,
          answers: answersRecord,
        });
        showToast(`✅ Score saved! ${score}/${total} — ${passed ? 'PASSED 🎉' : 'Try again'}`);
      } catch (err) {
        console.error('Error saving result:', err);
        showToast(`Score: ${score}/${total} (could not save — offline)`);
      } finally {
        setPhysSubmitting(false);
      }
    } else {
      showToast(`Test complete! Score: ${score}/${total}`);
    }
  }, [physDbQuestions, physUserAnswers, physSessionId, physSchoolId, physStartTime, studentInfo.name]);

  // Physical class timer countdown
  useEffect(() => {
    if (activeJoinedView !== 'physical_class' || physFinished) return;
    if (physDbQuestions.length === 0) return; // No test loaded yet
    const interval = setInterval(() => {
      setPhysRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          void handleSubmitPhysicalTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeJoinedView, physFinished, physDbQuestions.length, handleSubmitPhysicalTest]);

  // Code Validation Handler
  const handleValidateCode = useCallback((inputCode: string) => {
    const codeClean = inputCode.trim().toUpperCase();
    setCodeError(null);

    if (!codeClean) {
      setCodeError('Please enter an access code provided by your teacher.');
      return;
    }

    if (codeClean.startsWith('LC-') || codeClean.startsWith('LIVE-') || codeClean === 'LIVE-7049') {
      setJoinedActivityTitle(`Live Online Class (${codeClean})`);
      setActiveJoinedView('online_class');
      showToast(`Joined Live Online Class: ${codeClean}`);
      return;
    }

    if (codeClean.startsWith('PHYS-')) {
      void joinPhysicalClass(codeClean);
      return;
    }

    if (codeClean.startsWith('EXAM-') || codeClean === 'EXAM-9021') {
      setJoinedActivityTitle(`Provisional Driver Theory Exam (${codeClean})`);
      setExamQuestionIndex(0);
      setExamUserAnswers({});
      setReviewedLaterQuestions({});
      setExamRemainingSeconds(1200);
      setExamFinished(false);
      setActiveJoinedView('exam');
      showToast(`Started Exam: ${codeClean}`);
      return;
    }

    if (codeClean.startsWith('TEST-') || codeClean === 'TEST-1001') {
      setJoinedActivityTitle(`Classroom Quick Test (${codeClean})`);
      setTestQuestionIndex(0);
      setTestUserAnswers({});
      setTestFinished(false);
      setActiveJoinedView('test');
      showToast(`Started Test: ${codeClean}`);
      return;
    }

    // Default fallback
    if (codeClean.length >= 4) {
      setJoinedActivityTitle(`Active Learning Session (${codeClean})`);
      setActiveJoinedView('online_class');
      showToast(`Joined Session: ${codeClean}`);
      return;
    }

    setCodeError('Invalid or expired access code. Please contact your teacher.');
  }, [joinPhysicalClass]);

  // Sync with searchParams if ?tab=classes or ?tab=profile
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'classes') setActiveTab('classes');
    else if (tabParam === 'profile') setActiveTab('profile');

    const codeParam = searchParams.get('code');
    if (codeParam) {
      setAccessCode(codeParam);
      handleValidateCode(codeParam);
    }
  }, [searchParams, handleValidateCode]);

  // Exam Finish
  const handleFinishExam = useCallback(() => {
    let score = 0;
    examQuestions.forEach((q, idx) => {
      if (examUserAnswers[idx] === q.options.indexOf(q.correctAnswer)) {
        score++;
      }
    });
    setExamResultScore(score);
    setExamFinished(true);
    showToast(`Exam Submitted! Score: ${score}/${examQuestions.length}`);
  }, [examQuestions, examUserAnswers]);

  // Countdown timer for Exam
  useEffect(() => {
    if (activeJoinedView !== 'exam' || examFinished) return;
    const interval = setInterval(() => {
      setExamRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeJoinedView, examFinished, handleFinishExam]);

  // Format Timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Test Finish
  const handleFinishTest = () => {
    setTestFinished(true);
    showToast('Test Submitted successfully!');
  };

  // Send Chat Message
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages([
      ...chatMessages,
      { id: Date.now().toString(), sender: 'Uwase Aline (You)', text: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isTeacher: false }
    ]);
    setChatInput('');
  };

  // Modals for Profile
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 font-sans antialiased selection:bg-blue-600 selection:text-white flex justify-center sm:p-4">
      {/* Mobile Shell Frame Container */}
      <div className="w-full max-w-md sm:max-w-xl bg-white min-h-screen sm:min-h-[calc(100vh-2rem)] sm:rounded-3xl shadow-xl relative flex flex-col overflow-hidden">
        
        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border border-slate-800 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-bold leading-tight">{toast}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white"><X size={16} /></button>
          </div>
        )}

        {/* TOP MOBILE APP BAR */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-600/20 flex-shrink-0">
              KDA
            </div>
            <div>
              <h1 className="text-xs font-black text-slate-900 leading-tight">Kigali Int. Driving Academy</h1>
              <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                <ShieldCheck size={11} /> Student Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'rw' : 'en')}
              className="h-9 min-w-9 px-2 rounded-xl border border-slate-200 bg-white text-[9px] font-black text-blue-700"
              aria-label="Change language"
            >
              {language === 'en' ? 'RW' : 'EN'}
            </button>
            {/* Notification Icon */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white font-black text-[9px] rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Profile Avatar Picture */}
            <button
              onClick={() => setActiveTab('profile')}
              className="w-9 h-9 rounded-xl overflow-hidden border-2 border-blue-600/30 p-0.5 flex-shrink-0"
            >
              <img src={studentInfo.photo} alt={studentInfo.name} className="w-full h-full object-cover rounded-lg" />
            </button>
          </div>
        </header>

        {/* MAIN BODY CONTENT BASED ON ACTIVE TAB */}
        <main className="flex-1 p-4 sm:p-6 space-y-5 overflow-y-auto">

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-5">
              {/* Welcome Banner Card */}
              <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-5 text-white shadow-lg shadow-blue-600/20 relative overflow-hidden">
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/40 shadow-md flex-shrink-0">
                    <img src={studentInfo.photo} alt={studentInfo.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-xs">
                      ID: {studentInfo.studentId}
                    </span>
                    <h2 className="text-xl font-black text-white mt-1 leading-tight">{studentInfo.name}</h2>
                    <p className="text-xs text-blue-100 font-medium mt-0.5">{studentInfo.schoolName}</p>
                  </div>
                </div>
              </div>

              {/* 8 Summary Cards Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><BookOpen size={18} /></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Active Classes</span>
                    <strong className="text-sm font-black text-slate-900">2 Classes</strong>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600"><FileText size={18} /></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Available Exams</span>
                    <strong className="text-sm font-black text-slate-900">3 Exams</strong>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><CheckSquare size={18} /></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Available Tests</span>
                    <strong className="text-sm font-black text-slate-900">5 Tests</strong>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600"><Video size={18} /></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Online Today</span>
                    <strong className="text-sm font-black text-slate-900">1 Stream</strong>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600"><Building2 size={18} /></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Physical Today</span>
                    <strong className="text-sm font-black text-slate-900">1 Session</strong>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><Award size={18} /></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Certificates</span>
                    <strong className="text-sm font-black text-slate-900">1 Earned</strong>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600"><BarChart3 size={18} /></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Avg Score</span>
                    <strong className="text-sm font-black text-emerald-600">90.5%</strong>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700"><Calendar size={18} /></div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Course Expiry</span>
                    <strong className="text-[11px] font-extrabold text-slate-800">{studentInfo.courseExpiry}</strong>
                  </div>
                </div>
              </div>

              {/* School Information Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                    KDA
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-xs">{studentInfo.schoolName}</h3>
                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={11} /> {studentInfo.status}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-slate-400 flex-shrink-0" />
                    <span className="font-semibold">{studentInfo.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-slate-400 flex-shrink-0" />
                    <span className="font-semibold">{studentInfo.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                    <span className="font-semibold truncate">{studentInfo.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe size={13} className="text-slate-400 flex-shrink-0" />
                    <span className="font-semibold text-blue-600">{studentInfo.website}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-slate-400 block">Enrolled Course</span>
                    <strong className="text-slate-800 font-extrabold">{studentInfo.courseName}</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-slate-400 block">Instructor</span>
                    <strong className="text-slate-800 font-extrabold">{studentInfo.instructorName}</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-slate-400 block">Enrollment Date</span>
                    <strong className="text-slate-800 font-extrabold">{studentInfo.enrollmentDate}</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-slate-400 block">Course Expiry</span>
                    <strong className="text-rose-600 font-extrabold">{studentInfo.courseExpiry}</strong>
                  </div>
                </div>
              </div>

              {/* Today's Activities */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-600" /> Today's Scheduled Activities
                  </h3>
                  <span className="text-[10px] text-blue-600 font-bold">2 Active</span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-rose-600 text-white"><Video size={16} /></div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs">Priority Signs & Right of Way</h4>
                        <p className="text-[10px] text-slate-500">Live Stream • Access code required</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setActiveTab('classes'); showToast('Ask your teacher for the access code to join this activity.'); }}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                    >
                      <Lock size={10} /> Unlock
                    </button>
                  </div>

                  <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-600 text-white"><Building2 size={16} /></div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs">Traffic Signs & Road Markings</h4>
                        <p className="text-[10px] text-slate-500">Physical Room 2B • Access code required</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setActiveTab('classes'); showToast('Ask your teacher for the access code to join this activity.'); }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                    >
                      Unlock
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Results */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-emerald-600" /> Recent Exam & Test Results
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 text-xs">Full Theory Mock Exam #01</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                        95% • PASSED
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">Completed Yesterday • Score: 19 / 20</p>
                    <div className="bg-white p-2 rounded-xl border border-slate-100 text-[10px] text-slate-600">
                      <strong>Teacher Feedback:</strong> "Outstanding mastery of priority signs and highway overtaking rules."
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 text-xs">Road Signs & Markings Quiz</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                        90% • PASSED
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">Completed 3 days ago • Score: 18 / 20</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CLASSES & JOIN WITH CODE */}
          {activeTab === 'classes' && (
            <div className="space-y-5">
              {/* Quick Join Card (Sticky Input) */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-3xl text-white shadow-lg space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound size={20} className="text-blue-200" />
                  <h2 className="text-base font-black">Join Activity with Access Code</h2>
                </div>
                <p className="text-xs text-blue-100">
                  Enter the code provided by Teacher Eric Mugisha to unlock exams, tests, online streams, or physical lab sessions.
                </p>

                <div className="space-y-2 pt-1">
                  <div className="relative">
                    <input
                      type="text"
                      value={accessCode}
                      onChange={e => {
                        setAccessCode(e.target.value);
                        setCodeError(null);
                      }}
                      placeholder="Enter access code from your teacher"
                      className="w-full px-4 py-3.5 rounded-2xl bg-white text-slate-900 font-mono font-bold text-sm tracking-wider uppercase placeholder:text-slate-400 placeholder:font-sans placeholder:normal-case focus:outline-none focus:ring-4 focus:ring-white/30 shadow-inner"
                    />
                  </div>

                  {codeError && (
                    <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-100 border border-rose-400/30 text-xs font-bold flex items-center gap-2">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      <span>{codeError}</span>
                    </div>
                  )}

                  <button
                    onClick={() => handleValidateCode(accessCode)}
                    className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm shadow-md shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Join Activity Now</span>
                    <ArrowRight size={16} />
                  </button>
                </div>

              </div>

              {/* 4 Large Category Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 w-fit"><FileText size={20} /></div>
                  <h3 className="font-extrabold text-slate-900 text-xs">📝 Formal Exams</h3>
                  <p className="text-[10px] text-slate-500">3 Active Sessions</p>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[9px] font-extrabold">
                    Next: Today 2:00 PM
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 w-fit"><CheckSquare size={20} /></div>
                  <h3 className="font-extrabold text-slate-900 text-xs">📄 Practice Tests</h3>
                  <p className="text-[10px] text-slate-500">5 Active Tests</p>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-extrabold">
                    Open Anytime
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 w-fit"><Video size={20} /></div>
                  <h3 className="font-extrabold text-slate-900 text-xs">💻 Online Streams</h3>
                  <p className="text-[10px] text-slate-500">1 Stream Live Now</p>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[9px] font-extrabold animate-pulse">
                    Live Stream
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 w-fit"><Building2 size={20} /></div>
                  <h3 className="font-extrabold text-slate-900 text-xs">🏫 Physical Classes</h3>
                  <p className="text-[10px] text-slate-500">Room 2B Active</p>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[9px] font-extrabold">
                    Today 11:00 AM
                  </span>
                </div>
              </div>

              {/* Active School Activities (With Access Lock Rule) */}
              <div className="space-y-3">
                <h3 className="font-black text-slate-900 text-xs flex items-center justify-between">
                  <span>School Active Activities</span>
                  <span className="text-[10px] text-slate-400 font-normal">Code Required to Join</span>
                </h3>

                {[
                  { id: '1', title: 'Priority Signs & Right of Way Masterclass', type: 'Online Class', teacher: 'Teacher Eric Mugisha', time: '09:00 AM - 10:30 AM', status: 'Live Now' },
                  { id: '2', title: 'Traffic Signs & Markings Lab Session', type: 'Physical Classroom', teacher: 'Teacher Eric Mugisha', time: '11:00 AM - 12:30 PM', status: 'Upcoming' },
                  { id: '3', title: 'National Provisional Theory Exam Bank A', type: 'Exam', teacher: 'Teacher Eric Mugisha', time: 'Available All Day', status: 'Available' },
                  { id: '4', title: 'Road Rule Quick Mastery Practice Test', type: 'Test', teacher: 'Teacher Eric Mugisha', time: 'Unlimited Practice', status: 'Available' },
                ].map(act => (
                  <div key={act.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          act.type === 'Online Class' ? 'bg-rose-100 text-rose-800' :
                          act.type === 'Physical Classroom' ? 'bg-indigo-100 text-indigo-800' :
                          act.type === 'Exam' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {act.type}
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-xs mt-1">{act.title}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Instructor: {act.teacher} • {act.time}</p>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg"><Lock size={11} /> Locked</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-600 text-[10px] font-bold">
                        <Lock size={12} /> Access Code Required
                      </div>
                      <button
                        onClick={() => { setAccessCode(''); setCodeError(null); showToast('Enter the teacher-provided code above to unlock this activity.'); }}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] transition-all flex items-center gap-1 shadow-xs"
                      >
                        Enter Code to Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: STUDENT PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs text-center space-y-3">
                <div className="w-20 h-20 rounded-3xl overflow-hidden mx-auto border-4 border-blue-100 shadow-md">
                  <img src={studentInfo.photo} alt={studentInfo.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">{studentInfo.name}</h2>
                  <p className="text-xs font-mono font-bold text-blue-600">{studentInfo.studentId}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{studentInfo.schoolName}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                  <div className="p-2.5 bg-blue-50 rounded-2xl">
                    <span className="text-[10px] text-slate-500 block font-medium">Avg Score</span>
                    <strong className="text-blue-700 font-black text-sm">{studentInfo.avgScore}%</strong>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-2xl">
                    <span className="text-[10px] text-slate-500 block font-medium">Attendance</span>
                    <strong className="text-emerald-700 font-black text-sm">{studentInfo.attendanceRate}%</strong>
                  </div>
                  <div className="p-2.5 bg-purple-50 rounded-2xl">
                    <span className="text-[10px] text-slate-500 block font-medium">Certificates</span>
                    <strong className="text-purple-700 font-black text-sm">{studentInfo.certificatesCount} Earned</strong>
                  </div>
                </div>
              </div>

              {/* Student Detailed Information List */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
                <h3 className="font-black text-slate-900 text-xs pb-2 border-b border-slate-100">Personal & Course Details</h3>
                
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Phone Number:</span>
                    <strong className="text-slate-800 font-bold">{studentInfo.phone}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Email Address:</span>
                    <strong className="text-slate-800 font-bold">{studentInfo.email}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Enrolled Category:</span>
                    <strong className="text-blue-600 font-bold">{studentInfo.courseName}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Instructor:</span>
                    <strong className="text-slate-800 font-bold">{studentInfo.instructorName}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Enrollment Date:</span>
                    <strong className="text-slate-800 font-bold">{studentInfo.enrollmentDate}</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Course Expiry Date:</span>
                    <strong className="text-rose-600 font-bold">{studentInfo.courseExpiry}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={() => showToast('📥 Category B Theory Completion Certificate downloaded!')}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Download Official Certificate
                </button>

                <button
                  onClick={() => setShowEditProfileModal(true)}
                  className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Edit size={16} /> Edit Profile Details
                </button>

                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Lock size={16} /> Change Account Password
                </button>

                <button
                  onClick={() => showToast('👋 Logged out safely')}
                  className="w-full py-3 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-extrabold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={16} /> Logout from App
                </button>
              </div>
            </div>
          )}

        </main>

        {/* BOTTOM NAVIGATION BAR (Android & iPhone Touch Navigation) */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md sm:max-w-xl bg-white border-t border-slate-200/80 px-6 py-2 z-40 flex items-center justify-around shadow-lg">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'dashboard' ? 'text-blue-600 font-black scale-105' : 'text-slate-400 font-bold hover:text-slate-600'
            }`}
          >
            <BookOpen size={20} />
            <span className="text-[10px]">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('classes')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'classes' ? 'text-blue-600 font-black scale-105' : 'text-slate-400 font-bold hover:text-slate-600'
            }`}
          >
            <Video size={20} />
            <span className="text-[10px]">Classes</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'profile' ? 'text-blue-600 font-black scale-105' : 'text-slate-400 font-bold hover:text-slate-600'
            }`}
          >
            <User size={20} />
            <span className="text-[10px]">Profile</span>
          </button>
        </nav>

        {/* NOTIFICATIONS DRAWER OVERLAY */}
        {showNotifications && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
            <div className="bg-white w-full max-w-sm h-full shadow-2xl p-5 overflow-y-auto space-y-4 animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell size={18} className="text-blue-600" />
                  <h3 className="font-black text-slate-900 text-sm">Notifications</h3>
                </div>
                <button onClick={() => setShowNotifications(false)} className="p-1.5 rounded-xl bg-slate-100 text-slate-600">
                  <X size={16} />
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="w-full py-2 rounded-xl bg-blue-50 text-blue-600 font-bold text-xs hover:bg-blue-100 transition-all"
                >
                  Mark all as read
                </button>
              )}

              <div className="space-y-2.5">
                {notifications.map(n => (
                  <div key={n.id} className={`p-3 rounded-2xl border text-xs space-y-1 ${n.unread ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-900">{n.title}</h4>
                      <span className="text-[9px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* REAL LIVE CLASSROOM OVERLAY */}
        {activeJoinedView === 'online_class' && (
          <StudentLiveRoom
            classId={accessCode || 'LIVE-ROOM'}
            classTitle={joinedActivityTitle || 'Online Driving Theory Class'}
            instructorName={studentInfo.instructorName || 'Teacher Eric Mugisha'}
            accessCode={accessCode || 'LIVE-CODE'}
            studentId={studentInfo.studentId}
            studentName={studentInfo.name}
            onLeave={() => {
              setActiveJoinedView('none');
              showToast('Left live class');
            }}
          />
        )}

        {/* FULL MOBILE OVERLAY FOR PHYSICAL CLASS, EXAM, TEST */}
        {activeJoinedView !== 'none' && activeJoinedView !== 'online_class' && (
          <div className="fixed inset-0 z-50 bg-slate-900 text-white overflow-y-auto flex justify-center">
            <div className="w-full max-w-md bg-slate-900 min-h-screen flex flex-col p-4 space-y-4">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider">
                    {activeJoinedView === 'physical_class' ? 'PHYSICAL CLASSROOM' : activeJoinedView === 'exam' ? 'FORMAL EXAM' : 'PRACTICE TEST'}
                  </span>
                  <h3 className="font-black text-white text-sm mt-1">{joinedActivityTitle}</h3>
                </div>
                <button
                  onClick={() => {
                    setActiveJoinedView('none');
                    showToast('Left activity room');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                >
                  Leave
                </button>
              </div>

              {/* VIEW 2: PHYSICAL CLASSROOM TEST ENGINE */}
              {activeJoinedView === 'physical_class' && (
                <div className="space-y-4">
                  {/* Loading State */}
                  {physLoading && (
                    <div className="flex flex-col items-center justify-center py-16 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center animate-pulse">
                        <Building2 size={24} className="text-indigo-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-300">Connecting to classroom...</p>
                      <p className="text-xs text-slate-500">Loading your questions from the server</p>
                    </div>
                  )}

                  {/* Test Finished — Results Screen */}
                  {!physLoading && physFinished && physScore !== null && (
                    <div className="space-y-4">
                      <div className={`rounded-2xl p-5 border text-center space-y-3 ${
                        physScore / (physDbQuestions.length || 20) >= 0.6
                          ? 'bg-emerald-950/80 border-emerald-500/40'
                          : 'bg-rose-950/80 border-rose-500/40'
                      }`}>
                        <div className="text-5xl">{physScore / (physDbQuestions.length || 20) >= 0.6 ? '🎉' : '📚'}</div>
                        <div>
                          <p className="font-black text-white text-2xl">{physScore} / {physDbQuestions.length || 20}</p>
                          <p className="text-sm font-bold mt-1 ${physScore / (physDbQuestions.length || 20) >= 0.6 ? 'text-emerald-400' : 'text-rose-400'}">
                            {physScore / (physDbQuestions.length || 20) >= 0.6 ? '✅ PASSED — Well Done!' : '❌ Not Passed — Keep Studying'}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-slate-900/60 p-2 rounded-xl">
                            <p className="text-emerald-400 font-black text-base">{physScore}</p>
                            <p className="text-slate-400 font-medium">Correct</p>
                          </div>
                          <div className="bg-slate-900/60 p-2 rounded-xl">
                            <p className="text-rose-400 font-black text-base">{(physDbQuestions.length || 20) - physScore}</p>
                            <p className="text-slate-400 font-medium">Wrong</p>
                          </div>
                          <div className="bg-slate-900/60 p-2 rounded-xl">
                            <p className="text-blue-400 font-black text-base">{Math.round((physScore / (physDbQuestions.length || 20)) * 100)}%</p>
                            <p className="text-slate-400 font-medium">Score</p>
                          </div>
                        </div>
                        {physSubmitting && <p className="text-xs text-slate-400 animate-pulse">Saving results to server...</p>}
                      </div>
                      <button
                        onClick={() => setActiveJoinedView('none')}
                        className="w-full py-3 rounded-2xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-all"
                      >
                        Return to Dashboard
                      </button>
                    </div>
                  )}

                  {/* Active Test Engine */}
                  {!physLoading && !physFinished && physDbQuestions.length > 0 && (
                    <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-4">
                      {/* Header: Timer & Progress */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">Question {physQuestionIndex + 1} of {physDbQuestions.length}</span>
                          <span className={`font-mono text-xs font-black ${
                            physRemainingSeconds < 60 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                          }`}>
                            ⏱ {String(Math.floor(physRemainingSeconds / 60)).padStart(2, '0')}:{String(physRemainingSeconds % 60).padStart(2, '0')}
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="flex-1 mx-4">
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: `${((physQuestionIndex + 1) / physDbQuestions.length) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {Object.keys(physUserAnswers).length}/{physDbQuestions.length}
                        </span>
                      </div>

                      {/* Question */}
                      <div className="space-y-3">
                        <h4 className="font-extrabold text-white text-xs leading-relaxed">
                          {physDbQuestions[physQuestionIndex]?.question_text}
                        </h4>
                        <div className="space-y-2 text-xs">
                          {(physDbQuestions[physQuestionIndex]?.options ?? []).map((opt, optIdx) => (
                            <button
                              key={optIdx}
                              onClick={() => setPhysUserAnswers(prev => ({ ...prev, [physQuestionIndex]: optIdx }))}
                              className={`w-full p-3 rounded-2xl text-left font-semibold transition-all border ${
                                physUserAnswers[physQuestionIndex] === optIdx
                                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <span className="font-bold mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Navigation */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                        <button
                          disabled={physQuestionIndex === 0}
                          onClick={() => setPhysQuestionIndex(prev => prev - 1)}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs disabled:opacity-40 hover:bg-slate-700 transition-all"
                        >
                          ← Prev
                        </button>

                        {physQuestionIndex < physDbQuestions.length - 1 ? (
                          <button
                            onClick={() => setPhysQuestionIndex(prev => prev + 1)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all"
                          >
                            Next →
                          </button>
                        ) : (
                          <button
                            onClick={() => void handleSubmitPhysicalTest()}
                            disabled={physSubmitting}
                            className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs hover:bg-emerald-700 transition-all disabled:opacity-60 flex items-center gap-1.5"
                          >
                            {physSubmitting ? 'Submitting...' : '✅ Submit Test'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* No Questions Fallback */}
                  {!physLoading && !physFinished && physDbQuestions.length === 0 && (
                    <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 text-center space-y-3">
                      <Building2 size={32} className="text-indigo-400 mx-auto" />
                      <p className="font-bold text-white text-sm">Classroom Connected</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        You have joined the physical classroom. Your teacher will broadcast a test shortly.
                        Follow the lesson displayed on the projector screen.
                      </p>
                      <div className="bg-slate-900 rounded-xl p-3 text-xs text-slate-300">
                        <p className="font-bold text-indigo-400 mb-1">📡 Waiting for teacher to start test...</p>
                        <p>Session: <span className="font-mono text-white">{joinedActivityTitle}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 3: EXAM SCREEN */}
              {activeJoinedView === 'exam' && (
                <div className="space-y-4">
                  {!examFinished ? (
                    <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-4">
                      {/* Timer & Progress */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Question {examQuestionIndex + 1} of {examQuestions.length}</span>
                          <span className="font-mono text-emerald-400 text-xs font-black">Time Remaining: {formatTime(examRemainingSeconds)}</span>
                        </div>
                        <button
                          onClick={() => {
                            setReviewedLaterQuestions({
                              ...reviewedLaterQuestions,
                              [examQuestionIndex]: !reviewedLaterQuestions[examQuestionIndex]
                            });
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] transition-all ${
                            reviewedLaterQuestions[examQuestionIndex] ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {reviewedLaterQuestions[examQuestionIndex] ? '★ Marked Review' : '☆ Review Later'}
                        </button>
                      </div>

                      {/* Question Card */}
                      <div className="space-y-3">
                        <h4 className="font-extrabold text-white text-xs leading-relaxed">
                          {examQuestions[examQuestionIndex].text}
                        </h4>

                        <div className="space-y-2 text-xs">
                          {examQuestions[examQuestionIndex].options.map((opt, optIdx) => (
                            <button
                              key={optIdx}
                              onClick={() => {
                                setExamUserAnswers({
                                  ...examUserAnswers,
                                  [examQuestionIndex]: optIdx
                                });
                              }}
                              className={`w-full p-3 rounded-2xl text-left font-semibold transition-all border ${
                                examUserAnswers[examQuestionIndex] === optIdx
                                  ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                              }`}
                            >
                              <span className="font-bold mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Nav Buttons */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                        <button
                          disabled={examQuestionIndex === 0}
                          onClick={() => setExamQuestionIndex(prev => prev - 1)}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold disabled:opacity-40"
                        >
                          Previous
                        </button>

                        {examQuestionIndex < examQuestions.length - 1 ? (
                          <button
                            onClick={() => setExamQuestionIndex(prev => prev + 1)}
                            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md"
                          >
                            Next Question
                          </button>
                        ) : (
                          <button
                            onClick={handleFinishExam}
                            className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-extrabold shadow-md"
                          >
                            Submit Exam
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Post Submission Results */
                    <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-2xl mx-auto border-2 border-emerald-400/40">
                        <Award size={32} />
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-white">Exam Completed!</h3>
                        <p className="text-xs text-slate-400 mt-1">Score: <strong className="text-emerald-400 text-base">{examResultScore} / {examQuestions.length}</strong> ({(examResultScore! / examQuestions.length * 100).toFixed(0)}%)</p>
                      </div>

                      <div className="p-3 bg-emerald-950 border border-emerald-500/30 rounded-xl text-xs text-emerald-200">
                        <strong>PASSING RESULT!</strong> Congratulations Uwase Aline, you passed this theory evaluation.
                      </div>

                      <button
                        onClick={() => setActiveJoinedView('none')}
                        className="w-full py-3 rounded-2xl bg-blue-600 text-white font-extrabold text-xs"
                      >
                        Return to Dashboard
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 4: TEST SCREEN */}
              {activeJoinedView === 'test' && (
                <div className="space-y-4">
                  {!testFinished ? (
                    <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                        <span>Practice Test • Question {testQuestionIndex + 1} of {testQuestions.length}</span>
                      </div>

                      <h4 className="font-extrabold text-white text-xs leading-relaxed">
                        {testQuestions[testQuestionIndex].text}
                      </h4>

                      <div className="space-y-2 text-xs">
                        {testQuestions[testQuestionIndex].options.map((opt, optIdx) => (
                          <button
                            key={optIdx}
                            onClick={() => {
                              setTestUserAnswers({ ...testUserAnswers, [testQuestionIndex]: optIdx });
                            }}
                            className={`w-full p-3 rounded-2xl text-left font-semibold transition-all border ${
                              testUserAnswers[testQuestionIndex] === optIdx
                                ? 'bg-amber-500 border-amber-400 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                        <button
                          disabled={testQuestionIndex === 0}
                          onClick={() => setTestQuestionIndex(prev => prev - 1)}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold disabled:opacity-40"
                        >
                          Previous
                        </button>

                        {testQuestionIndex < testQuestions.length - 1 ? (
                          <button
                            onClick={() => setTestQuestionIndex(prev => prev + 1)}
                            className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold"
                          >
                            Next
                          </button>
                        ) : (
                          <button
                            onClick={handleFinishTest}
                            className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-extrabold"
                          >
                            Submit Test
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 text-center space-y-4">
                      <h3 className="text-lg font-black text-white">Test Completed!</h3>
                      <p className="text-xs text-slate-300">Great practice session! Keep solving theory tests to maintain your high average.</p>
                      <button
                        onClick={() => setActiveJoinedView('none')}
                        className="w-full py-3 rounded-2xl bg-blue-600 text-white font-extrabold text-xs"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {/* EDIT PROFILE MODAL */}
        {showEditProfileModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 space-y-4 text-slate-900 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-black text-sm">Edit Profile Details</h3>
                <button onClick={() => setShowEditProfileModal(false)} className="p-1 rounded-xl bg-slate-100 text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                  <input type="text" defaultValue={studentInfo.name} className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input type="text" defaultValue={studentInfo.phone} className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input type="email" defaultValue={studentInfo.email} className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold" />
                </div>
              </div>

              <button
                onClick={() => {
                  setShowEditProfileModal(false);
                  showToast('Profile updated successfully!');
                }}
                className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-xs"
              >
                Save Profile Changes
              </button>
            </div>
          </div>
        )}

        {/* CHANGE PASSWORD MODAL */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 space-y-4 text-slate-900 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-black text-sm">Change Password</h3>
                <button onClick={() => setShowPasswordModal(false)} className="p-1 rounded-xl bg-slate-100 text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Password</label>
                  <input type="password" placeholder="••••••••" className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">New Password</label>
                  <input type="password" placeholder="••••••••" className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold" />
                </div>
              </div>

              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  showToast('Password changed successfully!');
                }}
                className="w-full py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs"
              >
                Update Password
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
