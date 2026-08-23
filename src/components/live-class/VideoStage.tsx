import { useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Hand, Pin, Radio, CheckCircle, XCircle, Award, X, ScreenShare, Shield } from 'lucide-react';
import type { Participant, StreamKind, SharedBroadcastState, ExerciseResult, ExerciseQuestion } from '@/types/live-class';

// ─────────────────────────────────────────────────────────────────────────────
// VideoTile — single participant video & audio tile
// ─────────────────────────────────────────────────────────────────────────────

interface VideoTileProps {
  participant: Participant;
  stream: MediaStream | null;
  isLocal: boolean;
  isPinned: boolean;
  onPin: () => void;
}

function VideoTile({ participant, stream, isLocal, isPinned, onPin }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const hasVideoTracks = Boolean(stream && stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled));
  const showVideo = (participant.camera === 'on' || (isLocal && hasVideoTracks)) && Boolean(stream);

  // Callback ref guarantees instant srcObject binding on element mount
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch(() => {});
    }
  }, [stream]);

  // Synchronize stream changes when stream or camera state updates
  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch(() => {});
    }
  }, [stream, participant.camera]);

  const getRoleBadge = () => {
    if (participant.isHost) {
      return <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/30 text-blue-200 rounded font-semibold flex items-center gap-1"><Shield size={10} /> Host</span>;
    }
    if (participant.role === 'teacher') {
      return <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/30 text-indigo-200 rounded font-semibold">Teacher</span>;
    }
    if (participant.role === 'school_admin') {
      return <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/30 text-purple-200 rounded font-semibold">School Admin</span>;
    }
    if (participant.role === 'super_admin') {
      return <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/30 text-amber-200 rounded font-semibold">Super Admin</span>;
    }
    return null;
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 group flex flex-col justify-center items-center shadow-lg transition-all ${
      isPinned ? 'ring-2 ring-blue-500' : ''
    }`}>
      {showVideo ? (
        <video
          ref={setVideoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 p-6 relative select-none">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-2xl font-black shadow-xl ring-4 ring-white/5">
            {participant.name ? participant.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <p className="text-white text-sm font-bold mt-3 truncate max-w-[180px]">{participant.name}</p>
          <p className="text-slate-400 text-xs mt-0.5">
            {participant.camera === 'on' ? 'Camera loading...' : 'Camera is off'}
          </p>

          {participant.mic === 'on' && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Speaking</span>
            </div>
          )}
        </div>
      )}

      {/* Overlay status bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3.5 py-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 ${
            participant.mic === 'on' ? 'bg-emerald-500/90' : 'bg-rose-500/90'
          }`}>
            {participant.mic === 'on' ? <Mic size={12} className="text-white" /> : <MicOff size={12} className="text-white" />}
          </span>
          <span className="text-white text-xs sm:text-sm font-semibold truncate max-w-[140px] sm:max-w-[180px]">
            {participant.name} {isLocal && <span className="text-blue-300 text-xs font-normal">(You)</span>}
          </span>
          {getRoleBadge()}
        </div>

        {participant.handRaised && (
          <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold animate-pulse bg-yellow-400/20 px-2 py-0.5 rounded-lg border border-yellow-400/30">
            <Hand size={13} /> Raised
          </span>
        )}
      </div>

      {/* Speaking border animation */}
      {participant.isSpeaking && (
        <div className="absolute inset-0 ring-2 ring-emerald-400 rounded-2xl pointer-events-none animate-pulse" />
      )}

      {/* Pin button */}
      <button
        onClick={onPin}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 z-20"
        title={isPinned ? 'Unpin' : 'Pin to full stage'}
      >
        <Pin size={14} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoStage — main stage layout for all participants
// ─────────────────────────────────────────────────────────────────────────────

interface VideoStageProps {
  participants: Participant[];
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  activeStreamKind: StreamKind | null;
  pinnedId: string | null;
  onPin: (id: string) => void;
  remoteStreams?: Map<string, MediaStream | null>;
  localPeerId?: string;
  broadcastState?: SharedBroadcastState;
  exerciseResults?: ExerciseResult[];
  questions?: ExerciseQuestion[];
  onSelectStudentForBroadcast?: (studentId: string | null) => void;
  onStopBroadcast?: () => void;
}

