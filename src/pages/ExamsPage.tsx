import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Search, Filter, ChevronRight, X, Check,
  Clock, Users, Shuffle, Lock, Unlock, Copy, QrCode,
  BarChart2, Play, CheckCircle2, AlertCircle, Trophy,
  Eye, Download, RefreshCw, Zap, Target, BookOpen,
  Timer, Award, TrendingUp, Hash, Star, ArrowRight, Layers
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchExams, fetchQuestions, createExam,
  fetchTeacherByProfileId,
  type DBExam, type DBQuestion
} from '@/lib/db';

// Safety timeout to prevent infinite loading if Supabase is unreachable
const LOAD_TIMEOUT_MS = 6000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ExamConfig {
  title: string;
  description: string;
  category: string;
  difficulty: 'all' | 'easy' | 'medium' | 'hard';
  questionCount: number;
  durationMinutes: number;
  passMark: number;
  attemptsAllowed: number;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  selectionMode: 'random' | 'manual';
  selectedQuestionIds: string[];
  maxStudents: number;
  availableFrom: string;
  availableTo: string;
}

interface LiveStudentEntry {
  id: string;
  name: string;
  progress: number; // 0–100
  status: 'waiting' | 'in-progress' | 'completed' | 'absent';
  score?: number;
  correct?: number;
  wrong?: number;
  timeUsed?: string;
  rank?: number;
}

const CATEGORIES = ['All', 'Traffic Signs', 'Road Rules', 'First Aid', 'Vehicle Safety', 'Parking'];
const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'] as const;

function generateExamCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock live students for monitoring UI
// ─────────────────────────────────────────────────────────────────────────────
function buildMockStudents(): LiveStudentEntry[] {
  const names = [
    'Mugisha Jean', 'Uwase Alice', 'Habimana Eric', 'Iradukunda Claire',
    'Nshimiyimana Paul', 'Umutoni Grace', 'Bizimana David', 'Ingabire Sandra',
  ];
  return names.map((name, i) => {
    const done = i < 3;
    const inprog = i >= 3 && i < 6;
    return {
      id: `s-${i}`,
      name,
      progress: done ? 100 : inprog ? Math.floor(30 + Math.random() * 60) : 0,
      status: done ? 'completed' : inprog ? 'in-progress' : i === 6 ? 'absent' : 'waiting',
      score: done ? [88, 72, 95][i] : undefined,
      correct: done ? [22, 18, 24][i] : undefined,
      wrong: done ? [3, 7, 1][i] : undefined,
      timeUsed: done ? [`24m 10s`, `31m 55s`, `18m 02s`][i] : undefined,
      rank: done ? [2, 3, 1][i] : undefined,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatBadge({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${color}`}>
      <span className="opacity-80">{icon}</span>
      <div>
        <div className="text-xs font-semibold opacity-70">{label}</div>
        <div className="text-lg font-black">{value}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ExamsPage() {
  const { profile } = useAuth();

  // ── Data state ──
  const [exams, setExams] = useState<DBExam[]>([]);
  const [questions, setQuestions] = useState<DBQuestion[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── UI state ──
  const [view, setView] = useState<'list' | 'create' | 'monitor' | 'results'>('list');
  const [activeExam, setActiveExam] = useState<DBExam | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState(false);
  const [liveStudents] = useState<LiveStudentEntry[]>(buildMockStudents());
  const [liveCountdown, setLiveCountdown] = useState(45 * 60); // 45 min in secs
  const [monitorRunning, setMonitorRunning] = useState(false);

  // ── Exam creation form ──
  const [config, setConfig] = useState<ExamConfig>({
    title: '',
    description: '',
    category: 'Traffic Signs',
    difficulty: 'all',
    questionCount: 25,
    durationMinutes: 45,
    passMark: 70,
    attemptsAllowed: 1,
    randomizeQuestions: true,
    randomizeAnswers: true,
    selectionMode: 'random',
    selectedQuestionIds: [],
    maxStudents: 30,
    availableFrom: '',
    availableTo: '',
  });
  const [examCode, setExamCode] = useState<string>('');
  const [generatedExam, setGeneratedExam] = useState<DBExam | null>(null);
  const [creating, setCreating] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);

  // ── Question filter for manual selection ──
  const [qSearch, setQSearch] = useState('');
  const [qCategory, setQCategory] = useState('All');

  // ── Load data ──
  // Use profile.school_id directly — available for all roles (school_admin, teacher).
  // Avoid a separate teacher-table fetch which can hang if offline or no record exists.
  useEffect(() => {
    if (!profile) return;

    const sid = profile.school_id ?? null;
    setSchoolId(sid);

    if (!sid) {
      // super_admin or role without a school — show empty state immediately
      setLoading(false);
      return;
    }

    setLoadError(null);
    setLoading(true);

    // Safety escape-hatch: if Supabase is unreachable, stop spinning after 6 s
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setLoadError('Could not load exams — check your internet connection and try again.');
    }, LOAD_TIMEOUT_MS);

    Promise.all([fetchExams(sid), fetchQuestions()])
      .then(([examList, qList]) => {
        clearTimeout(timeoutId);
        setExams(examList);
        setQuestions(qList);

        // If the logged-in user is a teacher, try to get their teacher id
        // (non-blocking — only used when creating exams)
        if (profile.role === 'teacher' && profile.id) {
          fetchTeacherByProfileId(profile.id)
            .then(t => { if (t) setTeacherId(t.id); })
            .catch(() => { /* ignore — teacher id is optional for read views */ });
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.error('ExamsPage load error:', err);
        setLoadError('Could not load exams — check your internet connection and try again.');
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => clearTimeout(timeoutId);
  }, [profile]);

  // ── Live countdown ticker ──
  useEffect(() => {
    if (!monitorRunning) return;
    const t = setInterval(() => setLiveCountdown(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [monitorRunning]);

  const fmtTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Copy exam code ──
  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  }, []);

  // ── Create exam ──
  const handleCreateExam = async () => {
    if (!schoolId) return;
    setCreating(true);
    try {
      const code = generateExamCode();
      const newExam = await createExam({
        school_id: schoolId,
        class_id: null,
        teacher_id: teacherId ?? null,
        title: config.title || `Exam – ${config.category}`,
        description: config.description || null,
        duration_minutes: config.durationMinutes,
        passing_score: config.passMark,
        status: 'published',
        scheduled_at: config.availableFrom || null,
      });
      setGeneratedExam(newExam);
      setExamCode(code);
      setExams(prev => [newExam, ...prev]);
      setCreateStep(3);
    } catch (e) {
      console.error('Create exam error:', e);
    } finally {
      setCreating(false);
    }
  };

  // ── Filtered questions ──
  const filteredQuestions = questions.filter(q => {
    const matchSearch = q.question_text.toLowerCase().includes(qSearch.toLowerCase());
    const matchCat = qCategory === 'All' || q.category === qCategory;
    return matchSearch && matchCat;
  });

  const toggleSelectQuestion = (id: string) => {
    setConfig(c => ({
      ...c,
      selectedQuestionIds: c.selectedQuestionIds.includes(id)
        ? c.selectedQuestionIds.filter(x => x !== id)
        : [...c.selectedQuestionIds, id],
    }));
  };

  // ── Filtered exams ──
  const filteredExams = exams.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Status helpers ──
  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      published: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      draft: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      archived: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    };
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${map[status] ?? map.draft}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-semibold">Loading Exams...</p>
          <p className="text-slate-600 text-xs mt-1">Connecting to the database…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-rose-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Connection Error</h3>
          <p className="text-slate-400 text-sm mb-6">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold mx-auto transition-all">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }



  // ─────────────────────────────────────────────────────────────────────────
  // VIEWS
  // ─────────────────────────────────────────────────────────────────────────

  // ── MONITOR VIEW ──────────────────────────────────────────────────────────
  if (view === 'monitor' && activeExam) {
    const completed = liveStudents.filter(s => s.status === 'completed');
    const inProg = liveStudents.filter(s => s.status === 'in-progress');
    const waiting = liveStudents.filter(s => s.status === 'waiting');
    const absent = liveStudents.filter(s => s.status === 'absent');
    const ranked = [...completed].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => { setView('list'); setActiveExam(null); }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors">
              <X size={18} />
            </button>
            <div>
              <h1 className="text-xl font-black">{activeExam.title}</h1>
              <p className="text-slate-400 text-sm">Live Monitoring Dashboard</p>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setMonitorRunning(r => !r)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${monitorRunning ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'}`}>
              {monitorRunning ? <><Timer size={14} /> Pause Timer</> : <><Play size={14} /> Start Timer</>}
            </button>
          </div>
        </div>

        {/* Countdown + Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {/* Countdown */}
          <div className="md:col-span-1 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-2xl p-4 text-center">
            <div className="text-slate-400 text-xs font-semibold mb-1">Time Remaining</div>
            <div className="text-3xl font-black text-blue-400 font-mono tabular-nums">{fmtTime(liveCountdown)}</div>
            <div className="text-slate-500 text-xs mt-1">{activeExam.duration_minutes} min exam</div>
          </div>
          <StatBadge icon={<Users size={18} />} label="Students Joined" value={liveStudents.length} color="bg-slate-800 border-slate-700 text-white" />
          <StatBadge icon={<Play size={18} className="text-amber-400" />} label="In Progress" value={inProg.length} color="bg-amber-500/10 border-amber-500/30 text-amber-300" />
          <StatBadge icon={<CheckCircle2 size={18} className="text-emerald-400" />} label="Completed" value={completed.length} color="bg-emerald-500/10 border-emerald-500/30 text-emerald-300" />
          <StatBadge icon={<AlertCircle size={18} className="text-rose-400" />} label="Absent" value={absent.length} color="bg-rose-500/10 border-rose-500/30 text-rose-300" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Progress table */}
          <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm">Student Progress</h3>
              <button className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-5 py-3 text-slate-500 text-xs font-semibold">#</th>
                    <th className="text-left px-5 py-3 text-slate-500 text-xs font-semibold">Student</th>
                    <th className="text-left px-5 py-3 text-slate-500 text-xs font-semibold">Progress</th>
                    <th className="text-left px-5 py-3 text-slate-500 text-xs font-semibold">Status</th>
                    <th className="text-left px-5 py-3 text-slate-500 text-xs font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {liveStudents.map((s, i) => (
                    <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => s.status === 'completed' && setView('results')}>
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">{i + 1}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-black">
                            {s.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-white text-xs">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${
                              s.status === 'completed' ? 'bg-emerald-500' :
                              s.status === 'in-progress' ? 'bg-blue-500' : 'bg-slate-600'
                            }`} style={{ width: `${s.progress}%` }} />
                          </div>
                          <span className="text-xs text-slate-400 w-8 text-right">{s.progress}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          s.status === 'completed' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                          s.status === 'in-progress' ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' :
                          s.status === 'absent' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                          'bg-slate-700 border-slate-600 text-slate-400'
                        }`}>
                          {s.status === 'completed' ? <CheckCircle2 size={9} /> :
                           s.status === 'in-progress' ? <Play size={9} /> :
                           s.status === 'absent' ? <AlertCircle size={9} /> :
                           <Clock size={9} />}
                          {s.status.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs font-bold">
                        {s.score !== undefined ? (
                          <span className={s.score >= 70 ? 'text-emerald-400' : 'text-rose-400'}>{s.score}%</span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live ranking sidebar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              <h3 className="font-bold text-sm">Live Ranking</h3>
            </div>
            <div className="p-4 space-y-3">
              {ranked.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                    i === 0 ? 'bg-amber-500 text-black' :
                    i === 1 ? 'bg-slate-400 text-black' :
                    i === 2 ? 'bg-amber-700 text-white' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {i === 0 ? <Star size={12} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{s.name}</div>
                    <div className="text-[10px] text-slate-500">{s.correct}✓ · {s.wrong}✗ · {s.timeUsed}</div>
                  </div>
                  <span className={`text-sm font-black ${s.score! >= 70 ? 'text-emerald-400' : 'text-rose-400'}`}>{s.score}%</span>
                </div>
              ))}
              {ranked.length === 0 && (
                <div className="text-center py-8 text-slate-600">
                  <Trophy size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Waiting for completions...</p>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-800">
              <button onClick={() => setView('results')} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all">
                <Eye size={14} /> View Full Results
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS VIEW ──────────────────────────────────────────────────────────
  if (view === 'results' && activeExam) {
    const ranked = [...liveStudents]
      .filter(s => s.status === 'completed')
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('monitor')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors">
            <X size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black">{activeExam.title}</h1>
            <p className="text-slate-400 text-sm">Exam Results — {new Date().toLocaleDateString()}</p>
          </div>
          <button className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition-all">
            <Download size={14} /> Export CSV
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Students', value: liveStudents.length, icon: <Users size={18} />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
            { label: 'Completed', value: ranked.length, icon: <CheckCircle2 size={18} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
            { label: 'Avg Score', value: ranked.length ? `${Math.round(ranked.reduce((a, s) => a + (s.score ?? 0), 0) / ranked.length)}%` : '—', icon: <BarChart2 size={18} />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
            { label: 'Pass Rate', value: ranked.length ? `${Math.round(ranked.filter(s => (s.score ?? 0) >= 70).length / ranked.length * 100)}%` : '—', icon: <TrendingUp size={18} />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
          ].map(c => (
            <div key={c.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${c.bg}`}>
              <span className={c.color}>{c.icon}</span>
              <div>
                <div className="text-xs text-slate-400 font-semibold">{c.label}</div>
                <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Results table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="font-bold text-sm">Results Table</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Rank', 'Student', 'Score', 'Correct', 'Wrong', 'Time Used', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-slate-500 text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {liveStudents.map((s, i) => (
                  <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3">
                      {s.rank !== undefined ? (
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black inline-flex ${
                          s.rank === 1 ? 'bg-amber-500 text-black' :
                          s.rank === 2 ? 'bg-slate-400 text-black' :
                          s.rank === 3 ? 'bg-amber-700 text-white' :
                          'bg-slate-800 text-slate-400'
                        }`}>{s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : s.rank}</span>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-black">
                          {s.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-white text-xs">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {s.score !== undefined ? (
                        <span className={`text-sm font-black ${s.score >= 70 ? 'text-emerald-400' : 'text-rose-400'}`}>{s.score}%</span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-5 py-3 text-emerald-400 font-bold text-xs">{s.correct ?? '—'}</td>
                    <td className="px-5 py-3 text-rose-400 font-bold text-xs">{s.wrong ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs font-mono">{s.timeUsed ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        s.status === 'completed' && (s.score ?? 0) >= 70 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                        s.status === 'completed' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                        s.status === 'absent' ? 'bg-slate-700 border-slate-600 text-slate-400' :
                        'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      }`}>
                        {s.status === 'completed' ? ((s.score ?? 0) >= 70 ? 'Passed' : 'Failed') : s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {s.status === 'completed' && (
                        <button className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                          <Eye size={11} /> Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── CREATE VIEW ───────────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => { setView('list'); setCreateStep(1); }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors">
            <X size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black">Create New Exam</h1>
            <p className="text-slate-400 text-sm">Configure, generate a code, and share with students</p>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-0 mb-8 max-w-xl">
          {[
            { n: 1, label: 'Configure' },
            { n: 2, label: 'Questions' },
            { n: 3, label: 'Share Code' },
          ].map((step, i) => (
            <div key={step.n} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 transition-all ${createStep >= step.n ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                  createStep > step.n ? 'bg-emerald-500 border-emerald-500 text-white' :
                  createStep === step.n ? 'bg-blue-600 border-blue-600 text-white' :
                  'bg-slate-800 border-slate-700 text-slate-500'
                }`}>
                  {createStep > step.n ? <Check size={14} /> : step.n}
                </div>
                <span className={`text-xs font-bold hidden sm:block ${createStep === step.n ? 'text-white' : 'text-slate-500'}`}>{step.label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 mx-2 rounded-full ${createStep > step.n ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Configure ── */}
        {createStep === 1 && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2"><FileText size={14} className="text-blue-400" /> Exam Details</h3>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Exam Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Traffic Rules Assessment – June 2025"
                  value={config.title}
                  onChange={e => setConfig(c => ({ ...c, title: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Exam Topic / Subject</label>
                  <select value={config.category} onChange={e => setConfig(c => ({ ...c, category: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors">
                    <option value="Universal Driver Theory">Universal Driver Theory (Rwanda National Code)</option>
                    <option value="Traffic Signs & Signals">Traffic Signs & Signals</option>
                    <option value="Priority & Right of Way">Priority & Right of Way</option>
                    <option value="Defensive Driving & Safety">Defensive Driving & Safety</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Difficulty</label>
                  <select value={config.difficulty} onChange={e => setConfig(c => ({ ...c, difficulty: e.target.value as ExamConfig['difficulty'] }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors">
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Questions</label>
                  <input type="number" min={5} max={100} value={config.questionCount}
                    onChange={e => setConfig(c => ({ ...c, questionCount: Number(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Duration (min)</label>
                  <input type="number" min={5} max={240} value={config.durationMinutes}
                    onChange={e => setConfig(c => ({ ...c, durationMinutes: Number(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Pass Mark (%)</label>
                  <input type="number" min={1} max={100} value={config.passMark}
                    onChange={e => setConfig(c => ({ ...c, passMark: Number(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Max Students</label>
                  <input type="number" min={1} value={config.maxStudents}
                    onChange={e => setConfig(c => ({ ...c, maxStudents: Number(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Attempts Allowed</label>
                  <input type="number" min={1} max={5} value={config.attemptsAllowed}
                    onChange={e => setConfig(c => ({ ...c, attemptsAllowed: Number(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Available From</label>
                  <input type="datetime-local" value={config.availableFrom}
                    onChange={e => setConfig(c => ({ ...c, availableFrom: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Available To</label>
                  <input type="datetime-local" value={config.availableTo}
                    onChange={e => setConfig(c => ({ ...c, availableTo: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4 pt-2">
                {[
                  { key: 'randomizeQuestions', label: 'Randomize Questions', icon: <Shuffle size={14} /> },
                  { key: 'randomizeAnswers', label: 'Randomize Answers', icon: <Layers size={14} /> },
                ].map(tog => (
                  <button key={tog.key}
                    onClick={() => setConfig(c => ({ ...c, [tog.key]: !c[tog.key as keyof ExamConfig] }))}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      config[tog.key as keyof ExamConfig]
                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                    {tog.icon} {tog.label}
                    {config[tog.key as keyof ExamConfig] ? <Check size={12} className="text-blue-400" /> : null}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setCreateStep(2)}
              disabled={!config.title.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20">
              Next: Choose Questions <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── Step 2: Questions ── */}
        {createStep === 2 && (
          <div className="max-w-4xl space-y-6">
            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { mode: 'random', label: 'Random Generation', desc: 'System picks questions automatically based on your settings', icon: <Zap size={20} />, color: 'blue' },
                { mode: 'manual', label: 'Manual Selection', desc: 'Hand-pick exactly which questions appear in this exam', icon: <BookOpen size={20} />, color: 'purple' },
              ].map(opt => (
                <button key={opt.mode}
                  onClick={() => setConfig(c => ({ ...c, selectionMode: opt.mode as 'random' | 'manual' }))}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${
                    config.selectionMode === opt.mode
                      ? `border-${opt.color}-500 bg-${opt.color}-500/10`
                      : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                  }`}>
                  <div className={`mb-3 ${config.selectionMode === opt.mode ? `text-${opt.color}-400` : 'text-slate-500'}`}>
                    {opt.icon}
                  </div>
                  <div className="font-bold text-sm text-white mb-1">{opt.label}</div>
                  <div className="text-xs text-slate-500">{opt.desc}</div>
                  {config.selectionMode === opt.mode && (
                    <div className={`mt-3 flex items-center gap-1 text-xs font-bold text-${opt.color}-400`}>
                      <Check size={12} /> Selected
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Manual selection panel */}
            {config.selectionMode === 'manual' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" placeholder="Search questions..." value={qSearch}
                      onChange={e => setQSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500" />
                  </div>
                  <select value={qCategory} onChange={e => setQCategory(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">
                    {config.selectedQuestionIds.length} selected
                  </span>
                </div>
                <div className="overflow-y-auto max-h-80">
                  {filteredQuestions.length === 0 ? (
                    <div className="text-center py-10 text-slate-600">
                      <BookOpen size={28} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No questions found. Check the Question Bank.</p>
                    </div>
                  ) : filteredQuestions.map(q => (
                    <div key={q.id}
                      onClick={() => toggleSelectQuestion(q.id)}
                      className={`flex items-start gap-3 px-5 py-4 border-b border-slate-800/50 cursor-pointer transition-colors ${
                        config.selectedQuestionIds.includes(q.id) ? 'bg-blue-500/10' : 'hover:bg-slate-800/40'
                      }`}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                        config.selectedQuestionIds.includes(q.id)
                          ? 'bg-blue-600 border-blue-600' : 'border-slate-600'
                      }`}>
                        {config.selectedQuestionIds.includes(q.id) && <Check size={11} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium line-clamp-2">{q.question_text}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{q.category}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            q.difficulty === 'easy' ? 'bg-emerald-500/15 text-emerald-400' :
                            q.difficulty === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                            'bg-rose-500/15 text-rose-400'
                          }`}>{q.difficulty}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {config.selectionMode === 'random' && (
              <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20 rounded-2xl p-6 text-center">
                <Zap size={32} className="text-blue-400 mx-auto mb-3" />
                <h3 className="font-bold text-white mb-1">Auto-Random Mode</h3>
                <p className="text-slate-400 text-xs">
                  The system will randomly pick <strong className="text-white">{config.questionCount} questions</strong> from the{' '}
                  <strong className="text-white">{config.category}</strong> category
                  {config.difficulty !== 'all' && <> (<strong className="text-white">{config.difficulty}</strong> difficulty)</>}.
                  Each student may receive a different set for anti-cheating.
                </p>
                <div className="flex justify-center gap-4 mt-4 text-xs text-slate-400">
                  <span><strong className="text-white">{questions.length}</strong> questions available in bank</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={() => setCreateStep(1)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold transition-all border border-slate-700">
                Back
              </button>
              <button onClick={handleCreateExam} disabled={creating}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-40 transition-all shadow-lg shadow-blue-600/20">
                {creating ? <><RefreshCw size={14} className="animate-spin" /> Creating...</> : <><Zap size={14} /> Generate Exam & Code</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Share Code ── */}
        {createStep === 3 && generatedExam && (
          <div className="max-w-xl space-y-6">
            <div className="bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-500/30 rounded-3xl p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-black text-white mb-1">Exam Created!</h2>
              <p className="text-slate-400 text-sm mb-6">Share the code below with your students to start the exam.</p>

              {/* The Code */}
              <div className="bg-slate-900 border-2 border-dashed border-blue-500/50 rounded-2xl p-6 mb-4">
                <div className="text-xs text-slate-500 font-semibold mb-2">EXAM ACCESS CODE</div>
                <div className="text-5xl font-black text-white tracking-[0.3em] font-mono mb-4">{examCode}</div>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => handleCopyCode(examCode)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      copiedCode
                        ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}>
                    {copiedCode ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Code</>}
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all">
                    <QrCode size={13} /> QR Code
                  </button>
                </div>
              </div>

              {/* Exam link */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex items-center gap-2 mb-6">
                <span className="text-xs text-slate-500 flex-1 truncate font-mono">
                  https://dslms.rw/exam/{examCode.toLowerCase()}
                </span>
                <button onClick={() => handleCopyCode(`https://dslms.rw/exam/${examCode.toLowerCase()}`)}
                  className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0">
                  <Copy size={14} />
                </button>
              </div>

              {/* Settings summary */}
              <div className="grid grid-cols-3 gap-3 text-center mb-6">
                {[
                  { label: 'Questions', value: config.questionCount, icon: <Hash size={14} /> },
                  { label: 'Duration', value: `${config.durationMinutes}m`, icon: <Timer size={14} /> },
                  { label: 'Pass Mark', value: `${config.passMark}%`, icon: <Target size={14} /> },
                ].map(s => (
                  <div key={s.label} className="bg-slate-800 rounded-xl p-3">
                    <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">{s.icon}</div>
                    <div className="text-lg font-black text-white">{s.value}</div>
                    <div className="text-[10px] text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => {
                  setActiveExam(generatedExam);
                  setView('monitor');
                  setMonitorRunning(false);
                }} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all">
                  <Play size={15} /> Go to Live Monitor
                </button>
                <button onClick={() => { setView('list'); setCreateStep(1); setGeneratedExam(null); }}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold border border-slate-700 transition-all">
                  Back to Exams
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── LIST VIEW (default) ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Exams</h1>
          <p className="text-slate-400 text-sm mt-0.5">Create, manage and monitor student examinations</p>
        </div>
        <button
          onClick={() => { setView('create'); setCreateStep(1); setGeneratedExam(null); }}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-105">
          <Plus size={16} /> Create Exam
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Exams', value: exams.length, icon: <FileText size={18} />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Published', value: exams.filter(e => e.status === 'published').length, icon: <Unlock size={18} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Drafts', value: exams.filter(e => e.status === 'draft').length, icon: <Lock size={18} />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Archived', value: exams.filter(e => e.status === 'archived').length, icon: <Award size={18} />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg}`}>
            <span className={s.color}>{s.icon}</span>
            <div>
              <div className="text-xs text-slate-500 font-semibold">{s.label}</div>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search exams..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          {(['all', 'published', 'draft', 'archived'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                filterStatus === s
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
              }`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Exams list */}
      {filteredExams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto mb-5">
            <FileText size={36} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Exams Yet</h3>
          <p className="text-slate-500 text-sm max-w-xs mb-6">
            Create your first exam to start assessing your students with codes, timers, and live monitoring.
          </p>
          <button onClick={() => { setView('create'); setCreateStep(1); }}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition-all">
            <Plus size={16} /> Create First Exam
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredExams.map(exam => (
            <div key={exam.id}
              className="group bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 hover:bg-slate-800/60 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <FileText size={18} />
                </div>
                <span className={statusBadge(exam.status)}>{exam.status}</span>
              </div>

              <h3 className="font-bold text-white text-sm mb-1 line-clamp-2">{exam.title}</h3>
              {exam.description && <p className="text-xs text-slate-500 mb-4 line-clamp-1">{exam.description}</p>}

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Timer size={12} className="text-slate-600" />
                  {exam.duration_minutes} min
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Target size={12} className="text-slate-600" />
                  Pass: {exam.passing_score}%
                </div>
                {exam.scheduled_at && (
                  <div className="col-span-2 flex items-center gap-2 text-xs text-slate-500">
                    <Clock size={12} className="text-slate-600" />
                    {new Date(exam.scheduled_at).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => { setActiveExam(exam); setView('monitor'); setMonitorRunning(false); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-600/30 transition-all">
                  <Play size={12} /> Monitor
                </button>
                <button
                  onClick={() => { setActiveExam(exam); setView('results'); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all">
                  <BarChart2 size={12} /> Results
                </button>
                <button className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
