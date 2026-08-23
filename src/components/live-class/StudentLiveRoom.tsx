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

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X, Send, Hand, Mic, MicOff, Camera, CameraOff,
  Radio, Users, MessageCircle, ClipboardList, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useLiveChat } from '@/hooks/useLiveChat';
import type { ExerciseQuestion, StudentAnswer, ExerciseResult } from '@/types/live-class';

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
    localStream,
    micState,
    cameraState,
    mediaError,
    localHandRaised,
    remotePeers,
    toggleMic,
    toggleCamera,
    toggleHand,
    broadcastEvent,
    channelRef,
  } = useWebRTC({
    classId,
    localPeerId: studentId,
    localName: studentName,
    localRole: 'student',
    turnUrl: import.meta.env.VITE_TURN_SERVER_URL,
  });

  // ─── Live chat ────────────────────────────────────────────────────────────

  const { messages, sendMessage } = useLiveChat({
    classId,
    senderId: studentId,
    senderName: studentName,
    senderRole: 'student',
    channel: channelRef.current,
  });

  // ─── Find host / teacher stream ───────────────────────────────────────────

  const hostPeer = useMemo(() => {
    const peers = Array.from(remotePeers.values());
    return (
      peers.find(p => p.role === 'teacher' || p.role === 'host' || p.role === 'school_admin' || p.role === 'super_admin') ||
      peers.find(p => p.stream !== null) ||
      peers[0] ||
      null
    );
  }, [remotePeers]);

  const hostStream = hostPeer?.stream ?? null;
  const hasHostVideo = Boolean(hostStream && hostPeer?.cameraState === 'on');

  // ─── Exercise state (received from host) ──────────────────────────────────

  const [exerciseActive, setExerciseActive] = useState(false);
  const [exerciseQuestions, setExerciseQuestions] = useState<ExerciseQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [exerciseResult, setExerciseResult] = useState<ExerciseResult | null>(null);

  useEffect(() => {
    const ch = channelRef.current;
    if (!ch) return;

    ch.on('broadcast', { event: 'exercise_launch' }, ({ payload }) => {
      if (payload.questions && Array.isArray(payload.questions)) {
        const qs = (payload.questions as ExerciseQuestion[]).map(q => ({
          ...q,
          correctAnswer: q.correctAnswer || '',
        }));
        setExerciseQuestions(qs);
        setCurrentQ(0);
        setAnswers({});
        setSubmitted(false);
        setExerciseResult(null);
        setExerciseActive(true);
      }
    });

    // Handle mute / removal from host
    ch.on('broadcast', { event: 'mute_all' }, () => {
      if (micState === 'on') toggleMic();
    });

    ch.on('broadcast', { event: 'mute_participant' }, ({ payload }) => {
      if (payload.target === studentId && micState === 'on') toggleMic();
    });

    ch.on('broadcast', { event: 'remove_participant' }, ({ payload }) => {
      if (payload.target === studentId) {
        alert('You have been removed from this class by the teacher.');
        onLeave();
      }
    });

    ch.on('broadcast', { event: 'lower_hand' }, ({ payload }) => {
      if (payload.target === studentId && localHandRaised) toggleHand();
    });
  }, [channelRef, micState, studentId, toggleMic, toggleHand, localHandRaised, onLeave]);

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

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

  // ─── Callback refs for auto-playing streams ───────────────────────────────

  const setHostVideoRef = useCallback((el: HTMLVideoElement | null) => {
    if (el && hostStream) {
      if (el.srcObject !== hostStream) el.srcObject = hostStream;
      el.play().catch(() => {});
    }
  }, [hostStream]);

  const setLocalVideoRef = useCallback((el: HTMLVideoElement | null) => {
    if (el && localStream) {
      if (el.srcObject !== localStream) el.srcObject = localStream;
      el.play().catch(() => {});
    }
  }, [localStream]);

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

  const displayName = hostPeer?.name || instructorName;

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

        {/* Video Area */}
        <div className={`flex flex-col min-w-0 bg-slate-950 relative ${
          showChat ? 'h-[40vh] md:h-full md:flex-1' : 'flex-1'
        }`}>

          {/* Main Stage (Teacher Screen / Camera) */}
          <div className="flex-1 bg-slate-900 relative flex items-center justify-center min-h-0 overflow-hidden">
            {hasHostVideo ? (
              <video
                ref={setHostVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2.5 text-slate-400 p-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-2xl font-black shadow-xl ring-4 ring-white/5">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-200 text-xs sm:text-sm">{hostPeer ? displayName : 'Waiting for teacher...'}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {hostPeer ? 'Teacher camera is off' : 'Teacher has not joined yet'}
                  </p>
                </div>
              </div>
            )}

            {/* Teacher Name Tag */}
            <div className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] font-semibold text-white flex items-center gap-1.5 z-10">
              <span className={`w-2 h-2 rounded-full ${hostPeer ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="truncate max-w-[120px]">{displayName}</span>
              {hostPeer?.micState === 'on' && <Mic size={11} className="text-emerald-400 flex-shrink-0" />}
            </div>

            {/* Own Camera (Picture-in-Picture) */}
            <div className="absolute bottom-2.5 right-2.5 w-20 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden bg-slate-900 border border-white/20 shadow-2xl z-10">
              {localStream && cameraState === 'on' ? (
                <video
                  ref={setLocalVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-950">
                  <CameraOff size={14} />
                  <span className="text-[9px] mt-0.5">You (Off)</span>
                </div>
              )}
            </div>

            {/* Media error banner */}
            {mediaError && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-rose-600 text-white text-[11px] font-bold rounded-xl shadow-xl z-30">
                {mediaError}
              </div>
            )}
          </div>

          {/* Quick Floating Controls on Mobile / Bottom Bar */}
          <div className="flex-shrink-0 bg-slate-900/90 border-t border-white/10 px-3 py-2 flex items-center justify-center gap-2 sm:gap-3 z-10">
            {/* Mic */}
            <button
              onClick={toggleMic}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                micState === 'on' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {micState === 'on' ? <Mic size={14} /> : <MicOff size={14} />}
              <span>{micState === 'on' ? 'Unmuted' : 'Muted'}</span>
            </button>

            {/* Camera */}
            <button
              onClick={toggleCamera}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                cameraState === 'on' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 border border-white/10'
              }`}
            >
              {cameraState === 'on' ? <Camera size={14} /> : <CameraOff size={14} />}
              <span>{cameraState === 'on' ? 'Video On' : 'Video Off'}</span>
            </button>

            {/* Hand raise */}
            <button
              onClick={toggleHand}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                localHandRaised ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50 animate-pulse' : 'bg-slate-800 text-slate-400 border border-white/10'
              }`}
            >
              <Hand size={14} />
              <span>{localHandRaised ? 'Raised' : 'Raise Hand'}</span>
            </button>

            {/* Leave */}
            <button
              onClick={onLeave}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all"
            >
              <X size={14} />
              <span>Leave</span>
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
