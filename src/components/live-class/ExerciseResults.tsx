import { useState } from 'react';
import {
  CheckCircle, XCircle, Users, Award, TrendingUp, Eye,
  ScreenShare, X, ChevronDown, ChevronUp
} from 'lucide-react';
import type { ExerciseResult, ExerciseQuestion } from '@/types/live-class';

interface ExerciseResultsProps {
  results: ExerciseResult[];
  questions: ExerciseQuestion[];
  totalParticipants: number;
  submittedCount: number;
  isSharing: boolean;
  onToggleShare: () => void;
  onClose: () => void;
}

export default function ExerciseResults({
  results, questions, totalParticipants, submittedCount, isSharing, onToggleShare, onClose
}: ExerciseResultsProps) {
  const [view, setView] = useState<'summary' | 'details' | 'leaderboard'>('summary');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const avgScore = submittedCount > 0
    ? Math.round(results.reduce((sum, r) => sum + (r.earnedPoints / r.totalPoints) * 100, 0) / submittedCount)
    : 0;

  const passedCount = results.filter(r => (r.earnedPoints / r.totalPoints) * 100 >= 50).length;

  // Per-question stats
  const questionStats = questions.map((q, i) => {
    const correct = results.filter(r => r.answers.find(a => a.questionId === q.id)?.correct).length;
    const wrong = submittedCount - correct;
    return { index: i, question: q, correct, wrong };
  });

  const sortedResults = [...results].sort((a, b) => b.earnedPoints - a.earnedPoints);

  return (
    <div className="absolute inset-0 z-30 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <Award size={18} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Exercise Results</h3>
              <p className="text-xs text-slate-400">{submittedCount} of {totalParticipants} submitted</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleShare}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                isSharing
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <ScreenShare size={14} />
              {isSharing ? 'Sharing to Live' : 'Share on Screen'}
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 border-b border-slate-100">
          <div className="flex items-center gap-1">
            <TabButton active={view === 'summary'} onClick={() => setView('summary')} icon={<TrendingUp size={14} />} label="Summary" />
            <TabButton active={view === 'details'} onClick={() => setView('details')} icon={<Eye size={14} />} label="Per Question" />
            <TabButton active={view === 'leaderboard'} onClick={() => setView('leaderboard')} icon={<Users size={14} />} label="Students" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {view === 'summary' && (
            <div className="space-y-4">
              {/* Big stats */}
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Average Score" value={`${avgScore}%`} color="text-blue-600" bg="bg-blue-50" />
                <StatBox label="Passed" value={`${passedCount}/${submittedCount}`} color="text-green-600" bg="bg-green-50" />
                <StatBox label="Submitted" value={`${submittedCount}/${totalParticipants}`} color="text-purple-600" bg="bg-purple-50" />
              </div>

              {/* Distribution bar */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Score Distribution</h4>
                <div className="space-y-2">
                  {[
                    { range: '90-100%', min: 90, color: 'bg-green-500' },
                    { range: '70-89%', min: 70, color: 'bg-blue-500' },
                    { range: '50-69%', min: 50, color: 'bg-yellow-500' },
                    { range: '0-49%', min: 0, color: 'bg-red-500' },
                  ].map(tier => {
                    const count = results.filter(r => {
                      const pct = (r.earnedPoints / r.totalPoints) * 100;
                      return pct >= tier.min && (tier.min === 90 ? pct <= 100 : pct >= tier.min && pct < tier.min + 20);
                    }).length;
                    const pct = submittedCount > 0 ? (count / submittedCount) * 100 : 0;
                    return (
                      <div key={tier.range} className="flex items-center gap-3">
                        <span className="text-xs text-slate-600 w-16 flex-shrink-0">{tier.range}</span>
                        <div className="flex-1 h-5 bg-white rounded-full overflow-hidden">
                          <div className={`h-full ${tier.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-slate-600 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {view === 'details' && (
            <div className="space-y-3">
              {questionStats.map(({ index, question, correct, wrong }) => (
                <div key={question.id} className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-slate-700 text-white text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <p className="text-sm font-medium text-slate-800 flex-1">{question.text}</p>
                  </div>
                  <div className="flex items-center gap-4 ml-9">
                    <div className="flex items-center gap-1.5 text-sm">
                      <CheckCircle size={16} className="text-green-500" />
                      <span className="text-green-600 font-medium">{correct} correct</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <XCircle size={16} className="text-red-400" />
                      <span className="text-red-500 font-medium">{wrong} wrong</span>
                    </div>
                    <div className="flex-1 h-2 bg-white rounded-full overflow-hidden ml-2">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${submittedCount > 0 ? (correct / submittedCount) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {submittedCount > 0 ? Math.round((correct / submittedCount) * 100) : 0}%
                    </span>
                  </div>
                  <div className="ml-9 mt-2 text-xs text-slate-400">
                    Correct answer: <span className="font-medium text-slate-600">{question.correctAnswer}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'leaderboard' && (
            <div className="space-y-2">
              {sortedResults.map((result, idx) => {
                const pct = Math.round((result.earnedPoints / result.totalPoints) * 100);
                const isExpanded = expandedStudent === result.studentId;
                return (
                  <div key={result.studentId} className="bg-slate-50 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedStudent(isExpanded ? null : result.studentId)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 transition-all"
                    >
                      <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-slate-200 text-slate-600' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-left text-sm font-medium text-slate-700">{result.studentName}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-white rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-sm font-bold w-12 text-right ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {result.earnedPoints}/{result.totalPoints}
                        </span>
                        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-1.5 border-t border-slate-200/60 pt-2">
                        {result.answers.map((ans, i) => {
                          const q = questions.find(qq => qq.id === ans.questionId);
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs ml-10">
                              {ans.correct
                                ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                                : <XCircle size={14} className="text-red-400 flex-shrink-0" />}
                              <span className="text-slate-600 flex-1 truncate">
                                Q{i + 1}: {q?.text.substring(0, 50)}...
                              </span>
                              <span className={`font-medium ${ans.correct ? 'text-green-600' : 'text-red-500'}`}>
                                {ans.answer || 'No answer'}
                              </span>
                              {!ans.correct && q && (
                                <span className="text-slate-400 text-[10px]">
                                  (Correct: {q.correctAnswer})
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
        active ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function StatBox({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-4 text-center`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
