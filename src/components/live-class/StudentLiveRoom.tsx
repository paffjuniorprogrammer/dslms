/**
 * StudentLiveRoom.tsx
 *
 * Student-facing live class experience.
 * - Shows teacher's camera (main) + own camera (corner PiP)
 * - Real-time chat panel
 * - Raise hand / mic / camera controls
 * - Receives exercise_launch → renders quiz overlay
 * - Sends exercise_submit when done
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X, Send, Hand, Mic, MicOff, Camera, CameraOff, Pin,
  Radio, Users, MessageCircle, ClipboardList, CheckCircle2
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

  // ─── Find host stream ─────────────────────────────────────────────────────

  const hostPeer = useMemo(() => {
    for (const peer of remotePeers.values()) {
      if (peer.role === 'host') return peer;
    }
    return null;
  }, [remotePeers]);

  const hostStream = hostPeer?.stream ?? null;

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
      // Auto-mute mic
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

  // ─── Local video ref ──────────────────────────────────────────────────────

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const hostVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (hostVideoRef.current) {
      hostVideoRef.current.srcObject = hostStream;
    }
  }, [hostStream]);

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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white select-none">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onLeave} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition">
            <X size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-sm truncate max-w-[200px]">{classTitle}</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold">
                <Radio size={9} className="animate-pulse" /> LIVE
              </span>
            </div>
            <p className="text-slate-400 text-xs">Teacher: {instructorName} • Code: {accessCode}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-slate-300 text-xs font-mono bg-white/5 px-2 py-1 rounded-lg">
            {formatTime(elapsed)}
          </div>
          <button
            onClick={() => setShowChat(p => !p)}
            className={`p-2 rounded-lg transition-all ${showChat ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
          >
            <MessageCircle size={16} />
          </button>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-slate-300 text-xs">
            <Users size={12} /> {remotePeers.size + 1}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">

        {/* Video area */}
        <div className="flex-1 flex flex-col min-w-0 relative">

          {/* Teacher video (main) */}
          <div className="flex-1 bg-slate-900 relative flex items-center justify-center min-h-0">
            {hostStream && hostPeer?.cameraState === 'on' ? (
              <video
                ref={hostVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-bold shadow-xl">
                  {instructorName.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-200">{hostPeer ? instructorName : 'Waiting for teacher...'}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {hostPeer ? 'Camera is off' : 'Teacher has not joined yet'}
                  </p>
                </div>
              </div>
            )}

            {/* Teacher label */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${hostPeer ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
              {instructorName}
              {hostPeer?.micState === 'on' && <Mic size={11} className="text-green-400" />}
            </div>

            {/* Own camera (PiP) */}
            <div className="absolute bottom-3 right-3 w-28 h-20 rounded-xl overflow-hidden bg-slate-800 border-2 border-slate-700 shadow-xl">
              {localStream && cameraState === 'on' ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  <Camera size={18} />
                </div>
              )}
              <div className="absolute bottom-1 left-1 right-1 text-center text-[9px] text-white/70 font-semibold truncate">You</div>
            </div>
          </div>

          {/* Media error */}
          {mediaError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl shadow-xl z-50">
              {mediaError}
            </div>
          )}

          {/* Controls bar */}
          <div className="flex-shrink-0 bg-slate-900 border-t border-white/10 px-4 py-3 flex items-center justify-center gap-3">
            {/* Mic */}
            <button
              onClick={toggleMic}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                micState === 'on' ? 'bg-slate-800 text-white' : 'bg-red-600/20 text-red-400 border border-red-500/30'
              }`}
            >
              {micState === 'on' ? <Mic size={18} /> : <MicOff size={18} />}
              <span className="text-[10px] font-semibold">{micState === 'on' ? 'Mic On' : 'Muted'}</span>
            </button>

            {/* Camera */}
            <button
              onClick={toggleCamera}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                cameraState === 'on' ? 'bg-slate-800 text-white' : 'bg-slate-800/50 text-slate-400'
              }`}
            >
              {cameraState === 'on' ? <Camera size={18} /> : <CameraOff size={18} />}
              <span className="text-[10px] font-semibold">{cameraState === 'on' ? 'Camera' : 'Off'}</span>
            </button>

            {/* Hand raise */}
            <button
              onClick={toggleHand}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                localHandRaised ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 animate-pulse' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Hand size={18} />
              <span className="text-[10px] font-semibold">{localHandRaised ? 'Hand Raised' : 'Raise Hand'}</span>
            </button>

            {/* Leave */}
            <button
              onClick={onLeave}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white transition-all"
            >
              <X size={18} />
              <span className="text-[10px] font-semibold">Leave</span>
            </button>
          </div>
        </div>

        {/* Chat panel */}
        {showChat && (
          <div className="w-72 flex-shrink-0 flex flex-col border-l border-white/10 bg-slate-900">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 flex-shrink-0">
              <MessageCircle size={15} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Live Chat</h3>
              <span className="ml-auto text-xs text-slate-500">{messages.length} messages</span>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {messages.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-8">No messages yet. Say hello! 👋</div>
              ) : messages.map(msg => {
                const isOwn = msg.senderId === studentId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                        msg.senderRole === 'host' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}>
                        {msg.senderName.charAt(0)}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">{msg.senderName}</span>
                      {msg.senderRole === 'host' && (
                        <span className="text-[9px] px-1 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">Teacher</span>
                      )}
                    </div>
                    <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs ${
                      isOwn
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : msg.senderRole === 'host'
                        ? 'bg-blue-950/70 text-slate-200 border border-blue-800/50 rounded-tl-sm'
                        : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── Exercise overlay ── */}
      {exerciseActive && !submitted && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 p-5 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <ClipboardList size={20} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Live Exercise</h3>
                <p className="text-xs text-slate-500">
                  Question {currentQ + 1} of {exerciseQuestions.length} •{' '}
                  {Object.keys(answers).length} answered
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-1.5">
              <div
                className="bg-purple-600 h-full transition-all"
                style={{ width: `${((currentQ + 1) / exerciseQuestions.length) * 100}%` }}
              />
            </div>

            {/* Current question */}
            {exerciseQuestions[currentQ] && (() => {
              const q = exerciseQuestions[currentQ];
              const selected = answers[q.id];
              return (
                <div className="p-5 space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-800 text-sm">{q.text}</p>
                    {q.points && <span className="text-xs text-slate-400 mt-1 inline-block">{q.points} pts</span>}
                  </div>
                  <div className="space-y-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSelectAnswer(q.id, opt)}
                        className={`w-full p-3 text-left text-sm rounded-xl border transition-all ${
                          selected === opt
                            ? 'bg-purple-50 border-purple-500 text-purple-900 font-semibold'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setCurrentQ(p => Math.max(0, p - 1))}
                      disabled={currentQ === 0}
                      className="flex-1 py-2.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    {currentQ < exerciseQuestions.length - 1 ? (
                      <button
                        onClick={() => setCurrentQ(p => p + 1)}
                        className="flex-1 py-2.5 text-xs font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700"
                      >
                        Next →
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmitExercise}
                        className="flex-1 py-2.5 text-xs font-extrabold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-md"
                      >
                        Submit Answers
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Exercise result */}
      {submitted && exerciseResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <CheckCircle2 size={48} className={`mx-auto ${exerciseResult.score >= 60 ? 'text-emerald-500' : 'text-rose-500'}`} />
            <h3 className="text-xl font-extrabold text-slate-800">
              {exerciseResult.score >= 60 ? '🎉 Well Done!' : 'Keep Practicing!'}
            </h3>
            <div className={`text-4xl font-black ${exerciseResult.score >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {exerciseResult.score}%
            </div>
            <p className="text-sm text-slate-500">
              {exerciseResult.earnedPoints}/{exerciseResult.totalPoints} points •{' '}
              {exerciseResult.answers.filter(a => a.correct).length} correct out of {exerciseResult.answers.length}
            </p>
            <div className={`px-4 py-2 rounded-xl text-xs font-bold ${
              exerciseResult.score >= 60 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {exerciseResult.score >= 60 ? 'PASSED ✓' : 'NEEDS IMPROVEMENT'}
            </div>
            <button
              onClick={() => { setSubmitted(false); setExerciseActive(false); }}
              className="w-full py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all"
            >
              Return to Class
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
