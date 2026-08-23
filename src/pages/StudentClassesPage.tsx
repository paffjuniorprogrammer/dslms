import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  KeyRound, Video, BookOpen, AlertTriangle, CheckCircle2,
  Clock, PlayCircle, Send, MessageSquare, ShieldCheck,
  Award, ArrowRight, RotateCcw, X, Check
} from 'lucide-react';
import { defaultTheoryQuestionBank } from '@/data/rnpQuestions';

export default function StudentClassesPage() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState('');
  const [activeNotification, setActiveNotification] = useState<{ type: 'expired' | 'invalid' | 'success'; message: string } | null>(null);

  // Active view states
  const [activeLiveClass, setActiveLiveClass] = useState<{ id: string; title: string; instructor: string; code: string } | null>(null);
  const [activePhysicalExam, setActivePhysicalExam] = useState<{ id: string; title: string; code: string } | null>(null);

  // Live class interactive state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string; isTeacher?: boolean }>>([
    { sender: 'Teacher Eric Mugisha', text: 'Welcome everyone! Today we are covering Priority Rules & Roundabouts.', time: '14:01', isTeacher: true },
    { sender: 'Uwase Aline (You)', text: 'Hello teacher! Ready for the session.', time: '14:02' }
  ]);

  // Exam solver state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examScore, setExamScore] = useState<number | null>(null);

  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setCode(codeParam);
      handleJoinCode(codeParam);
    }
  }, [searchParams]);

  const handleJoinCode = (enteredCode: string) => {
    const cleanCode = enteredCode.trim().toUpperCase();
    setActiveNotification(null);

    if (!cleanCode) {
      setActiveNotification({
        type: 'invalid',
        message: 'Please enter a class code to proceed.'
      });
      return;
    }

    // Check Expired Code
    if (cleanCode.includes('EXP') || cleanCode === 'EXP-999' || cleanCode === 'OLD-101') {
      setActiveNotification({
        type: 'expired',
        message: `❌ Access Code Expired: The code "${cleanCode}" expired on March 1, 2026. Please contact your school teacher or administrator for a new code.`
      });
      return;
    }

    // Check Live Class Codes
    if (cleanCode.startsWith('LC-') || cleanCode.startsWith('LIVE-') || cleanCode.length >= 4) {
      window.location.href = `/student?code=${cleanCode}`;
      return;
    }

    // Check Physical Class / Exam Codes
    if (cleanCode.includes('PHYS') || cleanCode.includes('EXAM') || cleanCode === 'PHYS-8842' || cleanCode === 'PHYS-101') {
      setActivePhysicalExam({
        id: 'EX-8842',
        title: 'Traffic Signs & Road Markings Practice Exam',
        code: cleanCode
      });
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setExamSubmitted(false);
      setExamScore(null);
      setActiveNotification({
        type: 'success',
        message: `Loaded Physical Class Exam via Code: ${cleanCode}`
      });
      return;
    }

    // Default fallback invalid code
    setActiveNotification({
      type: 'invalid',
      message: `❌ Invalid Code: The class code "${cleanCode}" was not found in the system. Please verify the spelling.`
    });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMsg = {
      sender: 'Uwase Aline (You)',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
  };

  const handleSelectOption = (qId: string, optionIdx: number) => {
    if (examSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const handleSubmitExam = () => {
    let score = 0;
    defaultTheoryQuestionBank.slice(0, 10).forEach(q => {
      const userSelIdx = userAnswers[q.id];
      if (userSelIdx !== undefined && q.options[userSelIdx] === q.correctAnswer) {
        score += 1;
      }
    });
    setExamScore(score);
    setExamSubmitted(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Classes & Exam Entry</h1>
        <p className="text-sm text-slate-500 mt-0.5">Enter your class or exam code to join live classes or access physical class tests</p>
      </div>

      {/* Code Entry Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
            <KeyRound size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Enter Access Code</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter the code provided by your teacher to jump straight into a Live Class or Physical Exam.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoinCode(code);
            }}
            className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2"
          >
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. LIVE-7049 or PHYS-8842"
              className="flex-1 px-4 py-3 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder:normal-case tracking-wider text-slate-800"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              Join Class <ArrowRight size={16} />
            </button>
          </form>

          {/* Preset Demo Codes Quick Launcher */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Try Demo Class Codes</div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => { setCode('LIVE-7049'); handleJoinCode('LIVE-7049'); }}
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-mono font-semibold border border-blue-200 hover:bg-blue-100 transition-all flex items-center gap-1.5"
              >
                <Video size={13} /> LIVE-7049 (Live Class)
              </button>
              <button
                type="button"
                onClick={() => { setCode('PHYS-8842'); handleJoinCode('PHYS-8842'); }}
                className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-mono font-semibold border border-purple-200 hover:bg-purple-100 transition-all flex items-center gap-1.5"
              >
                <BookOpen size={13} /> PHYS-8842 (Physical Exam)
              </button>
              <button
                type="button"
                onClick={() => { setCode('EXP-999'); handleJoinCode('EXP-999'); }}
                className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-mono font-semibold border border-rose-200 hover:bg-rose-100 transition-all flex items-center gap-1.5"
              >
                <Clock size={13} /> EXP-999 (Expired Code)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {activeNotification && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            activeNotification.type === 'expired'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : activeNotification.type === 'invalid'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {activeNotification.type === 'expired' ? (
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          ) : activeNotification.type === 'invalid' ? (
            <AlertTriangle size={20} className="text-rose-600 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium">{activeNotification.message}</div>
          <button onClick={() => setActiveNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Active Live Class Viewer Modal / Section */}
      {activeLiveClass && (
        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl text-white border border-slate-800 space-y-0">
          <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>
              <div>
                <h3 className="font-bold text-base text-white">{activeLiveClass.title}</h3>
                <p className="text-xs text-slate-400">Instructor: {activeLiveClass.instructor} • Code: {activeLiveClass.code}</p>
              </div>
            </div>
            <button
              onClick={() => setActiveLiveClass(null)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
            >
              Leave Class
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[420px]">
            {/* Live Video Presentation Screen */}
            <div className="lg:col-span-2 bg-slate-950 p-6 flex flex-col justify-between border-r border-slate-800 relative">
              <div className="aspect-video bg-gradient-to-br from-slate-900 to-blue-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group">
                <div className="w-16 h-16 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center mb-3 border border-blue-500/30">
                  <PlayCircle size={36} />
                </div>
                <h4 className="text-lg font-bold text-white">Live Stream Active</h4>
                <p className="text-xs text-slate-400 mt-1">Module 4: Roundabouts, Priority Signage & Overtaking Procedure</p>

                <div className="absolute top-4 left-4 bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span> LIVE NOW
                </div>
                <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-lg text-xs text-slate-300 border border-slate-700">
                  👥 24 Students Online
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>Driver Theory Syllabus 2026</span>
                <span className="flex items-center gap-1 text-emerald-400"><ShieldCheck size={14} /> Official School Stream</span>
              </div>
            </div>

            {/* Live Chat sidebar */}
            <div className="bg-slate-900 flex flex-col h-full border-t lg:border-t-0 border-slate-800">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-300">
                <MessageSquare size={14} className="text-blue-400" /> Class Live Chat
              </div>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[320px]">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`p-2.5 rounded-xl text-xs space-y-1 ${msg.isTeacher ? 'bg-blue-950/80 border border-blue-800/50' : 'bg-slate-800/80'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${msg.isTeacher ? 'text-blue-300' : 'text-slate-200'}`}>{msg.sender}</span>
                      <span className="text-[10px] text-slate-500">{msg.time}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all">
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Active Physical Exam Quiz Solver */}
      {activePhysicalExam && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
                <BookOpen size={12} /> Physical Class Test Solver
              </div>
              <h2 className="text-xl font-bold text-slate-800">{activePhysicalExam.title}</h2>
              <p className="text-xs text-slate-500">Access Code: <strong className="font-mono text-slate-700">{activePhysicalExam.code}</strong> • 10 Questions</p>
            </div>
            <button
              onClick={() => setActivePhysicalExam(null)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 self-start sm:self-auto"
            >
              Close Test
            </button>
          </div>

          {/* Exam Status or Results */}
          {examSubmitted ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-6 rounded-2xl text-center space-y-3">
                <Award size={40} className="text-amber-400 mx-auto" />
                <h3 className="text-2xl font-black">Test Result: {examScore} / 10</h3>
                <p className="text-slate-300 text-sm">
                  Percentage: <strong className="text-emerald-400">{((examScore || 0) / 10) * 100}%</strong> • Status:{' '}
                  <span className={(examScore || 0) >= 8 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {(examScore || 0) >= 8 ? 'PASSED' : 'RE-TAKE RECOMMENDED'}
                  </span>
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setExamSubmitted(false);
                      setUserAnswers({});
                      setCurrentQuestionIndex(0);
                    }}
                    className="px-4 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <RotateCcw size={14} /> Retry Test
                  </button>
                </div>
              </div>

              {/* Detailed Question Review */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-sm">Question Breakdown & Solutions</h4>
                <div className="space-y-3">
                  {defaultTheoryQuestionBank.slice(0, 10).map((q, idx) => {
                    const userSelIdx = userAnswers[q.id];
                    const isCorrect = userSelIdx !== undefined && q.options[userSelIdx] === q.correctAnswer;
                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">Q{idx + 1}. {q.text}</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>
                        <div className="space-y-1 pt-1">
                          {q.options.map((opt, oIdx) => {
                            const isCorrectOpt = opt === q.correctAnswer;
                            const isUserSelection = userSelIdx === oIdx;
                            return (
                              <div
                                key={oIdx}
                                className={`p-2 rounded-lg flex items-center justify-between ${
                                  isCorrectOpt
                                    ? 'bg-emerald-100 text-emerald-900 font-bold'
                                    : isUserSelection
                                    ? 'bg-rose-100 text-rose-900 line-through'
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
            </div>
          ) : (
            /* Active Question Solver */
            <div className="space-y-6">
              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-500 font-semibold mb-1">
                  <span>Question {currentQuestionIndex + 1} of 10</span>
                  <span>{Object.keys(userAnswers).length} answered</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all"
                    style={{ width: `${((currentQuestionIndex + 1) / 10) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Current Question */}
              {(() => {
                const q = defaultTheoryQuestionBank[currentQuestionIndex];
                if (!q) return null;
                const selected = userAnswers[q.id];

                return (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                      <h3 className="text-base font-bold text-slate-800">{q.text}</h3>
                      {q.mediaUrl && (
                        <img src={q.mediaUrl} alt="Sign" className="mt-3 h-32 object-contain rounded-lg border border-slate-200 bg-white p-2 mx-auto" />
                      )}
                    </div>

                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectOption(q.id, oIdx)}
                          className={`w-full p-3.5 text-left text-sm rounded-xl border transition-all flex items-center justify-between ${
                            selected === oIdx
                              ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <span>{opt}</span>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            selected === oIdx ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                          }`}>
                            {selected === oIdx && <Check size={12} />}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                      >
                        Previous
                      </button>

                      {currentQuestionIndex < 9 ? (
                        <button
                          onClick={() => setCurrentQuestionIndex(p => Math.min(9, p + 1))}
                          className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                        >
                          Next Question
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmitExam}
                          className="px-6 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md"
                        >
                          Submit Test
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