export default function VideoStage({
  participants,
  localStream,
  screenStream,
  activeStreamKind,
  pinnedId,
  onPin,
  remoteStreams,
  localPeerId,
  broadcastState,
  exerciseResults = [],
  questions = [],
  onSelectStudentForBroadcast,
  onStopBroadcast,
}: VideoStageProps) {
  const isScreenSharing = activeStreamKind === 'screen' && screenStream;

  const sharedStudent = broadcastState?.sharedStudentId
    ? exerciseResults.find(r => r.studentId === broadcastState.sharedStudentId)
    : null;

  /** Get the correct MediaStream for a participant */
  const getStream = (participantId: string, isLocal: boolean): MediaStream | null => {
    if (isLocal) return localStream;
    return remoteStreams?.get(participantId) ?? null;
  };

  const isLocalParticipant = (p?: Participant): boolean => Boolean(p && p.id === localPeerId);

  // Dynamic participant ordering: Pinned participant first, then local user, then remote participants
  const pinnedParticipant = pinnedId ? participants.find(p => p.id === pinnedId) : undefined;
  const otherParticipants = participants.filter(p => p.id !== pinnedId);

  const displayParticipants = pinnedParticipant
    ? [pinnedParticipant, ...otherParticipants]
    : participants;

  // Grid layout class based on participant count
  const count = displayParticipants.length;
  const gridClass =
    count <= 1
      ? 'grid-cols-1'
      : count === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : count <= 4
      ? 'grid-cols-2'
      : count <= 6
      ? 'grid-cols-2 md:grid-cols-3'
      : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden bg-slate-950">
      {isScreenSharing ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-3 p-3 min-h-0">
          {/* Screen share main presentation */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl flex items-center justify-center">
            <ScreenShareVideoEl stream={screenStream} />
            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-blue-600/90 text-white text-xs font-bold flex items-center gap-2 backdrop-blur-md shadow-lg">
              <ScreenShare size={15} /> Live Screen Broadcast
            </div>
          </div>

          {/* Participant thumbnails strip */}
          <div className="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto pr-1">
            {displayParticipants.map(p => (
              <div key={p.id} className="flex-shrink-0 w-44 lg:w-full aspect-video">
                <VideoTile
                  participant={p}
                  stream={getStream(p.id, isLocalParticipant(p))}
                  isLocal={isLocalParticipant(p)}
                  isPinned={pinnedId === p.id}
                  onPin={() => onPin(p.id)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 p-3 min-h-0 flex flex-col justify-center">
          <div className={`grid gap-3 h-full max-h-full ${gridClass}`}>
            {displayParticipants.map(p => (
              <VideoTile
                key={p.id}
                participant={p}
                stream={getStream(p.id, isLocalParticipant(p))}
                isLocal={isLocalParticipant(p)}
                isPinned={pinnedId === p.id}
                onPin={() => onPin(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* LIVE BROADCAST OVERLAY (When Teacher Shares Exercise Scores / Answers) */}
      {broadcastState?.isSharing && (
        <div className="absolute top-3 left-3 right-3 z-30 bg-slate-950/95 backdrop-blur-md border border-purple-500/40 rounded-2xl p-4 shadow-2xl text-white max-w-2xl mx-auto max-h-[85%] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-bold">
                <Radio size={12} className="text-red-400" /> LIVE BROADCAST TO ALL STUDENTS
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sharedStudent && onSelectStudentForBroadcast && (
                <button
                  onClick={() => onSelectStudentForBroadcast(null)}
                  className="px-2.5 py-1 text-xs font-semibold bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/30 rounded-lg transition-all"
                >
                  ← Back to Student Marks List
                </button>
              )}
              {onStopBroadcast && (
                <button onClick={onStopBroadcast} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10" title="Stop Broadcast">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {sharedStudent ? (
            <div className="space-y-3 pt-3 overflow-y-auto min-h-0 pr-1">
              <div className="flex items-center justify-between bg-purple-950/40 border border-purple-500/30 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300 font-bold text-base">
                    {sharedStudent.studentName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-[10px] text-purple-300 font-semibold uppercase tracking-wide">Featured Student Answer Breakdown</div>
                    <h4 className="text-base font-bold text-white">{sharedStudent.studentName}</h4>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-extrabold ${sharedStudent.score >= 60 ? 'text-green-400' : 'text-red-400'}`}>
                    {sharedStudent.score}%
                  </div>
                  <div className="text-[10px] text-slate-400">{sharedStudent.earnedPoints}/{sharedStudent.totalPoints} Marks</div>
                </div>
              </div>
              <div className="space-y-2.5">
                {questions.map((q, i) => {
                  const studentAns = sharedStudent.answers.find(a => a.questionId === q.id);
                  const isCorrect = studentAns?.correct || false;
                  return (
                    <div key={q.id} className={`p-3 rounded-xl border text-xs ${isCorrect ? 'bg-green-950/30 border-green-500/30' : 'bg-red-950/40 border-red-500/40'}`}>
                      <div className="flex items-start justify-between font-semibold gap-2 mb-1.5">
                        <span className="text-slate-100 font-medium">Q{i + 1}: {q.text}</span>
                        {isCorrect
                          ? <span className="flex-shrink-0 flex items-center gap-1 text-green-400 font-bold text-[10px] bg-green-500/20 px-2 py-0.5 rounded-full border border-green-500/30"><CheckCircle size={12} /> Correct (+{q.points} pt)</span>
                          : <span className="flex-shrink-0 flex items-center gap-1 text-red-400 font-bold text-[10px] bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/30"><XCircle size={12} /> Incorrect (0 pt)</span>
                        }
                      </div>
                      <div className="space-y-1 mt-2 bg-black/20 p-2 rounded-lg border border-white/5">
                        <div className="text-slate-300">
                          Student Selected: <span className={isCorrect ? 'text-green-300 font-bold' : 'text-red-300 font-bold'}>{studentAns?.answer || 'No Answer'}</span>
                        </div>
                        {!isCorrect && <div className="text-emerald-300 font-semibold text-[11px] pt-1 border-t border-white/5">✓ Correct: <span className="underline decoration-emerald-500">{q.correctAnswer}</span></div>}
                        {q.explanation && <div className="text-slate-400 text-[11px] italic pt-1 border-t border-white/5">💡 {q.explanation}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-3 overflow-y-auto min-h-0 pr-1">
              <div className="flex items-center gap-3 bg-purple-950/30 border border-purple-500/30 p-3 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Award size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Classroom Exercise Scoreboard</h4>
                  <p className="text-xs text-slate-300">Live student marks. Click a student to view their answers.</p>
                </div>
              </div>

              {exerciseResults.length > 0 && (
                <div className="grid grid-cols-3 gap-2 bg-white/5 p-2.5 rounded-xl border border-white/10 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400">Class Avg</div>
                    <div className="text-base font-bold text-purple-300">
                      {Math.round(exerciseResults.reduce((acc, r) => acc + (r.earnedPoints / r.totalPoints) * 100, 0) / exerciseResults.length)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Submissions</div>
                    <div className="text-base font-bold text-green-400">{exerciseResults.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Pass Rate (≥60%)</div>
                    <div className="text-base font-bold text-blue-400">
                      {Math.round((exerciseResults.filter(r => (r.earnedPoints / r.totalPoints) * 100 >= 60).length / exerciseResults.length) * 100)}%
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                {exerciseResults.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-4 text-center">No student submissions yet.</p>
                ) : exerciseResults.map(res => {
                  const passed = res.score >= 60;
                  return (
                    <div
                      key={res.studentId}
                      onClick={() => onSelectStudentForBroadcast?.(res.studentId)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-white/10 hover:border-purple-500/60 hover:bg-slate-800/80 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 text-slate-200 font-bold text-xs flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                          {res.studentName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">{res.studentName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>{res.earnedPoints}/{res.totalPoints} Marks</span>
                            <span className="text-green-400">• {res.answers.filter(a => a.correct).length} Correct</span>
                            {res.answers.filter(a => !a.correct).length > 0 && <span className="text-red-400">• {res.answers.filter(a => !a.correct).length} Wrong</span>}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${passed ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-red-500/20 text-red-300 border-red-500/40'}`}>
                        {res.score}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScreenShareVideoEl({ stream }: { stream: MediaStream | null }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch(() => {});
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-contain bg-slate-900"
    />
  );
}
