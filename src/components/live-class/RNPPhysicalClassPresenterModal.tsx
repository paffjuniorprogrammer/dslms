import { useState, useEffect } from 'react';
import {
  X, HelpCircle, CheckCircle, XCircle, Eye, EyeOff, Radio,
  Clock, ShieldAlert, Award, Copy, Check, Shuffle, Sparkles,
  BookOpen, ChevronRight, ChevronLeft, Play, AlertTriangle
} from 'lucide-react';
import { defaultRNPQuestionBank, generateRandom20RNPExam } from '@/data/rnpQuestions';
import type { ExerciseQuestion, ExerciseResult, StudentAnswer } from '@/types/live-class';

interface RNPPhysicalClassPresenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseResults: ExerciseResult[];
  onAddResult?: (result: ExerciseResult) => void;
  onBroadcastStudent?: (studentId: string) => void;
  onBroadcastResultsList?: () => void;
}

export default function RNPPhysicalClassPresenterModal({
  isOpen,
  onClose,
  exerciseResults,
  onAddResult,
  onBroadcastStudent,
  onBroadcastResultsList,
}: RNPPhysicalClassPresenterModalProps) {
  const [activeTab, setActiveTab] = useState<'presenter' | 'code_generator' | 'student_scores'>('presenter');
  
  // Presenter mode state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [revealAnswer, setRevealAnswer] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [presenterSelectedOptions, setPresenterSelectedOptions] = useState<Record<string, string>>({});

  // Exercise Access Code Generator State
  const [accessCode, setAccessCode] = useState('PHYS-8842');
  const [codeActive, setCodeActive] = useState(true);
  const [codeTimeLeft, setCodeTimeLeft] = useState(1200); // 20 minutes (1200s)
  const [copiedCode, setCopiedCode] = useState(false);

  // Student Test Inspector State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Student Code Entry Simulation State (for testing code entry)
  const [studentEnteredCode, setStudentEnteredCode] = useState('');
  const [studentNameInput, setStudentNameInput] = useState('');
  const [isSimulatingStudentExam, setIsSimulatingStudentExam] = useState(false);
  const [studentRandomQuestions, setStudentRandomQuestions] = useState<ExerciseQuestion[]>([]);
  const [studentCurrentIndex, setStudentCurrentIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [studentTimer, setStudentTimer] = useState(1200); // 20 minutes
  const [studentSubmitted, setStudentSubmitted] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Code Expiration Timer
  useEffect(() => {
    if (!codeActive || codeTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setCodeTimeLeft(prev => {
        if (prev <= 1) {
          setCodeActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [codeActive, codeTimeLeft]);

  // Student Exam Timer
  useEffect(() => {
    if (!isSimulatingStudentExam || studentSubmitted || studentTimer <= 0) return;
    const interval = setInterval(() => {
      setStudentTimer(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSimulatingStudentExam, studentSubmitted, studentTimer]);

  if (!isOpen) return null;

  const currentPresenterQ = defaultRNPQuestionBank[currentQuestionIndex];

  const filteredQuestions = defaultRNPQuestionBank.filter(q =>
    q.text.toLowerCase().includes(searchFilter.toLowerCase()) ||
    q.options.some(o => o.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const handleGenerateNewCode = () => {
    const newCode = 'PHYS-' + Math.floor(1000 + Math.random() * 9000);
    setAccessCode(newCode);
    setCodeActive(true);
    setCodeTimeLeft(1200); // Reset to 20 minutes
  };

  const handleExpireCode = () => {
    setCodeActive(false);
    setCodeTimeLeft(0);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(accessCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Start Student Exam Simulation with Code
  const handleStartStudentExamWithCode = () => {
    if (studentEnteredCode.trim().toUpperCase() !== accessCode.toUpperCase()) {
      setStudentError(`Invalid code! Active exercise code is "${accessCode}"`);
      return;
    }
    if (!codeActive || codeTimeLeft <= 0) {
      setStudentError('This exercise access code has expired! Teacher must create a new code.');
      return;
    }
    if (!studentNameInput.trim()) {
      setStudentError('Please enter your full name before starting the exam.');
      return;
    }

    setStudentError(null);
    // Randomize 20 questions for this student
    const random20 = generateRandom20RNPExam();
    setStudentRandomQuestions(random20);
    setStudentAnswers({});
    setStudentCurrentIndex(0);
    setStudentTimer(1200); // 20 minutes
    setStudentSubmitted(false);
    setIsSimulatingStudentExam(true);
  };

  // Submit Student Exam
  const handleStudentSubmitExam = () => {
    const answersList: StudentAnswer[] = studentRandomQuestions.map(q => ({
      questionId: q.id,
      answer: studentAnswers[q.id] || '',
      correct: studentAnswers[q.id] === q.correctAnswer,
    }));

    const earnedPoints = answersList.filter(a => a.correct).length; // 1 point per question
    const totalPoints = studentRandomQuestions.length; // 20
    const score = Math.round((earnedPoints / totalPoints) * 100);

    const newResult: ExerciseResult = {
      studentId: 'sim-' + Date.now(),
      studentName: studentNameInput.trim(),
      answers: answersList,
      score,
      totalPoints,
      earnedPoints,
      submittedAt: Date.now(),
      timeSpentSeconds: 1200 - studentTimer,
    };

    onAddResult?.(newResult);
    setStudentSubmitted(true);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const selectedStudentResult = exerciseResults.find(r => r.studentId === selectedStudentId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none font-sans">
      <div className="bg-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden text-white">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">Provisional Driving Exam Engine</h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-[10px] font-bold">
                  20 Qs / 20 Mins Standard
                </span>
              </div>
              <p className="text-xs text-slate-400">Project questions in physical class, issue randomized code, inspect incorrect answers</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Navigation Tabs */}
            <div className="flex items-center bg-slate-800 p-1 rounded-2xl border border-white/10 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('presenter')}
                className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'presenter' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <HelpCircle size={14} /> Class Projector ({defaultRNPQuestionBank.length})
              </button>
              <button
                onClick={() => setActiveTab('code_generator')}
                className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'code_generator' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio size={14} className={codeActive ? 'text-green-400 animate-pulse' : 'text-red-400'} /> Exam Code Generator
              </button>
              <button
                onClick={() => setActiveTab('student_scores')}
                className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'student_scores' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Award size={14} /> Marks & Answers ({exerciseResults.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* TAB 1: RNP CLASSROOM PROJECTOR / QUESTION PRESENTER */}
        {activeTab === 'presenter' && (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Sidebar question selector */}
            <div className="w-80 border-r border-white/10 bg-slate-950/60 p-4 flex flex-col flex-shrink-0">
              <div className="mb-3">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Search traffic rules & signs..."
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredQuestions.map((q) => {
                  const originalIndex = defaultRNPQuestionBank.findIndex(item => item.id === q.id);
                  const isSelected = originalIndex === currentQuestionIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentQuestionIndex(originalIndex);
                        setRevealAnswer(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-purple-600/30 border-purple-500 text-white font-semibold'
                          : 'bg-slate-900/80 border-white/5 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                        isSelected ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {originalIndex + 1}
                      </span>
                      <span className="line-clamp-2">{q.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Projector Screen */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between bg-gradient-to-b from-slate-900 to-slate-950">
              <div className="max-w-3xl mx-auto w-full space-y-6">
                {/* Header status bar for projector */}
                <div className="flex items-center justify-between bg-slate-950/80 border border-white/10 px-4 py-2.5 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-extrabold text-xs">
                      Question {currentQuestionIndex + 1} of {defaultRNPQuestionBank.length}
                    </span>
                    <span className="text-xs text-slate-400">Official Theory Exam Bank</span>
                  </div>

                  <button
                    onClick={() => setRevealAnswer(!revealAnswer)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      revealAnswer
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-purple-600 hover:bg-purple-700 text-white border-purple-400/30 shadow-md'
                    }`}
                  >
                    {revealAnswer ? <><EyeOff size={14} /> Hide Answer</> : <><Eye size={14} /> Reveal Correct Answer & Explanation</>}
                  </button>
                </div>

                {/* Big Question Text */}
                <div className="bg-slate-950 border border-purple-500/30 p-6 rounded-3xl shadow-xl space-y-4">
                  <div className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles size={14} /> Physical Class Projector Display
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-snug">
                    {currentPresenterQ.text}
                  </h3>
                </div>

                {/* Answer Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentPresenterQ.options.map((option, optIdx) => {
                    const isCorrect = option === currentPresenterQ.correctAnswer;
                    const isSelectedRed = presenterSelectedOptions[currentPresenterQ.id] === option;
                    const letters = ['A', 'B', 'C', 'D'];
                    return (
                      <div
                        key={optIdx}
                        onClick={() => {
                          setPresenterSelectedOptions(prev => ({
                            ...prev,
                            [currentPresenterQ.id]: option
                          }));
                        }}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3.5 ${
                          isSelectedRed
                            ? 'bg-red-600 border-red-500 text-white font-bold shadow-xl shadow-red-600/40 ring-2 ring-red-500 scale-[1.02]'
                            : revealAnswer && isCorrect
                            ? 'bg-green-950/80 border-green-500 text-green-200 shadow-lg shadow-green-950/50 scale-[1.02]'
                            : revealAnswer
                            ? 'bg-slate-950/50 border-white/5 opacity-50 text-slate-400'
                            : 'bg-slate-950 border-white/10 text-white hover:border-red-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center flex-shrink-0 border ${
                            isSelectedRed
                              ? 'bg-white text-red-600 border-white font-extrabold'
                              : revealAnswer && isCorrect
                              ? 'bg-green-500 text-slate-950 border-green-400'
                              : 'bg-slate-800 text-slate-300 border-white/10'
                          }`}>
                            {letters[optIdx] || optIdx + 1}
                          </div>
                          <span className="text-sm font-semibold leading-snug">{option}</span>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isSelectedRed && (
                            <span className="px-2.5 py-1 rounded-full bg-white text-red-700 font-extrabold text-[10px] tracking-wider uppercase shadow-sm">
                              Selected (RED)
                            </span>
                          )}

                          {revealAnswer && isCorrect && (
                            <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legal Explanation Box */}
                {revealAnswer && currentPresenterQ.explanation && (
                  <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs space-y-1.5 animate-fadeIn">
                    <div className="font-extrabold text-amber-300 flex items-center gap-1.5">
                      <ShieldAlert size={16} /> Official Traffic Code Legal Explanation
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed">{currentPresenterQ.explanation}</p>
                  </div>
                )}
              </div>

              {/* Bottom Pagination controls */}
              <div className="max-w-3xl mx-auto w-full flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
                    setRevealAnswer(false);
                  }}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl text-xs font-semibold transition-all"
                >
                  <ChevronLeft size={16} /> Previous Question
                </button>

                <div className="text-xs text-slate-400 font-mono">
                  {currentQuestionIndex + 1} / {defaultRNPQuestionBank.length}
                </div>

                <button
                  onClick={() => {
                    setCurrentQuestionIndex(prev => Math.min(defaultRNPQuestionBank.length - 1, prev + 1));
                    setRevealAnswer(false);
                  }}
                  disabled={currentQuestionIndex === defaultRNPQuestionBank.length - 1}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl text-xs font-bold transition-all"
                >
                  Next Question <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXAM ACCESS CODE GENERATOR & RANDOMIZER */}
        {activeTab === 'code_generator' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Active Exercise Code Banner */}
              <div className="bg-slate-950 border border-purple-500/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${codeActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-purple-300">
                        {codeActive ? 'Active Exercise Session Code' : 'Exercise Code Expired'}
                      </span>
                    </div>
                    <h3 className="text-4xl font-black text-white font-mono tracking-widest my-2">{accessCode}</h3>
                    <p className="text-xs text-slate-400">
                      Share this code with students. When entered, 20 questions are randomly shuffled for each student.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[180px]">
                    <button
                      onClick={handleCopyCode}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 font-bold text-xs transition-all shadow-lg shadow-purple-600/30"
                    >
                      {copiedCode ? <><Check size={16} className="text-green-300" /> Copied!</> : <><Copy size={16} /> Copy Access Code</>}
                    </button>

                    <button
                      onClick={handleGenerateNewCode}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 font-semibold text-xs transition-all"
                    >
                      <Shuffle size={14} /> Create New Code
                    </button>

                    {codeActive ? (
                      <button
                        onClick={handleExpireCode}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-semibold text-xs transition-all"
                      >
                        <AlertTriangle size={14} /> Expire & Lock Code
                      </button>
                    ) : (
                      <button
                        onClick={handleGenerateNewCode}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 font-bold text-xs transition-all text-white"
                      >
                        <Play size={14} /> Reactivate Exercise Code
                      </button>
                    )}
                  </div>
                </div>

                {/* Expiration Timer display */}
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock size={16} className="text-purple-400" />
                    <span>Timer: <strong className="font-mono text-purple-300">{formatTimer(codeTimeLeft)}</strong> (20 mins limit)</span>
                  </div>
                  <div className="text-slate-400">
                    Auto-Randomization: <strong className="text-green-400 font-bold">Enabled per student</strong>
                  </div>
                </div>
              </div>

              {/* Student Entrance Testing Playground */}
              <div className="bg-slate-950 border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Student Code Entry Portal Simulator</h4>
                    <p className="text-xs text-slate-400">Test how students enter code and take randomized 20-minute exam</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                    Student Experience Test
                  </span>
                </div>

                {!isSimulatingStudentExam ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Enter Exercise Code</label>
                      <input
                        type="text"
                        value={studentEnteredCode}
                        onChange={e => setStudentEnteredCode(e.target.value.toUpperCase())}
                        placeholder="e.g. RNP-8842"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Student Full Name</label>
                      <input
                        type="text"
                        value={studentNameInput}
                        onChange={e => setStudentNameInput(e.target.value)}
                        placeholder="e.g. Habimana Eric"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {studentError && (
                      <div className="sm:col-span-2 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle size={16} /> {studentError}
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <button
                        onClick={handleStartStudentExamWithCode}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 font-bold text-sm text-white shadow-lg shadow-purple-600/30 hover:opacity-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Play size={16} /> Enter Code & Begin 20-Min Exam
                      </button>
                    </div>
                  </div>
                ) : studentSubmitted ? (
                  <div className="p-6 rounded-2xl bg-green-950/40 border border-green-500/40 text-center space-y-3">
                    <CheckCircle size={40} className="text-green-400 mx-auto" />
                    <h4 className="text-lg font-bold text-white">Exam Submitted Successfully!</h4>
                    <p className="text-xs text-slate-300">
                      Your score has been submitted to the teacher's scoreboard in real-time.
                    </p>
                    <button
                      onClick={() => setIsSimulatingStudentExam(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Return to Portal Entry
                    </button>
                  </div>
                ) : (
                  /* Active Student Exam Simulation UI */
                  <div className="space-y-4 bg-slate-900 p-5 rounded-2xl border border-purple-500/30">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div>
                        <div className="text-xs font-bold text-purple-400">Student: {studentNameInput}</div>
                        <div className="text-[10px] text-slate-400">Randomized Question {studentCurrentIndex + 1} of {studentRandomQuestions.length}</div>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 font-mono text-xs font-bold">
                        <Clock size={14} /> {formatTimer(studentTimer)}
                      </div>
                    </div>

                    {/* Question text */}
                    {studentRandomQuestions[studentCurrentIndex] && (
                      <div className="space-y-3">
                        <p className="text-sm font-bold text-white">
                          Q{studentCurrentIndex + 1}: {studentRandomQuestions[studentCurrentIndex].text}
                        </p>

                        <div className="space-y-2">
                          {studentRandomQuestions[studentCurrentIndex].options.map((opt, oIdx) => {
                            const isSelected = studentAnswers[studentRandomQuestions[studentCurrentIndex].id] === opt;
                            return (
                              <button
                                key={oIdx}
                                onClick={() => {
                                  setStudentAnswers(prev => ({
                                    ...prev,
                                    [studentRandomQuestions[studentCurrentIndex].id]: opt
                                  }));
                                }}
                                className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-2.5 ${
                                  isSelected
                                    ? 'bg-red-600 border-red-500 text-white font-bold shadow-lg shadow-red-600/30 ring-2 ring-red-500'
                                    : 'bg-slate-950 border-white/10 text-slate-300 hover:border-red-500/40'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                                    isSelected ? 'border-white bg-white text-red-600 font-black' : 'border-slate-600'
                                  }`}>
                                    {isSelected ? '✓' : String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span className="font-semibold">{opt}</span>
                                </div>

                                {isSelected && (
                                  <span className="px-2 py-0.5 rounded-full bg-white text-red-700 text-[10px] font-extrabold uppercase">
                                    Selected Answer (RED)
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <button
                        onClick={() => setStudentCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={studentCurrentIndex === 0}
                        className="px-3 py-1.5 bg-slate-800 disabled:opacity-40 text-xs rounded-xl font-semibold"
                      >
                        Back
                      </button>

                      {studentCurrentIndex < studentRandomQuestions.length - 1 ? (
                        <button
                          onClick={() => setStudentCurrentIndex(prev => prev + 1)}
                          className="px-4 py-1.5 bg-purple-600 text-xs font-bold rounded-xl hover:bg-purple-700"
                        >
                          Next Question
                        </button>
                      ) : (
                        <button
                          onClick={handleStudentSubmitExam}
                          className="px-4 py-1.5 bg-green-600 text-xs font-bold rounded-xl hover:bg-green-700 text-white shadow-md"
                        >
                          Submit 20-Min Exam
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STUDENT MARKS & DETAILED INCORRECT/CORRECT ANSWERS REVIEW */}
        {activeTab === 'student_scores' && (
          <div className="flex-1 flex min-h-0 overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
            {/* Student List Column */}
            <div className="w-80 border-r border-white/10 p-4 flex flex-col flex-shrink-0 bg-slate-950/60">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-purple-300">Student Results List</h4>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                  {exerciseResults.length} Submissions
                </span>
              </div>

              {exerciseResults.length > 0 && onBroadcastResultsList && (
                <button
                  onClick={onBroadcastResultsList}
                  className="w-full mb-3 py-2 px-3 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Radio size={14} className="text-red-400" /> Broadcast Score List to Class Screen
                </button>
              )}

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {exerciseResults.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center p-6">No student exam submissions yet.</p>
                ) : (
                  exerciseResults.map(res => {
                    const isSelected = res.studentId === selectedStudentId;
                    const passed = res.score >= 60; // 12 / 20 = 60%
                    const wrongCount = res.answers.filter(a => !a.correct).length;
                    return (
                      <button
                        key={res.studentId}
                        onClick={() => setSelectedStudentId(res.studentId)}
                        className={`w-full text-left p-3 rounded-2xl border text-xs transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-purple-600/30 border-purple-500 text-white font-bold shadow-lg'
                            : 'bg-slate-900/80 border-white/5 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {res.studentName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">{res.studentName}</div>
                            <div className="text-[10px] text-slate-400">
                              {res.earnedPoints}/{res.totalPoints} Marks ({wrongCount} Wrong)
                            </div>
                          </div>
                        </div>

                        <span className={`px-2 py-1 rounded-full text-[11px] font-black border ${
                          passed ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-red-500/20 text-red-300 border-red-500/40'
                        }`}>
                          {res.score}%
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Student Answer Breakdown Column */}
            <div className="flex-1 p-6 overflow-y-auto">
              {selectedStudentResult ? (
                <div className="max-w-3xl mx-auto space-y-5">
                  {/* Student Header */}
                  <div className="bg-slate-950 border border-purple-500/30 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center font-bold text-xl text-purple-300">
                        {selectedStudentResult.studentName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-[10px] text-purple-300 font-extrabold uppercase tracking-wider">
                          Student Exam Answer Breakdown
                        </div>
                        <h3 className="text-xl font-bold text-white">{selectedStudentResult.studentName}</h3>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Submitted {new Date(selectedStudentResult.submittedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-2xl font-black ${selectedStudentResult.score >= 60 ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedStudentResult.score}%
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          {selectedStudentResult.earnedPoints}/{selectedStudentResult.totalPoints} Marks ({selectedStudentResult.score >= 60 ? 'PASS' : 'FAIL'})
                        </div>
                      </div>

                      {onBroadcastStudent && (
                        <button
                          onClick={() => onBroadcastStudent(selectedStudentResult.studentId)}
                          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                        >
                          <Radio size={14} className="text-red-300" /> Broadcast Answers
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Answers List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Question Answers ({selectedStudentResult.answers.filter(a => a.correct).length} Correct, {selectedStudentResult.answers.filter(a => !a.correct).length} Incorrect)
                    </h4>

                    {selectedStudentResult.answers.map((ans, idx) => {
                      const qObj = defaultRNPQuestionBank.find(q => q.id === ans.questionId);
                      const isCorrect = ans.correct;

                      return (
                        <div
                          key={ans.questionId}
                          className={`p-4 rounded-2xl border text-xs transition-all ${
                            isCorrect ? 'bg-green-950/20 border-green-500/30' : 'bg-red-950/30 border-red-500/40 shadow-lg'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="font-bold text-slate-100 text-sm">
                              Q{idx + 1}: {qObj?.text || ans.questionId}
                            </span>
                            {isCorrect ? (
                              <span className="flex-shrink-0 flex items-center gap-1 text-green-400 font-bold bg-green-500/20 border border-green-500/30 px-2.5 py-0.5 rounded-full text-[10px]">
                                <CheckCircle size={12} /> Correct (+1)
                              </span>
                            ) : (
                              <span className="flex-shrink-0 flex items-center gap-1 text-red-400 font-bold bg-red-500/20 border border-red-500/30 px-2.5 py-0.5 rounded-full text-[10px]">
                                <XCircle size={12} /> Incorrect (0)
                              </span>
                            )}
                          </div>

                          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-white/10 space-y-2 mt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-300 font-medium">Selected Answer:</span>
                              <span className="px-3 py-1 rounded-lg bg-red-600 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                {ans.answer || 'No Answer'}
                              </span>
                            </div>

                            {!isCorrect && qObj && (
                              <div className="text-emerald-300 font-semibold pt-1 border-t border-white/5">
                                ✓ Correct Answer: <span className="underline">{qObj.correctAnswer}</span>
                              </div>
                            )}

                            {qObj?.explanation && (
                              <div className="text-slate-400 text-[11px] italic pt-1 border-t border-white/5">
                                💡 Traffic Code Explanation: {qObj.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
                  <Award size={48} className="text-purple-500/40" />
                  <h4 className="text-base font-bold text-white">Select a Student from the Left Panel</h4>
                  <p className="text-xs max-w-sm">
                    Click any student to inspect their exact correct and incorrect answers with legal traffic code explanations.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
