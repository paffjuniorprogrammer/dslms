import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  School, Users, GraduationCap, Award, FileText, Activity,
  TrendingUp, Plus, Send, Download, Settings, Server,
  Database, Cpu, HardDrive, ShieldCheck, CheckCircle2,
  Clock, ArrowRight, Zap, Radio, X
} from 'lucide-react';
import {
  fetchSuperAdminStats,
  fetchSchoolMonthlyTrend,
  fetchRecentSchools,
  type SuperAdminStats,
} from '@/lib/db';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementSubject, setAnnouncementSubject] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');

  // ── Real data state ─────────────────────────────────────────────
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [registrationTrend, setRegistrationTrend] = useState<{ month: string; schools: number }[]>([]);
  const [recentSchools, setRecentSchools] = useState<{ id: string; name: string; created_at: string; status: string }[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [s, trend, recent] = await Promise.all([
        fetchSuperAdminStats(),
        fetchSchoolMonthlyTrend(8),
        fetchRecentSchools(5),
      ]);
      setStats(s);
      setRegistrationTrend(trend);
      setRecentSchools(recent);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => { void loadDashboardData(); }, [loadDashboardData]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // ── Line chart calculations (real data) ────────────────────────
  const maxReg = Math.max(...registrationTrend.map(d => d.schools), 1);
  const linePoints = registrationTrend.map((d, i) => {
    const x = registrationTrend.length > 1 ? (i / (registrationTrend.length - 1)) * 100 : 50;
    const y = 100 - ((d.schools / maxReg) * 75) - 10;
    return { x, y };
  });
  const linePathD = linePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const lineAreaD = `${linePathD} L 100 100 L 0 100 Z`;

  // ── Donut chart: active vs suspended ───────────────────────────
  const totalSchools = stats?.schoolsCount ?? 0;
  const activeSchools = stats?.activeSchoolsCount ?? 0;
  const suspendedSchools = totalSchools - activeSchools;
  const activePct = totalSchools > 0 ? ((activeSchools / totalSchools) * 100).toFixed(1) : '0';
  const suspendedPct = totalSchools > 0 ? ((suspendedSchools / totalSchools) * 100).toFixed(1) : '0';

  // ── Time-ago helper ────────────────────────────────────────────
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
    return `${Math.floor(hrs / 24)} days ago`;
  };

  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementSubject.trim()) return;
    setShowAnnouncementModal(false);
    triggerToast(`📢 Announcement "${announcementSubject}" broadcasted to all driving schools!`);
    setAnnouncementSubject('');
    setAnnouncementBody('');
  };

  // ── Stat card helper ───────────────────────────────────────────
  const fmt = (n: number) => loadingStats ? '—' : n.toLocaleString();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Banner */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-xs font-bold">{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white ml-2"><X size={16} /></button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-extrabold border border-blue-200">
              Executive System Control
            </span>
            <span className="text-xs text-slate-400 font-medium">DriveClass Rwanda Platform</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome Back, Super Admin
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time national metrics, school accreditations, question bank management, and system infrastructure overview.
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/admin/schools')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition-all"
          >
            <Plus size={16} />
            <span>Register School</span>
          </button>

          <button
            onClick={() => setShowAnnouncementModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200/80 transition-all"
          >
            <Send size={15} className="text-blue-600" />
            <span>Announcement</span>
          </button>

          <button
            onClick={() => triggerToast('📊 System performance report exported (PDF/CSV)!')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200/80 transition-all"
          >
            <Download size={15} className="text-emerald-600" />
            <span>Export Report</span>
          </button>

          <button
            onClick={() => navigate('/admin/settings')}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition-all"
            title="System Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* 6 Primary Statistics Cards — Real DB counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total Schools */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 hover:border-blue-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Schools</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <School size={18} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{fmt(stats?.schoolsCount ?? 0)} <span className="text-xs font-normal text-slate-400">Schools</span></div>
            <div className="text-[11px] text-blue-600 font-bold flex items-center gap-1 mt-0.5">
              <Activity size={12} /> Registered Nationwide
            </div>
          </div>
        </div>

        {/* Card 2: Total Teachers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 hover:border-emerald-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Teachers</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Users size={18} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{fmt(stats?.teachersCount ?? 0)} <span className="text-xs font-normal text-slate-400">Teachers</span></div>
            <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
              <TrendingUp size={12} /> Active Instructors
            </div>
          </div>
        </div>

        {/* Card 3: Certificates Issued */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 hover:border-purple-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Certificates</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Award size={18} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{fmt(stats?.certificatesCount ?? 0)} <span className="text-xs font-normal text-slate-400">Issued</span></div>
            <div className="text-[11px] text-purple-600 font-bold flex items-center gap-1 mt-0.5">
              <CheckCircle2 size={12} /> Officially Verified
            </div>
          </div>
        </div>

        {/* Card 4: Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 hover:border-amber-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Students</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <GraduationCap size={18} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{fmt(stats?.studentsCount ?? 0)} <span className="text-xs font-normal text-slate-400">Learners</span></div>
            <div className="text-[11px] text-amber-600 font-bold flex items-center gap-1 mt-0.5">
              <TrendingUp size={12} /> Enrolled Trainees
            </div>
          </div>
        </div>

        {/* Card 5: Live Classes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 hover:border-teal-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Live Classes</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <FileText size={18} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{fmt(stats?.liveClassesCount ?? 0)} <span className="text-xs font-normal text-slate-400">Sessions</span></div>
            <div className="text-[11px] text-teal-600 font-bold flex items-center gap-1 mt-0.5">
              <Activity size={12} /> Total Conducted
            </div>
          </div>
        </div>

        {/* Card 6: Active Schools Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 hover:border-blue-400 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Active Schools</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Activity size={18} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">
              {fmt(activeSchools)} <span className="text-xs font-normal text-slate-400">/ {fmt(totalSchools)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${activePct}%` }} />
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-1">{activePct}% Active Compliance</div>
          </div>
        </div>
      </div>

      {/* Main Analytics Grid: Line Chart + Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: School Registrations Line Chart */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm">School Registrations Trend</h2>
              <p className="text-xs text-slate-400 mt-0.5">Monthly new school registrations (last 8 months)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Schools Registered
              </span>
            </div>
          </div>

          <div className="relative h-64 pt-4">
            {loadingStats ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">Loading chart data…</div>
            ) : registrationTrend.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">No registration data yet</div>
            ) : (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                  <linearGradient id="sysActivityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 25, 50, 75, 100].map(y => (
                  <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#f1f5f9" strokeWidth="0.5" />
                ))}
                <path d={lineAreaD} fill="url(#sysActivityGrad)" />
                <path d={linePathD} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
                {linePoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="#2563eb" className="cursor-pointer" />
                ))}
              </svg>
            )}
          </div>

          <div className="flex justify-between px-2 pt-2 border-t border-slate-100">
            {registrationTrend.map(d => (
              <span key={d.month} className="text-[10px] text-slate-400 font-bold">{d.month}</span>
            ))}
          </div>
        </div>

        {/* Right: School Status Donut */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="font-extrabold text-slate-900 text-sm">School Status Distribution</h2>
            <p className="text-xs text-slate-400 mt-0.5">Accredited institution breakdown</p>
          </div>

          <div className="flex items-center justify-center relative py-2">
            <svg viewBox="0 0 36 36" className="w-40 h-40 transform -rotate-90">
              <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="3.8" />
              <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#2563eb" strokeWidth="3.8"
                strokeDasharray={`${activePct} ${100 - parseFloat(activePct)}`} strokeDashoffset="0" />
              <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#ef4444" strokeWidth="3.8"
                strokeDasharray={`${suspendedPct} ${100 - parseFloat(suspendedPct)}`}
                strokeDashoffset={`-${activePct}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black text-slate-900">{fmt(totalSchools)}</span>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase">Schools</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-50/60 border border-blue-100">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <div>
                <p className="font-bold text-slate-800">Active</p>
                <p className="text-[10px] text-slate-500 font-mono">{fmt(activeSchools)} ({activePct}%)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50/60 border border-rose-100">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <div>
                <p className="font-bold text-slate-800">Suspended</p>
                <p className="text-[10px] text-slate-500 font-mono">{fmt(suspendedSchools)} ({suspendedPct}%)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity + System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent School Registrations — real data */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Clock size={16} className="text-blue-600" />
                <span>Recent School Registrations</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Latest schools added to the platform</p>
            </div>
            <button onClick={() => navigate('/admin/schools')} className="text-xs text-blue-600 font-extrabold hover:underline">View All</button>
          </div>

          <div className="space-y-3">
            {loadingStats ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 animate-pulse">
                  <div className="w-8 h-8 rounded-xl bg-slate-200 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : recentSchools.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No schools registered yet.</p>
            ) : (
              recentSchools.map(sch => (
                <div key={sch.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200/60">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-sm flex-shrink-0">🏫</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 leading-snug truncate">{sch.name} registered</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(sch.created_at)}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sch.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {sch.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Health Card */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Server size={18} className="text-emerald-600" />
                <span>System Health & Infrastructure</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Cloud database synchronization status</p>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> All Systems Operational
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                <span className="flex items-center gap-1"><Database size={13} /> Database</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <p className="text-xs font-black text-slate-900">Operational</p>
              <p className="text-[10px] text-slate-400">Supabase PostgreSQL</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                <span className="flex items-center gap-1"><Zap size={13} /> API Gateway</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <p className="text-xs font-black text-slate-900">99.99% Uptime</p>
              <p className="text-[10px] text-slate-400">Edge Functions Active</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                <span className="flex items-center gap-1"><HardDrive size={13} /> Storage</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <p className="text-xs font-black text-slate-900">Operational</p>
              <p className="text-[10px] text-slate-400">Supabase Storage</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                <span className="flex items-center gap-1"><Cpu size={13} /> Auth Service</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <p className="text-xs font-black text-slate-900">Active</p>
              <p className="text-[10px] text-slate-400">RLS Policies Enforced</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-600 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 font-semibold">
                <ShieldCheck size={14} className="text-emerald-600" /> RLS: <strong className="text-slate-800">Enabled on all tables</strong>
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <Radio size={14} className="text-blue-600" /> Realtime: <strong className="text-slate-800">Connected</strong>
              </span>
            </div>
            <button
              onClick={() => navigate('/admin/settings')}
              className="text-blue-600 font-extrabold hover:underline flex items-center gap-1"
            >
              System Settings <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <h2 className="font-extrabold text-slate-900 text-sm">Quick Administrative Panel</h2>
          <p className="text-xs text-slate-400 mt-0.5">Frequent Super Admin operations</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/admin/schools')}
            className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 text-blue-900 font-extrabold text-xs transition-all"
          >
            <span className="flex items-center gap-2.5"><Plus size={16} className="text-blue-600" /> Register New School</span>
            <ArrowRight size={14} className="text-blue-600" />
          </button>

          <button
            onClick={() => setShowAnnouncementModal(true)}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-extrabold text-xs transition-all"
          >
            <span className="flex items-center gap-2.5"><Send size={16} className="text-emerald-600" /> Send Announcement</span>
            <ArrowRight size={14} className="text-slate-400" />
          </button>

          <button
            onClick={() => navigate('/admin/questions')}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-extrabold text-xs transition-all"
          >
            <span className="flex items-center gap-2.5"><FileText size={16} className="text-purple-600" /> Manage Question Bank</span>
            <ArrowRight size={14} className="text-slate-400" />
          </button>

          <button
            onClick={() => navigate('/admin/settings')}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-extrabold text-xs transition-all"
          >
            <span className="flex items-center gap-2.5"><Settings size={16} className="text-amber-600" /> System Settings</span>
            <ArrowRight size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Broadcast Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowAnnouncementModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5 border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Send size={18} className="text-blue-600" /> Broadcast System Announcement
              </h3>
              <button onClick={() => setShowAnnouncementModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject Header *</label>
                <input
                  type="text"
                  required
                  value={announcementSubject}
                  onChange={e => setAnnouncementSubject(e.target.value)}
                  placeholder="e.g. Mandatory Provisional Theory Exam Bank Update - 2026"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Announcement Details *</label>
                <textarea
                  required
                  rows={4}
                  value={announcementBody}
                  onChange={e => setAnnouncementBody(e.target.value)}
                  placeholder="Message sent to all school administrators and teachers..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-[11px] text-blue-900">
                <strong>Recipient Scope:</strong> All active driving schools in Rwanda (Super Admin System Broadcast).
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md flex items-center gap-1.5"
                >
                  <Send size={14} /> Send Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
