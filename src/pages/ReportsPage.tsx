import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, CheckCircle2, AlertTriangle, TrendingUp,
  Search, Eye, Calendar, BookOpen, X, FileText
} from 'lucide-react';
import { fetchStudentReports, type StudentReport } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';

export default function ReportsPage() {
  const { profile } = useAuth();
  const [reportsList, setReportsList] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStudentReport, setSelectedStudentReport] = useState<StudentReport | null>(null);

  const loadReports = useCallback(async () => {
    if (!profile?.school_id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStudentReports(profile.school_id);
      setReportsList(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [profile?.school_id]);

  useEffect(() => { void loadReports(); }, [loadReports]);

  // Filter logic
  const filteredReports = reportsList.filter((r) => {
    const matchesSearch =
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.licenseCategory ?? '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pass' && r.averageScorePercentage >= 80) ||
      (statusFilter === 'average' && r.averageScorePercentage >= 60 && r.averageScorePercentage < 80) ||
      (statusFilter === 'fail' && r.averageScorePercentage < 60);

    return matchesSearch && matchesStatus;
  });

  // Calculate school stats
  const totalExercisesDone = reportsList.reduce((acc, curr) => acc + curr.exercisesCompleted, 0);
  const schoolAvgPercentage = (
    reportsList.reduce((acc, curr) => acc + curr.averageScorePercentage, 0) / (reportsList.length || 1)
  ).toFixed(1);
  const passedCount = reportsList.filter((r) => r.averageScorePercentage >= 80).length;
  const needsPracticeCount = reportsList.filter((r) => r.averageScorePercentage < 60).length;

  // Time-ago helper
  const timeAgo = (iso: string | null) => {
    if (!iso) return 'No activity';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
    return `${Math.floor(hrs / 24)} days ago`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-extrabold flex items-center gap-1.5">
                <BarChart3 size={14} /> Student Exam Score Analytics
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-bold">
                {loading ? '…' : reportsList.length} Trainees Tracked
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Student Average Score & Performance Reports
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Analyze student average scores computed dynamically from live class quizzes, physical classroom exams, and homework exercises.
            </p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{loading ? '—' : `${schoolAvgPercentage}%`}</div>
            <div className="text-xs text-slate-500 font-medium">School Average Score</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{loading ? '—' : totalExercisesDone}</div>
            <div className="text-xs text-slate-500 font-medium">Total Exercises Completed</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{loading ? '—' : passedCount}</div>
            <div className="text-xs text-slate-500 font-medium">Exam Mastered (≥80%)</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{loading ? '—' : needsPracticeCount}</div>
            <div className="text-xs text-slate-500 font-medium">Needs Practice (&lt;60%)</div>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name or category..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Performance Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="all">All Trainees</option>
            <option value="pass">High Performers (≥80%)</option>
            <option value="average">Average Performers (60-79%)</option>
            <option value="fail">Needs Practice (&lt;60%)</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Main Reports Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold tracking-wider uppercase">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Exams Completed</th>
                <th className="py-3.5 px-4">Average Score %</th>
                <th className="py-3.5 px-4">Highest / Lowest</th>
                <th className="py-3.5 px-4">Last Active</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="py-4 px-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 text-sm font-semibold">
                    {reportsList.length === 0 ? 'No exam results yet. Results appear after students complete exams.' : 'No students match your search.'}
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const isHigh = report.averageScorePercentage >= 80;
                  const isAvg = report.averageScorePercentage >= 60 && report.averageScorePercentage < 80;

                  return (
                    <tr key={report.studentId} className="hover:bg-slate-50/80 transition-all">
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-slate-900 text-sm">{report.studentName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {report.studentId.slice(0, 8)}…</div>
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-700">
                        {report.licenseCategory ? `Cat ${report.licenseCategory}` : '—'}
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-black text-xs">
                          {report.exercisesCompleted} Exams
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-black ${isHigh ? 'text-emerald-600' : isAvg ? 'text-amber-600' : 'text-red-600'}`}>
                            {report.averageScorePercentage}%
                          </span>
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isHigh ? 'bg-emerald-500' : isAvg ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(report.averageScorePercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-slate-600 font-medium">
                        High: <strong className="text-emerald-700">{report.highestScore}%</strong> | Low: <strong className="text-slate-700">{report.lowestScore}%</strong>
                      </td>

                      <td className="py-4 px-4 text-slate-500 text-[11px]">
                        {timeAgo(report.lastActive)}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] uppercase tracking-wider ${
                          isHigh
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isAvg
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {report.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => setSelectedStudentReport(report)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 ml-auto"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudentReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-6 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <FileText size={20} className="text-emerald-600" />
                  {selectedStudentReport.studentName}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Category: {selectedStudentReport.licenseCategory ?? '—'} • {selectedStudentReport.exercisesCompleted} exams completed
                </p>
              </div>
              <button onClick={() => setSelectedStudentReport(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between flex-shrink-0">
              <div>
                <div className="text-xs font-bold text-emerald-900">Cumulative Average Score</div>
                <div className="text-2xl font-black text-emerald-700">{selectedStudentReport.averageScorePercentage}%</div>
              </div>
              <div className="text-right text-xs text-slate-600 font-medium">
                <div>Highest: <strong className="text-emerald-700">{selectedStudentReport.highestScore}%</strong></div>
                <div>Lowest: <strong className="text-slate-700">{selectedStudentReport.lowestScore}%</strong></div>
                <div>Status: <span className="font-bold text-emerald-700">{selectedStudentReport.status}</span></div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                <Calendar size={12} /> Last active: {timeAgo(selectedStudentReport.lastActive)}
              </div>
              <p className="text-xs text-slate-400 italic">
                Detailed per-exam history is available once exam result records are linked.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedStudentReport(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
