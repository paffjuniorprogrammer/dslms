/**
 * StudentLiveRoom.tsx
 *
 * Student-facing live class experience.
 * - Shows teacher's camera (main) + own camera (corner PiP)
 * - Real-time chat panel (responsively adapts to mobile phone & desktop)
 * - Raise hand / mic / camera controls
 * - Receives exercise_launch → renders quiz overlay
 * - Sends exercise_submit when done
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Send, Radio, Users, MessageCircle, ClipboardList, CheckCircle2
} from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import JitsiClassroom from '@/components/live-class/JitsiClassroom';
import { useLiveChat } from '@/hooks/useLiveChat';
import type { ExerciseQuestion, StudentAnswer, ExerciseResult, ExerciseProgress, SharedBroadcastState } from '@/types/live-class';

interface StudentLiveRoomProps {
  classId: string;
  classTitle: string;
  instructorName: string;
  accessCode: string;
  studentId: string;
  studentName: string;
  onLeave: () => void;
}

export default function StudentLiveRoom({
  classId,
  classTitle,
  instructorName,
  accessCode,
  studentId,
  studentName,
  onLeave,
}: StudentLiveRoomProps) {
  const [showChat, setShowChat] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  // ─── WebRTC ───────────────────────────────────────────────────────────────

  const {
    remotePeers,
    broadcastEvent,
    channelRef,
    channel,
  } = useWebRTC({
    classId,
    localPeerId: studentId,
    localName: studentName,
    localRole: 'student',
    turnUrl: import.meta.env.VITE_TURN_SERVER_URL,
    enableMedia: false,
  });

  // ─── Live chat ────────────────────────────────────────────────────────────

  const { messages, sendMessage } = useLiveChat({
    classId,
    senderId: studentId,
    senderName: studentName,
    senderRole: 'student',
  });

  // Jitsi owns camera and microphone media. Supabase remains the room bus for chat, presence, and exercises.

  // ─── Exercise state (received from host) ──────────────────────────────────

  const [exerciseActive, setExerciseActive] = useState(false);
  const [exerciseId, setExerciseId] = useState('');
  const [exerciseQuestions, setExerciseQuestions] = useState<ExerciseQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [exerciseResult, setExerciseResult] = useState<ExerciseResult | null>(null);
  const [sharedBroadcast, setSharedBroadcast] = useState<SharedBroadcastState | null>(null);
  const [sharedBroadcastResults, setSharedBroadcastResults] = useState<ExerciseResult[]>([]);
  const [presentedQuestion, setPresentedQuestion] = useState<ExerciseQuestion | null>(null);
  const [presentedAnswerRevealed, setPresentedAnswerRevealed] = useState(false);
  const onLeaveRef = useRef(onLeave);

  useEffect(() => { onLeaveRef.current = onLeave; }, [onLeave]);

  useEffect(() => {
    const ch = channelRef.current;
    if (!ch) return;

    ch.on('broadcast', { event: 'exercise_launch' }, ({ payload }) => {
      if (payload.questions && Array.isArray(payload.questions)) {
        const qs = (payload.questions as ExerciseQuestion[]).map(q => ({
          ...q,
          correctAnswer: q.correctAnswer || '',
        }));
        setExerciseId((payload.exerciseId as string) || `exercise-${Date.now()}`);
        setExerciseQuestions(qs);
        setCurrentQ(0);
        setAnswers({});
        setSubmitted(false);
        setExerciseResult(null);
        setExerciseActive(true);
      }
    });

    ch.on('broadcast', { event: 'exercise_results_broadcast' }, ({ payload }) => {
      setSharedBroadcast({
        isSharing: Boolean(payload.isSharing),
        sharedStudentId: (payload.sharedStudentId as string | null) ?? null,
        message: payload.message as string | undefined,
      });
      setSharedBroadcastResults(Array.isArray(payload.exerciseResults) ? payload.exerciseResults as ExerciseResult[] : []);
    });

    ch.on('broadcast', { event: 'question_present' }, ({ payload }) => {
      const question = payload.question as Partial<ExerciseQuestion> | undefined;
      if (!question?.id || !question.text) return;
      setPresentedAnswerRevealed(false);
      setPresentedQuestion({
        id: question.id,
        text: question.text,
        type: question.type === 'true_false' ? 'true_false' : 'multiple_choice',
        options: Array.isArray(question.options) ? question.options : [],
        correctAnswer: '',
        points: Number(question.points) || 0,
      });
    });

    ch.on('broadcast', { event: 'question_answer_reveal' }, ({ payload }) => {
      const shouldReveal = Boolean(payload.showCorrectAnswer);
      setPresentedAnswerRevealed(shouldReveal);
      setPresentedQuestion(prev => {
        if (!prev || prev.id !== payload.questionId) return prev;
        return {
          ...prev,
          correctAnswer: shouldReveal ? String(payload.correctAnswer || '') : '',
          explanation: shouldReveal ? (payload.explanation as string | undefined) : undefined,
        };
      });
    });

    ch.on('broadcast', { event: 'question_present_close' }, () => {
      setPresentedQuestion(null);
      setPresentedAnswerRevealed(false);
    });

    // Teacher removal remains a DSLMS classroom control; Jitsi owns media controls.
    ch.on('broadcast', { event: 'remove_participant' }, ({ payload }) => {
      if (payload.target === studentId) {
        alert('You have been removed from this class by the teacher.');
        onLeaveRef.current();
      }
    });


  }, [channel, channelRef, studentId]);

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  // Broadcast progress after every answer or question navigation so the teacher
  // can see who is active, how many answers are complete, and the current item.
  useEffect(() => {
    if (!exerciseActive || !exerciseId || exerciseQuestions.length === 0) return;
    const progress: ExerciseProgress = {
      exerciseId,
      studentId,
      studentName,
      currentQuestion: currentQ,
      answeredCount: Object.values(answers).filter(Boolean).length,
      totalQuestions: exerciseQuestions.length,
      answers,
      submitted,
      updatedAt: Date.now(),
    };
    broadcastEvent('exercise_progress', progress as unknown as Record<string, unknown>);
  }, [exerciseActive, exerciseId, exerciseQuestions.length, currentQ, answers, submitted, studentId, studentName, broadcastEvent]);

  const handleSubmitExercise = useCallback(() => {
    if (exerciseQuestions.length === 0) return;

    const studentAnswers: StudentAnswer[] = exerciseQuestions.map(q => {
      const given = answers[q.id] ?? '';
      return {
        questionId: q.id,
        answer: given,
        correct: given.trim().toLowerCase() === (q.correctAnswer || '').trim().toLowerCase(),
      };
    });

    const totalPoints = exerciseQuestions.reduce((s, q) => s + q.points, 0);
    const earned = studentAnswers.filter(a => a.correct).reduce((s, a) => {
      const q = exerciseQuestions.find(qq => qq.id === a.questionId);
      return s + (q?.points || 0);
    }, 0);

    const result: ExerciseResult = {
      studentId,
      studentName,
      answers: studentAnswers,
      score: Math.round((earned / totalPoints) * 100),
      totalPoints,
      earnedPoints: earned,
      submittedAt: Date.now(),
    };

    setExerciseResult(result);
    setSubmitted(true);

    broadcastEvent('exercise_submit', result as unknown as Record<string, unknown>);
  }, [exerciseQuestions, answers, studentId, studentName, broadcastEvent]);

  // ─── Timer ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // ─── Chat input ───────────────────────────────────────────────────────────

  const [chatInput, setChatInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const displayName = instructorName;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white select-none overflow-hidden">

      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-slate-900 border-b border-white/10 flex-shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button onClick={onLeave} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition">
            <X size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-white font-bold text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[220px]">{classTitle}</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider flex-shrink-0">
                <Radio size={8} className="animate-pulse" /> LIVE
              </span>
            </div>
            <p className="text-slate-400 text-[10px] sm:text-xs truncate">
              {displayName} • <span className="font-mono font-bold text-blue-300">{accessCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="text-slate-300 text-[11px] font-mono bg-white/5 px-2 py-1 rounded-lg">
            {formatTime(elapsed)}
          </div>
          <button
            onClick={() => setShowChat(p => !p)}
            className={`p-1.5 sm:p-2 rounded-xl transition-all ${showChat ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white bg-white/5'}`}
            title="Toggle Live Chat"
          >
            <MessageCircle size={16} />
          </button>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-slate-300 text-[11px]">
            <Users size={12} /> {remotePeers.size + 1}
          </div>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative overflow-hidden">

        {/* Jitsi Teacher-Led Classroom */}
        <div className={`flex flex-col min-w-0 bg-slate-950 relative ${
          showChat ? 'h-[40vh] md:h-full md:flex-1' : 'flex-1'
        }`}>
          <div className="flex-1 min-h-0">
            <JitsiClassroom
              classId={classId}
              displayName={studentName}
              role="student"
            />
          </div>
          <div className="flex-shrink-0 flex items-center justify-between gap-3 bg-slate-900/95 border-t border-white/10 px-3 py-2">
            <span className="text-[11px] text-slate-400">You joined muted. Use Jitsi controls to ask to speak.</span>
            <button onClick={onLeave} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all">
              <X size={14} /> Leave
            </button>
          </div>
        </div>

        {/* Live Chat Panel — Dedicated Scroll Area */}
        {showChat && (
          <div className="flex-1 md:w-80 md:flex-initial flex flex-col min-h-0 bg-slate-900 border-t md:border-t-0 md:border-l border-white/10 z-10">
            <div className="px-3.5 py-2 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-slate-900/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <MessageCircle size={14} className="text-blue-400" />
                <span>Live Chat</span>
              </div>
              <span className="text-[10px] text-slate-400">{messages.length} messages</span>
            </div>

            {/* Message List */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
              {messages.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-8">
                  No messages yet. Ask a question or say hello! 👋
                </div>
              ) : messages.map(msg => {
                const isOwn = msg.senderId === studentId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[10px] font-bold text-slate-400">
                        {isOwn ? 'You' : msg.senderName}
                      </span>
                      {msg.senderRole === 'teacher' && (
                        <span className="text-[9px] px-1 bg-indigo-500/20 text-indigo-300 rounded font-bold">Teacher</span>
                      )}
                      {msg.senderRole === 'host' && (
                        <span className="text-[9px] px-1 bg-blue-500/20 text-blue-300 rounded font-bold">Host</span>
                      )}
                    </div>
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${
                      isOwn
                        ? 'bg-blue-600 text-white rounded-tr-sm shadow-md'
                        : msg.senderRole === 'teacher' || msg.senderRole === 'host'
                        ? 'bg-indigo-950/80 text-indigo-100 border border-indigo-500/30 rounded-tl-sm shadow-md'
                        : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input Box */}
            <form onSubmit={handleSendChat} className="p-2 border-t border-white/10 bg-slate-950/80 flex items-center gap-1.5 flex-shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask a question or type message..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 transition-all"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Teacher question presenter */}
      {presentedQuestion && !exerciseActive && (
        <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-blue-500/40 shadow-2xl p-6 sm:p-10">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-red-300 mb-4"><Radio size={14} className="animate-pulse" /> Teacher is presenting</div>
            <div className="text-xs text-blue-300 font-bold uppercase tracking-wide mb-3">Follow along · {presentedQuestion.points} marks</div>
            <h2 className="text-2xl sm:text-4xl font-black leading-tight text-white">{presentedQuestion.text}</h2>
            {presentedQuestion.options.length > 0 && (
              <div className="grid gap-3 mt-8">
                {presentedQuestion.options.map((option, index) => (
                  <div key={`${presentedQuestion.id}-${index}`} className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/10 text-sm sm:text-lg text-slate-200">
                    <span className="w-8 h-8 shrink-0 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-sm font-black text-blue-200">{String.fromCharCode(65 + index)}</span>
                    <span>{option}</span>
                  </div>
                ))}
              </div>
            )}
            {presentedAnswerRevealed && presentedQuestion.correctAnswer && (
              <div className="mt-8 p-4 rounded-2xl bg-emerald-950/50 border border-emerald-400/40">
                <div className="text-[11px] font-black uppercase tracking-wider text-emerald-300 mb-1">Correct answer</div>
                <div className="text-lg font-extrabold text-emerald-100">{presentedQuestion.correctAnswer}</div>
                {presentedQuestion.explanation && <p className="text-xs text-emerald-200/80 mt-2">{presentedQuestion.explanation}</p>}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-6">Listen to your teacher’s explanation. The teacher will close this presentation when ready.</p>
          </div>
        </div>
      )}

      {/* Teacher result/answer broadcast */}
      {sharedBroadcast?.isSharing && (
        <div className="absolute top-3 left-3 right-3 z-40 bg-slate-950/95 border border-purple-500/40 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-purple-300">Teacher Broadcast</div>
              <h3 className="text-sm font-extrabold text-white">{sharedBroadcast.message || 'Live exercise results shared with the class'}</h3>
            </div>
            <button onClick={() => setSharedBroadcast(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10" aria-label="Close broadcast"><X size={15} /></button>
          </div>
          {sharedBroadcast.sharedStudentId ? (
            <div className="space-y-2">
              {sharedBroadcastResults.filter(result => result.studentId === sharedBroadcast.sharedStudentId).map(result => (
                <div key={result.studentId} className="flex items-center justify-between rounded-xl bg-purple-950/40 border border-purple-500/30 px-3 py-2">
                  <span className="text-xs font-bold text-white">{result.studentName}</span>
                  <span className="text-sm font-black text-purple-300">{result.score}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {sharedBroadcastResults.map(result => (
                <div key={result.studentId} className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2">
                  <div className="text-[11px] font-bold text-white truncate">{result.studentName}</div>
                  <div className="text-sm font-black text-emerald-300">{result.score}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pop-up Quiz / Live Exercise Overlay */}
      {exerciseActive && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-purple-400" />
                <h3 className="font-extrabold text-sm">Live Class Quiz</h3>
              </div>
              <button onClick={() => setExerciseActive(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {submitted && exerciseResult ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 size={42} className="text-emerald-400 mx-auto" />
                <h4 className="text-lg font-black">Exercise Submitted!</h4>
                <p className="text-2xl font-black text-purple-400">{exerciseResult.score}%</p>
                <p className="text-xs text-slate-400">
                  Earned {exerciseResult.earnedPoints} out of {exerciseResult.totalPoints} marks
                </p>
                <button
                  onClick={() => setExerciseActive(false)}
                  className="px-5 py-2 rounded-xl bg-purple-600 text-xs font-bold hover:bg-purple-500"
                >
                  Return to Class
                </button>
              </div>
            ) : exerciseQuestions.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Question {currentQ + 1} of {exerciseQuestions.length}</span>
                  <span>{exerciseQuestions[currentQ].points} Marks</span>
                </div>

                <p className="font-bold text-sm text-slate-100">
                  {exerciseQuestions[currentQ].text}
                </p>

                <div className="space-y-2">
                  {exerciseQuestions[currentQ].options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(exerciseQuestions[currentQ].id, opt)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all ${
                        answers[exerciseQuestions[currentQ].id] === opt
                          ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                          : 'bg-slate-800/80 border-white/10 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    disabled={currentQ === 0}
                    onClick={() => setCurrentQ(q => q - 1)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs disabled:opacity-40"
                  >
                    Previous
                  </button>

                  {currentQ < exerciseQuestions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQ(q => q + 1)}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 text-xs font-bold"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitExercise}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 text-xs font-bold"
                    >
                      Submit Answers
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}
