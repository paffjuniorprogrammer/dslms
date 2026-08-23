import { useState } from 'react';
import {
  BarChart3, CheckCircle2, XCircle, Award, Eye, Search, Filter,
  BookOpen, X, Check
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import { defaultTheoryQuestionBank } from '@/data/rnpQuestions';

interface TestHistoryItem {
  id: string;
  title: string;
  type: 'Theory Mock Exam' | 'Traffic Signs Quiz' | 'Live Class Test' | 'Road Safety Test';
  date: string;
  score: number;
  total: number;
  percentage: number;
  status: 'Passed' | 'Failed';
  timeSpent: string;
  incorrectQuestionsCount: number;
}

const mockTestHistory: TestHistoryItem[] = [
  { id: 'TH-001', title: 'Official Theory Mock Exam #01', type: 'Theory Mock Exam', date: 'Mar 02, 2026', score: 19, total: 20, percentage: 95, status: 'Passed', timeSpent: '14 min', incorrectQuestionsCount: 1 },
  { id: 'TH-002', title: 'Road Markings & Priority Signs Test', type: 'Traffic Signs Quiz', date: 'Feb 28, 2026', score: 18, total: 20, percentage: 90, status: 'Passed', timeSpent: '11 min', incorrectQuestionsCount: 2 },
  { id: 'TH-003', title: 'Highway Speed & Overtaking Evaluation', type: 'Live Class Test', date: 'Feb 24, 2026', score: 14, total: 20, percentage: 70, status: 'Failed', timeSpent: '18 min', incorrectQuestionsCount: 6 },
  { id: 'TH-004', title: 'Vehicle Mechanics & Light Controls', type: 'Road Safety Test', date: 'Feb 20, 2026', score: 17, total: 20, percentage: 85, status: 'Passed', timeSpent: '12 min', incorrectQuestionsCount: 3 },
  { id: 'TH-005', title: 'Right of Way & Roundabouts Quiz', type: 'Traffic Signs Quiz', date: 'Feb 15, 2026', score: 20, total: 20, percentage: 100, status: 'Passed', timeSpent: '09 min', incorrectQuestionsCount: 0 },
  { id: 'TH-006', title: 'General Traffic Regulations Practice', type: 'Theory Mock Exam', date: 'Feb 10, 2026', score: 16, total: 20, percentage: 80, status: 'Passed', timeSpent: '15 min', incorrectQuestionsCount: 4 },
];

export default function StudentResultsPage() {
  const [history] = useState<TestHistoryItem[]>(mockTestHistory);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedTest, setSelectedTest] = useState<TestHistoryItem | null>(null);

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.type.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalTaken = history.length;
  const passedCount = history.filter(h => h.status === 'Passed').length;
  const avgScore = Math.round(history.reduce((acc, curr) => acc + curr.percentage, 0) / totalTaken);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Test Results & History</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track your scores, historical performance, and review detailed answers for all exercises</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Average Score" value={`${avgScore}%`} icon={<BarChart3 size={20} />} color="text-blue-600" bgColor="bg-blue-50" />
        <StatCard title="Tests Taken" value={totalTaken} icon={<BookOpen size={20} />} color="text-purple-600" bgColor="bg-purple-50" />
        <StatCard title="Passed Tests" value={`${passedCount}/${totalTaken}`} icon={<CheckCircle2 size={20} />} color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatCard title="Pass Rate" value={`${Math.round((passedCount / totalTaken) * 100)}%`} icon={<Award size={20} />} color="text-amber-600" bgColor="bg-amber-50" />
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tests by title or topic..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
            >
              <option value="all">All Test Types</option>
              <option value="Theory Mock Exam">Theory Mock Exam</option>
              <option value="Traffic Signs Quiz">Traffic Signs Quiz</option>
              <option value="Live Class Test">Live Class Test</option>
              <option value="Road Safety Test">Road Safety Test</option>
            </select>
          </div>
        </div>

        {/* Results List / Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3">Test Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date Completed</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Percentage</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredHistory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-800">{item.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.id} • {item.timeSpent}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 font-medium">{item.date}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800">{item.score} / {item.total}</td>
                  <td className="px-4 py-3.5">
                    <span className={`font-extrabold ${item.percentage >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.percentage}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                      item.status === 'Passed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.status === 'Passed' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setSelectedTest(item)}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all inline-flex items-center gap-1"
                    >
                      <Eye size={13} /> Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Inspection Modal */}
      {selectedTest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTest(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h3 className="font-bold text-base text-white">{selectedTest.title}</h3>
                <p className="text-xs text-slate-400">{selectedTest.date} • Score: {selectedTest.score}/{selectedTest.total} ({selectedTest.percentage}%)</p>
              </div>
              <button onClick={() => setSelectedTest(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Test ID:</span> <strong className="text-slate-800 font-mono">{selectedTest.id}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Time Taken:</span> <strong className="text-slate-800">{selectedTest.timeSpent}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Incorrect Answers:</span> <strong className="text-rose-600">{selectedTest.incorrectQuestionsCount}</strong>
                </div>
              </div>

              <h4 className="font-bold text-slate-800 text-sm">Question by Question Review</h4>

              <div className="space-y-3">
                {defaultTheoryQuestionBank.slice(0, 5).map((q, idx) => {
                  const isMistake = idx === 1 || (selectedTest.status === 'Failed' && idx === 3);

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border text-xs space-y-2 ${
                        isMistake ? 'bg-rose-50/60 border-rose-200' : 'bg-emerald-50/60 border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Q{idx + 1}. {q.text}</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          isMistake ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
                        }`}>
                          {isMistake ? 'Incorrect' : 'Correct'}
                        </span>
                      </div>

                      <div className="space-y-1 pt-1">
                        {q.options.map((opt, oIdx) => {
                          const isCorrectOpt = opt === q.correctAnswer;
                          const isWrongSelection = isMistake && oIdx === 0 && !isCorrectOpt;

                          return (
                            <div
                              key={oIdx}
                              className={`p-2 rounded-lg flex items-center justify-between ${
                                isCorrectOpt
                                  ? 'bg-emerald-100 text-emerald-900 font-bold'
                                  : isWrongSelection
                                  ? 'bg-rose-100 text-rose-900 font-bold line-through'
                                  : 'text-slate-600'
                              }`}
                            >
                              <span>{opt}</span>
                              {isCorrectOpt && <Check size={14} className="text-emerald-700" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedTest(null)}
                className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
