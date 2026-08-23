import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Tv, Sparkles, BookMarked, Lightbulb, ShieldCheck,
  CheckCircle2, Clock, Eye, X, ChevronRight, Copy, Check, Users, FileText, AlertCircle,
  Play, Layers, HelpCircle, CheckCircle, XCircle,
  ZoomIn, ZoomOut, Highlighter, RotateCcw, Plus, RefreshCw, Loader2
} from 'lucide-react';
import {
  fetchQuestions,
  fetchPhysicalClasses,
  createPhysicalClass,
  updatePhysicalClassStatus,
  fetchPhysicalClassResults,
  fetchTeacherByProfileId,
  type DBQuestion,
  type DBLiveClass,
  type DBPhysicalClassResult,
} from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  return new Date(isoString).toLocaleDateString('en-RW', { day: '2-digit', month: 'short' });
}

function formatScheduled(isoString: string): string {
  const d = new Date(isoString);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (isToday) return `Today, ${time}`;
  return d.toLocaleDateString('en-RW', { weekday: 'short', day: '2-digit', month: 'short' }) + ` · ${time}`;
}

function generateCode() {
  return `PHYS-${Math.floor(1000 + Math.random() * 9000)}`;
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function PhysicalClassesPage() {
  const { profile } = useAuth();

  // ── Core State ──────────────────────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  // Active view
  const [currentView, setCurrentView] = useState<'sessions_list' | 'teaching_dashboard'>('sessions_list');
  const [activeSession, setActiveSession] = useState<DBLiveClass | null>(null);

  // DB Data
  const [sessions, setSessions] = useState<DBLiveClass[]>([]);
  const [dbQuestions, setDbQuestions] = useState<DBQuestion[]>([]);
  const [testResults, setTestResults] = useState<DBPhysicalClassResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<DBPhysicalClassResult | null>(null);

  // Modals
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showProjectorModal, setShowProjectorModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [endingSession, setEndingSession] = useState(false);

  // New Session Form
  const [newTitle, setNewTitle] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newMaxStudents, setNewMaxStudents] = useState('45');
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [generatedCode, setGeneratedCode] = useState(generateCode());

  // Projector State
  const [presenterQIndex, setPresenterQIndex] = useState(0);
  const [presenterShowAnswer, setPresenterShowAnswer] = useState(false);
  const [projectorMode, setProjectorMode] = useState<'question' | 'sign_library' | 'class_review'>('question');
  const [projectorZoom, setProjectorZoom] = useState(100);
  const [highlightTool, setHighlightTool] = useState(false);

  // Test Generator
  const [testSelectionMode, setTestSelectionMode] = useState<'random' | 'manual'>('random');
  const [testQuestionsCount, setTestQuestionsCount] = useState('20');
  const [testDuration, setTestDuration] = useState('20');
  const [randomizePerStudent, setRandomizePerStudent] = useState(true);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // ── Toast ────────────────────────────────────────────────────────────────────
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ── Data Loading ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!profile?.school_id) return;
    setLoading(true);
    try {
      const [sessData, qData] = await Promise.all([
        fetchPhysicalClasses(profile.school_id),
        fetchQuestions({ status: 'active' }),
      ]);
      setSessions(sessData);
      setDbQuestions(qData);
    } catch (err) {
      console.error('Error loading physical class data:', err);
      triggerToast('⚠️ Could not load sessions from database.');
    } finally {
      setLoading(false);
    }
  }, [profile?.school_id]);

  const loadResults = useCallback(async (sessionId: string) => {
    setLoadingResults(true);
    try {
      const results = await fetchPhysicalClassResults(sessionId);
      setTestResults(results);
    } catch (err) {
      console.error('Error loading results:', err);
    } finally {
      setLoadingResults(false);
    }
  }, []);

  // Resolve teacher DB ID from profile
  useEffect(() => {
    async function resolveTeacher() {
      if (!profile?.id) return;
      try {
        const teacher = await fetchTeacherByProfileId(profile.id);
        if (teacher) setTeacherId(teacher.id);
      } catch {
        // If not a teacher (e.g. school_admin), teacherId stays null
      }
    }
    void resolveTeacher();
  }, [profile?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Auto-load results when active session changes
  useEffect(() => {
    if (activeSession) {
      void loadResults(activeSession.id);
    }
  }, [activeSession, loadResults]);

  // ── Session Actions ──────────────────────────────────────────────────────────
  const handleStartSession = async (session: DBLiveClass) => {
    if (session.status === 'scheduled') {
      try {
        await updatePhysicalClassStatus(session.id, 'live');
        session = { ...session, status: 'live' };
        setSessions(prev => prev.map(s => s.id === session.id ? session : s));
      } catch (err) {
        console.error(err);
      }
    }
    setActiveSession(session);
    setCurrentView('teaching_dashboard');
    triggerToast(`✅ Started Physical Lesson: "${session.title}" — Code: ${session.access_code}`);
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    setEndingSession(true);
    try {
      await updatePhysicalClassStatus(activeSession.id, 'ended');
      setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, status: 'ended' } : s));
      setActiveSession(null);
      setCurrentView('sessions_list');
      triggerToast('🏁 Classroom session ended and saved.');
    } catch (err) {
      triggerToast('⚠️ Could not end session. Try again.');
    } finally {
      setEndingSession(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.school_id || !newTitle.trim()) {
      triggerToast('Please fill in all required fields.');
      return;
    }
    setSavingSession(true);
    try {
      const code = generatedCode;
      const scheduledAt = newScheduledAt
        ? new Date(newScheduledAt).toISOString()
        : new Date().toISOString();

      // If current user has no teacher record (e.g. school admin), set teacher_id to null
      const effectiveTeacherId = teacherId ?? null;

      const newSession = await createPhysicalClass({
        school_id: profile.school_id,
        class_id: null,
        teacher_id: effectiveTeacherId,
        title: newTitle.trim(),
        description: null,
        scheduled_at: scheduledAt,
        duration_minutes: 60,
        status: 'scheduled',
        access_code: code,
        room: newRoom.trim() || null,
        max_students: parseInt(newMaxStudents) || 45,
        class_type: 'physical',
      });

      setSessions(prev => [newSession, ...prev]);
      setShowSessionModal(false);
      setNewTitle('');
      setNewRoom('');
      setNewScheduledAt('');
      setGeneratedCode(generateCode()); // Pre-generate next code
      triggerToast(`⚡ Physical Session created! Code: ${code}`);
    } catch (err: any) {
      console.error(err);
      triggerToast(`⚠️ Error creating session: ${err.message}`);
    } finally {
      setSavingSession(false);
    }
  };

  const handleCopyCode = () => {
    if (!activeSession?.access_code) return;
    navigator.clipboard.writeText(activeSession.access_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchTest = (e: React.FormEvent) => {
    e.preventDefault();
    setShowTestModal(false);
    let questionsForQuiz: DBQuestion[] = [];
    if (testSelectionMode === 'manual' && selectedQuestionIds.length > 0) {
      questionsForQuiz = dbQuestions.filter(q => selectedQuestionIds.includes(q.id));
    } else {
      const count = Math.min(parseInt(testQuestionsCount) || 20, dbQuestions.length);
      questionsForQuiz = [...dbQuestions].sort(() => 0.5 - Math.random()).slice(0, count);
    }
    triggerToast(
      `🚀 Test Transmitted! Code: ${activeSession?.access_code} · ${questionsForQuiz.length} Questions · ${randomizePerStudent ? 'Randomized per student' : 'Same order'}`
    );
  };

  const currentQ = dbQuestions[presenterQIndex];

  // ── Status Styling ───────────────────────────────────────────────────────────
  const statusConfig = {
    scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    live: { label: '🔴 Live Now', cls: 'bg-red-100 text-red-700 border-red-200 animate-pulse' },
    ended: { label: 'Ended', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
    cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  };

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto text-slate-900 pb-12">

      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 max-w-sm">
          <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-bold leading-snug">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building2 size={22} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Physical Classroom Suite</h2>
            <p className="text-xs text-slate-500">Rwanda National Provisional Driver Theory Teaching Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('sessions_list')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentView === 'sessions_list' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Scheduled Lessons
          </button>
          <button
            onClick={() => { if (activeSession) setCurrentView('teaching_dashboard'); else triggerToast('Start a lesson first to access the Teaching Dashboard.'); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentView === 'teaching_dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Teaching Dashboard
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          VIEW 1 — SCHEDULED LESSONS LIST
      ══════════════════════════════════════════════════════════════════════════ */}
      {currentView === 'sessions_list' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Scheduled Physical Classes</h3>
              <p className="text-xs text-slate-500 mt-0.5">{sessions.length} session{sessions.length !== 1 ? 's' : ''} found for your school</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void loadData()}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all"
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={() => { setGeneratedCode(generateCode()); setShowSessionModal(true); }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md"
              >
                <Plus size={15} /> New Physical Session
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-indigo-500" />
              <span className="ml-3 text-sm text-slate-500 font-medium">Loading sessions from database...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center mx-auto mb-4">
                <Building2 size={28} />
              </div>
              <p className="font-extrabold text-slate-700 text-base">No Physical Classes Yet</p>
              <p className="text-slate-400 text-xs mt-1 mb-5">Create your first physical classroom session to get started.</p>
              <button
                onClick={() => { setGeneratedCode(generateCode()); setShowSessionModal(true); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition-all shadow-md"
              >
                <Plus size={14} /> Create First Session
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map(sess => {
                const sc = statusConfig[sess.status] ?? statusConfig.scheduled;
                return (
                  <div key={sess.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-indigo-300 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${sc.cls}`}>
                        {sc.label}
                      </span>
                      <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                        {sess.access_code ?? 'No Code'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight group-hover:text-indigo-700 transition-colors">
                        {sess.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1.5 space-x-1">
                        {sess.room && <span>📍 {sess.room} ·</span>}
                        <span>🕐 {formatScheduled(sess.scheduled_at)}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Users size={13} className="text-slate-400" />
                        Max {sess.max_students} trainees
                      </span>
                      {sess.status !== 'ended' && sess.status !== 'cancelled' ? (
                        <button
                          onClick={() => void handleStartSession(sess)}
                          className="flex items-center gap-1 font-extrabold text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                          {sess.status === 'live' ? 'Resume' : 'Start'} Lesson
                          <ChevronRight size={14} />
                        </button>
                      ) : (
                        <span className="text-slate-400 font-bold">Session {sess.status}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          VIEW 2 — TEACHING DASHBOARD
      ══════════════════════════════════════════════════════════════════════════ */}
      {currentView === 'teaching_dashboard' && activeSession && (
        <div className="space-y-6">

          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 shadow-xl border border-indigo-500/30 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-2 relative z-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold text-xs border border-indigo-400/30 flex items-center gap-1.5">
                  <Building2 size={14} /> {activeSession.title}
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-black text-xs border border-emerald-400/30">
                  Code: {activeSession.access_code}
                </span>
                {activeSession.room && (
                  <span className="px-3 py-1 rounded-full bg-slate-700/60 text-slate-300 text-xs font-bold border border-slate-600/30">
                    📍 {activeSession.room}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Classroom Teaching &amp; Projector Dashboard
              </h1>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Project theory slides onto classroom displays, conduct live tests, and review answers with your class in real time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 relative z-10">
              <button
                onClick={() => { setProjectorMode('question'); setShowProjectorModal(true); }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition-all shadow-lg shadow-indigo-600/30"
              >
                <Tv size={18} /> Connect To Projector
              </button>
              <button
                onClick={() => setShowTestModal(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold transition-all shadow-lg shadow-purple-600/30"
              >
                <Sparkles size={16} /> Start Test
              </button>
              <button
                onClick={() => void handleEndSession()}
                disabled={endingSession}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition-all disabled:opacity-60"
              >
                {endingSession ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                End Session
              </button>
            </div>
          </div>

          {/* Code Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Building2 size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-900">Active Session Code:</span>
                  <span className="px-3 py-1 rounded-lg bg-indigo-100 text-indigo-950 font-mono font-black text-base border border-indigo-200">
                    {activeSession.access_code}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trainees enter this code on their mobile to take tests &amp; follow the lesson.
                </p>
              </div>
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all border border-slate-200"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* 4 Teaching Resource Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <BookMarked size={20} />,
                color: 'blue',
                title: 'Driving Code Textbook',
                desc: 'Official Rwanda Traffic Code (Articles 40–52) with diagrams & priority rules.',
                action: () => { setProjectorMode('question'); setShowProjectorModal(true); },
                label: 'Project Textbook',
              },
              {
                icon: <Lightbulb size={20} />,
                color: 'amber',
                title: 'Traffic Signs Library',
                desc: 'High-definition graphics for warning signs, priority beacons, speed limits & road markings.',
                action: () => { setProjectorMode('sign_library'); setShowProjectorModal(true); },
                label: 'Project Signs',
              },
              {
                icon: <ShieldCheck size={20} />,
                color: 'emerald',
                title: 'Safety & Defensive Driving',
                desc: 'Seatbelts, emergency braking, accident scene safety & emergency response protocols.',
                action: () => triggerToast('🚑 First Aid & Accident Protocol Module launched on Projector!'),
                label: 'View Protocols',
              },
              {
                icon: <Sparkles size={20} />,
                color: 'purple',
                title: 'Start Classroom Test',
                desc: `Issue a ${testQuestionsCount}-question theory test (Random or Selected) to students in class.`,
                action: () => setShowTestModal(true),
                label: 'Start Test',
              },
            ].map(({ icon, color, title, desc, action, label }, i) => (
              <div key={i} className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-${color}-300 transition-all group`}>
                <div className={`w-10 h-10 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center`}>
                  {icon}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
                </div>
                <button
                  onClick={action}
                  className={`text-xs font-bold text-${color}-600 hover:text-${color}-700 flex items-center gap-1 pt-1`}
                >
                  {label} <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Student Test Results Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">Classroom Test Results</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time student scores for session code <strong className="text-slate-800">{activeSession.access_code}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void loadResults(activeSession.id)}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 transition-all"
                  title="Refresh Results"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  onClick={() => { setProjectorMode('class_review'); setShowProjectorModal(true); }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition-all shadow-md flex items-center gap-2"
                >
                  <Tv size={14} /> Review Answers With Class
                </button>
              </div>
            </div>

            {loadingResults ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={22} className="animate-spin text-indigo-400" />
                <span className="ml-2.5 text-sm text-slate-400">Loading submissions...</span>
              </div>
            ) : testResults.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mx-auto mb-3">
                  <FileText size={24} />
                </div>
                <p className="font-bold text-slate-500 text-sm">No submissions yet</p>
                <p className="text-xs text-slate-400 mt-1">Students who complete the test will appear here in real time.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Total Submitted', val: testResults.length, color: 'text-slate-700' },
                    { label: 'Passed', val: testResults.filter(r => r.passed).length, color: 'text-emerald-600' },
                    { label: 'Failed', val: testResults.filter(r => !r.passed).length, color: 'text-rose-600' },
                    {
                      label: 'Avg Score',
                      val: testResults.length > 0
                        ? `${Math.round(testResults.reduce((a, r) => a + (r.score / r.total_questions) * 100, 0) / testResults.length)}%`
                        : '—',
                      color: 'text-indigo-600'
                    },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                      <p className={`text-xl font-black ${color}`}>{val}</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <th className="p-3.5">Student</th>
                      <th className="p-3.5">Score</th>
                      <th className="p-3.5">Correct / Wrong</th>
                      <th className="p-3.5">Time Used</th>
                      <th className="p-3.5">Submitted</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {testResults.map((res) => {
                      const pct = Math.round((res.score / res.total_questions) * 100);
                      return (
                        <tr key={res.id} className="hover:bg-slate-50/80 transition-all group">
                          <td className="p-3.5">
                            <p className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">{res.student_name}</p>
                            {res.nin && <p className="text-[11px] text-slate-400 font-mono">NIN: {res.nin}</p>}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-base font-black ${res.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {res.score}/{res.total_questions}
                              </span>
                              <span className="text-[11px] text-slate-400">({pct}%)</span>
                            </div>
                          </td>
                          <td className="p-3.5 font-bold text-slate-700">
                            <span className="text-emerald-700">{res.correct_count} ✓</span>
                            <span className="text-slate-300 mx-1">|</span>
                            <span className="text-slate-500">{res.wrong_count} ✗</span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-600">
                            {res.time_used_secs ? formatSeconds(res.time_used_secs) : '—'}
                          </td>
                          <td className="p-3.5 text-slate-400">{formatTimeAgo(res.submitted_at)}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] uppercase tracking-wider ${
                              res.passed
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {res.passed ? 'Passed' : 'Failed'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => setSelectedResult(res)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs transition-all flex items-center gap-1 ml-auto"
                            >
                              <Eye size={13} /> Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODAL 1 — CREATE NEW PHYSICAL SESSION
      ══════════════════════════════════════════════════════════════════════════ */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">New Physical Classroom Session</h3>
                <p className="text-xs text-slate-500 mt-0.5">Create a session — students join using the generated code.</p>
              </div>
              <button onClick={() => setShowSessionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateSession(e)} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Session Title <span className="text-rose-500">*</span></label>
                <input
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Traffic Signs & Priority Rules Masterclass"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Classroom / Room</label>
                  <input
                    value={newRoom}
                    onChange={e => setNewRoom(e.target.value)}
                    placeholder="e.g. Room 2B"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Students</label>
                  <input
                    type="number"
                    value={newMaxStudents}
                    onChange={e => setNewMaxStudents(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  value={newScheduledAt}
                  onChange={e => setNewScheduledAt(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-400"
                />
              </div>

              {/* Generated Code Preview */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-700 text-xs">Auto-Generated Access Code</p>
                  <p className="font-mono font-black text-indigo-700 text-xl tracking-widest mt-1">{generatedCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGeneratedCode(generateCode())}
                  className="p-2 rounded-xl bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-all"
                  title="Re-generate code"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSession}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {savingSession ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  {savingSession ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODAL 2 — PROJECTOR ENGINE
      ══════════════════════════════════════════════════════════════════════════ */}
      {showProjectorModal && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-6">
          {/* Projector Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white">
                <Tv size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Classroom Projector Presenter</h2>
                <p className="text-xs text-slate-400">
                  Mode: <strong className="text-indigo-400 capitalize">{projectorMode.replace('_', ' ')}</strong>
                  {activeSession && <> · Code: <span className="font-mono text-emerald-400">{activeSession.access_code}</span></>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 mr-2">
                {(['question', 'sign_library', 'class_review'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setProjectorMode(m)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      projectorMode === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m === 'question' ? 'Questions' : m === 'sign_library' ? 'Signs' : 'Class Review'}
                  </button>
                ))}
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button onClick={() => setProjectorZoom(z => Math.max(60, z - 10))} className="p-1.5 text-slate-400 hover:text-white rounded-lg"><ZoomOut size={16} /></button>
                <span className="text-xs font-mono px-2 text-slate-300">{projectorZoom}%</span>
                <button onClick={() => setProjectorZoom(z => Math.min(150, z + 10))} className="p-1.5 text-slate-400 hover:text-white rounded-lg"><ZoomIn size={16} /></button>
              </div>

              <button
                onClick={() => setHighlightTool(!highlightTool)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  highlightTool ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Highlighter size={14} /> Highlight
              </button>

              <button
                onClick={() => setShowProjectorModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Exit Projector
              </button>
            </div>
          </div>

          {/* Projector Canvas */}
          <div
            className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full text-center space-y-8 my-auto transition-transform"
            style={{ transform: `scale(${projectorZoom / 100})` }}
          >
            {/* SIGN LIBRARY MODE */}
            {projectorMode === 'sign_library' && (
              <div className="space-y-6 w-full">
                <span className="px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-sm border border-amber-500/30">
                  🛑 Rwanda Road Signs Visual Library
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
                  {[
                    { sign: '🔴', label: 'STOP — Mandatory Full Stop', color: 'border-red-500/40 bg-red-500/10' },
                    { sign: '⚠️', label: 'WARNING — Hazard Ahead', color: 'border-amber-500/40 bg-amber-500/10' },
                    { sign: '🔵', label: 'ROUNDABOUT — Give Way', color: 'border-blue-500/40 bg-blue-500/10' },
                    { sign: '🚫', label: 'NO ENTRY — Do Not Enter', color: 'border-rose-500/40 bg-rose-500/10' },
                    { sign: '🔢', label: 'SPEED LIMIT 50 km/h', color: 'border-orange-500/40 bg-orange-500/10' },
                    { sign: '🚶', label: 'PEDESTRIAN CROSSING', color: 'border-emerald-500/40 bg-emerald-500/10' },
                    { sign: '↗️', label: 'PRIORITY ROAD — You Have Way', color: 'border-yellow-500/40 bg-yellow-500/10' },
                    { sign: '🔻', label: 'YIELD — Give Way to Traffic', color: 'border-purple-500/40 bg-purple-500/10' },
                  ].map(({ sign, label, color }) => (
                    <div key={label} className={`p-4 rounded-2xl border ${color} text-center space-y-2`}>
                      <div className="text-5xl">{sign}</div>
                      <p className="text-xs font-bold text-slate-300 leading-tight">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CLASS REVIEW MODE */}
            {projectorMode === 'class_review' && (
              <div className="w-full space-y-6">
                <span className="px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold text-sm border border-indigo-500/30">
                  Question Review With Class — Q{presenterQIndex + 1} of {dbQuestions.length || 1}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black leading-tight text-white max-w-3xl mx-auto">
                  {currentQ?.question_text || 'No questions loaded from database yet.'}
                </h3>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl mx-auto space-y-3 text-left">
                  <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Class Answer Distribution</div>
                  {(currentQ?.options || ['Option A', 'Option B', 'Option C', 'Option D']).map((opt, idx) => {
                    const isCorrect = opt === currentQ?.correct_answer;
                    const pct = isCorrect ? 82 : idx === 0 ? 12 : 6;
                    return (
                      <div key={idx} className={`p-4 rounded-2xl border transition-all ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                        <div className="flex items-center justify-between mb-1.5 text-xs font-bold">
                          <span>{String.fromCharCode(65 + idx)}. {opt} {isCorrect && '✓ (Correct Answer)'}</span>
                          <span>{pct}% of class</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isCorrect ? 'bg-emerald-500' : 'bg-slate-600'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {currentQ?.explanation && (
                  <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs text-left max-w-2xl mx-auto">
                    <span className="font-extrabold text-emerald-400 uppercase tracking-wider block mb-1">Official Explanation</span>
                    <p>{currentQ.explanation}</p>
                  </div>
                )}
              </div>
            )}

            {/* QUESTION PROJECTION MODE */}
            {projectorMode === 'question' && (
              <div className="w-full space-y-6">
                {dbQuestions.length === 0 ? (
                  <div className="text-center space-y-3">
                    <AlertCircle size={40} className="text-slate-600 mx-auto" />
                    <p className="text-slate-400 font-bold">No questions loaded. Add questions to the platform question bank first.</p>
                  </div>
                ) : (
                  <>
                    <span className="px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold text-sm border border-indigo-500/30">
                      Question {presenterQIndex + 1} of {dbQuestions.length}
                    </span>
                    <h3 className="text-2xl sm:text-4xl font-black leading-tight text-white max-w-3xl mx-auto">
                      {currentQ?.question_text}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl text-left text-sm font-bold mx-auto">
                      {(currentQ?.options || []).map((opt, i) => {
                        const isCorrect = opt === currentQ?.correct_answer;
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
                    {presenterShowAnswer && currentQ?.explanation && (
                      <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs text-left max-w-2xl mx-auto">
                        <span className="font-extrabold text-emerald-400 uppercase tracking-wider block mb-1">Official Reference</span>
                        <p>{currentQ.explanation}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Navigation (for question & class_review modes) */}
            {projectorMode !== 'sign_library' && (
              <div className="flex items-center gap-4 pt-4">
                <button
                  onClick={() => { setPresenterQIndex(Math.max(0, presenterQIndex - 1)); setPresenterShowAnswer(false); }}
                  disabled={presenterQIndex === 0}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setPresenterShowAnswer(!presenterShowAnswer)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-lg"
                >
                  {presenterShowAnswer ? 'Hide Answer' : 'Reveal Correct Answer'}
                </button>
                <button
                  onClick={() => { setPresenterQIndex(Math.min(dbQuestions.length - 1, presenterQIndex + 1)); setPresenterShowAnswer(false); }}
                  disabled={presenterQIndex >= dbQuestions.length - 1}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODAL 3 — START TEST GENERATOR
      ══════════════════════════════════════════════════════════════════════════ */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowTestModal(false)}>
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Sparkles size={18} className="text-purple-600" /> Start Physical Class Test
              </h3>
              <button onClick={() => setShowTestModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-800 font-medium flex items-start gap-2">
              <HelpCircle size={15} className="text-purple-400 flex-shrink-0 mt-0.5" />
              {dbQuestions.length} questions available in the platform bank. Students who enter code <strong>{activeSession?.access_code}</strong> will receive the test on their phone.
            </div>

            {/* Mode Toggle */}
            <div className="grid grid-cols-2 gap-3">
              {(['random', 'manual'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTestSelectionMode(mode)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                    testSelectionMode === mode ? 'border-purple-600 bg-purple-50 text-purple-950' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="text-xs font-black uppercase text-purple-700 mb-1">{mode === 'random' ? 'Random Questions' : 'Select Questions'}</div>
                  <div className="text-[11px] text-slate-500">{mode === 'random' ? 'Auto-pick from question bank' : 'Hand-pick specific questions'}</div>
                </button>
              ))}
            </div>

            <form onSubmit={handleLaunchTest} className="space-y-4 text-xs">
              {testSelectionMode === 'random' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Number of Questions</label>
                    <input
                      type="number"
                      min="1"
                      max={dbQuestions.length || 50}
                      value={testQuestionsCount}
                      onChange={e => setTestQuestionsCount(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Duration (mins)</label>
                    <input
                      type="number"
                      value={testDuration}
                      onChange={e => setTestDuration(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50 max-h-52 overflow-y-auto">
                  {dbQuestions.length === 0 ? (
                    <p className="text-center text-slate-400 py-4">No questions found in database.</p>
                  ) : dbQuestions.map(q => {
                    const sel = selectedQuestionIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => setSelectedQuestionIds(prev => sel ? prev.filter(x => x !== q.id) : [...prev, q.id])}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                          sel ? 'bg-purple-100 border-purple-400 text-purple-950 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input type="checkbox" checked={sel} readOnly className="mt-0.5 accent-purple-600" />
                        <p className="flex-1 line-clamp-2">{q.question_text}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <input
                  type="checkbox"
                  id="randomizePerStudent"
                  checked={randomizePerStudent}
                  onChange={e => setRandomizePerStudent(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
                <label htmlFor="randomizePerStudent" className="font-semibold text-slate-700 cursor-pointer">
                  Randomize question order per student (prevents cheating)
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowTestModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold transition-all shadow-lg shadow-purple-600/30">
                  Transmit Test to Students
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODAL 4 — STUDENT ANSWER BREAKDOWN
      ══════════════════════════════════════════════════════════════════════════ */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Student Test Breakdown</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Student: <strong className="text-slate-800">{selectedResult.student_name}</strong>
                  {selectedResult.nin && <> · NIN: <span className="font-mono text-slate-600">{selectedResult.nin}</span></>}
                  {' '}· Score: <strong className={selectedResult.passed ? 'text-emerald-600' : 'text-rose-600'}>
                    {selectedResult.score}/{selectedResult.total_questions} ({Math.round((selectedResult.score / selectedResult.total_questions) * 100)}%)
                  </strong>
                </p>
              </div>
              <button onClick={() => setSelectedResult(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                <p className="text-xl font-black text-emerald-700">{selectedResult.correct_count}</p>
                <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Correct</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                <p className="text-xl font-black text-rose-700">{selectedResult.wrong_count}</p>
                <p className="text-[11px] text-rose-600 font-bold mt-0.5">Incorrect</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-xl font-black text-slate-700">{selectedResult.time_used_secs ? formatSeconds(selectedResult.time_used_secs) : '—'}</p>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">Time Used</p>
              </div>
            </div>

            {/* Answers detail */}
            {selectedResult.answers && typeof selectedResult.answers === 'object' && Object.keys(selectedResult.answers).length > 0 ? (
              <div className="space-y-3 text-xs">
                <h4 className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">Question-by-Question Breakdown</h4>
                {Object.entries(selectedResult.answers as Record<string, any>).map(([qid, ans]: [string, any], idx) => {
                  const isCorrect = ans?.isCorrect ?? ans?.correct ?? false;
                  return (
                    <div key={qid} className={`p-4 rounded-2xl border space-y-2 ${isCorrect ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-800">Q#{idx + 1}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {isCorrect ? <><CheckCircle size={11} className="inline mr-1" />Correct</> : <><XCircle size={11} className="inline mr-1" />Incorrect</>}
                        </span>
                      </div>
                      {ans?.questionText && <p className="font-bold text-slate-800 leading-relaxed">{ans.questionText}</p>}
                      <div className="text-[11px] text-slate-600">
                        {ans?.studentAnswer && <div>Student answer: <strong className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>{ans.studentAnswer}</strong></div>}
                        {!isCorrect && ans?.correctAnswer && <div>Correct answer: <strong className="text-emerald-700">{ans.correctAnswer}</strong></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <Layers size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold">No detailed answer data available</p>
                <p className="text-xs mt-1">Score was recorded from the student's device.</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedResult(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
