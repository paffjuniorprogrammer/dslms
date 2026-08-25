import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  MessageCircle, Users,
  ClipboardList, BarChart3, Copy, Check, Radio,
  ChevronLeft, Award, Sparkles, MonitorUp
} from 'lucide-react';
import JitsiClassroom from '@/components/live-class/JitsiClassroom';
import ChatPanel from '@/components/live-class/ChatPanel';
import ParticipantsPanel from '@/components/live-class/ParticipantsPanel';
import LiveExercise from '@/components/live-class/LiveExercise';
import LiveClassSettingsModal from '@/components/live-class/LiveClassSettingsModal';
import RNPPhysicalClassPresenterModal from '@/components/live-class/RNPPhysicalClassPresenterModal';
import LiveQuestionPresenter from '@/components/live-class/LiveQuestionPresenter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetchQuestions, updateLiveClassStatus } from '@/lib/db';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useLiveChat } from '@/hooks/useLiveChat';
import { useLivePresence } from '@/hooks/useLivePresence';
import type {
  ExerciseQuestion, ExerciseResult, StudentAnswer, ExerciseProgress, SharedBroadcastState, ParticipantRole
} from '@/types/live-class';

// ─────────────────────────────────────────────────────────────────────────────
// Demo / fallback question bank
// ─────────────────────────────────────────────────────────────────────────────

const demoQuestions: ExerciseQuestion[] = [
  {
    id: 'q1',
    text: 'What is the maximum speed limit in urban areas in Rwanda?',
    type: 'multiple_choice',
    options: ['40 km/h', '50 km/h', '60 km/h', '70 km/h'],
    correctAnswer: '40 km/h',
    points: 2,
    explanation: 'According to Rwandan traffic code, the speed limit within urban boundaries is 40 km/h.',
  },
  {
    id: 'q2',
    text: 'What does a solid red traffic light mean?',
    type: 'multiple_choice',
    options: ['Stop completely and wait', 'Proceed with caution', 'Yield to right turners', 'Honk and go'],
    correctAnswer: 'Stop completely and wait',
    points: 2,
    explanation: 'A red traffic light requires drivers to come to a complete stop before the stop line.',
  },
  {
    id: 'q3',
    text: 'When approaching a roundabout, you must give right of way to:',
    type: 'multiple_choice',
    options: ['Vehicles entering from left', 'Vehicles already inside the roundabout', 'Pedestrians on sidewalks', 'Fastest vehicle'],
    correctAnswer: 'Vehicles already inside the roundabout',
    points: 2,
    explanation: 'Traffic already circulating inside the roundabout always has right of way.',
  },
  {
    id: 'q4',
    text: 'True or False: Seat belts are mandatory for all vehicle occupants in Rwanda.',
    type: 'true_false',
    options: ['True', 'False'],
    correctAnswer: 'True',
    points: 1,
    explanation: 'Seat belts must be worn by both driver and all passengers in moving vehicles.',
  },
  {
    id: 'q5',
    text: 'Before starting a vehicle engine, what should you verify first?',
    type: 'multiple_choice',
    options: ['Adjust mirrors, seat & wear belt', 'Turn on high-beam headlights', 'Rev the engine', 'Open all doors'],
    correctAnswer: 'Adjust mirrors, seat & wear belt',
    points: 2,
    explanation: 'Proper cockpit preparation ensures safe visibility and driver safety.',
  },
];

type SidePanel = 'chat' | 'participants' | null;

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function LiveClassRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: classId } = useParams<{ id: string }>();
  const passedState = location.state as { title?: string; className?: string; code?: string } | null;
  const [sessionStatus, setSessionStatus] = useState<'scheduled' | 'live' | 'ended' | 'cancelled'>('live');
  const [sessionDetails, setSessionDetails] = useState<{ title: string; code: string; category: string }>({
    title: passedState?.title || 'Rwanda Driving Code - Live Theory Class',
    code: passedState?.code || classId || '',
    category: passedState?.className || 'Class Category: Category B',
  });

  useEffect(() => {
    async function loadClassInfo() {
      if (!classId) return;
      const { data } = await supabase
        .from('live_classes')
        .select('title, access_code, class_type, license_category')
        .eq('id', classId)
        .maybeSingle();

      if (data) {
        setSessionDetails(prev => ({
          title: data.title || prev.title,
          code: data.access_code || prev.code,
          category: data.license_category ? `Category ${data.license_category}` : prev.category,
        }));
      }
    }
    void loadClassInfo();
  }, [classId]);

  const { profile } = useAuth();

  const localPeerId = useMemo(() => profile?.id || `guest-${Math.random().toString(36).slice(2, 8)}`, [profile?.id]);
  const localName = useMemo(() => profile?.full_name || 'Instructor', [profile?.full_name]);
  const localRole = useMemo((): ParticipantRole => {
    if (profile?.role === 'super_admin') return 'super_admin';
    if (profile?.role === 'school_admin') return 'school_admin';
    if (profile?.role === 'teacher') return 'teacher';
    if (profile?.role === 'student') return 'student';
    return 'teacher';
  }, [profile?.role]);

  // Keep every room synchronized with the database-backed class lifecycle.
  useEffect(() => {
    if (!classId || classId === 'demo' || classId === 'new') return;

    let mounted = true;
    const loadStatus = async () => {
      const { data, error } = await supabase
        .from('live_classes')
        .select('status')
        .eq('id', classId)
        .maybeSingle();
      if (!error && data && mounted) {
        setSessionStatus(data.status as 'scheduled' | 'live' | 'ended' | 'cancelled');
      }
    };

    void loadStatus();

    const statusChannel = supabase
      .channel(`live_class_status:${classId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_classes',
        filter: `id=eq.${classId}`,
      }, ({ new: next }) => {
        const status = next.status as 'scheduled' | 'live' | 'ended' | 'cancelled';
        setSessionStatus(status);
        if (localRole === 'student' && (status === 'ended' || status === 'cancelled')) {
          alert(`This live class has ${status === 'ended' ? 'ended' : 'been cancelled'}.`);
          navigate(-1);
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      void statusChannel.unsubscribe();
    };
  }, [classId, localRole, navigate]);

  // ─── WebRTC hook (camera, mic, peer connections, signaling) ───────────────

  const {
    localStream,
    micState,
    cameraState,
    localHandRaised,
    remotePeers,
    broadcastEvent,
    channelRef,
    channel,
  } = useWebRTC({
    classId: classId || 'demo',
    localPeerId,
    localName,
    localRole,
    turnUrl: import.meta.env.VITE_TURN_SERVER_URL,
    enableMedia: false,
  });

  // ─── Live chat hook ────────────────────────────────────────────────────────

  const {
    messages,
    sendMessage,
    pinMessage,
    deleteMessage,
  } = useLiveChat({
    classId: classId || 'demo',
    senderId: localPeerId,
    senderName: localName,
    senderRole: localRole,
  });

  // ─── Live presence hook ────────────────────────────────────────────────────

  const {
    participants,
    raisedHandCount,
    muteAll,
    disableAllCameras,
    lowerAllHands,
    removeParticipant,
  } = useLivePresence({
    classId: classId || 'demo',
    localPeerId,
    localName,
    localRole,
    remotePeers,
    localMicState: micState,
    localCameraState: cameraState,
    localHandRaised,
    channelRef,
  });

  const isHost = localRole !== 'student';

  // ─── Questions (from DB or fallback demo) ─────────────────────────────────

  const [questions, setQuestions] = useState<ExerciseQuestion[]>(demoQuestions);

  useEffect(() => {
    fetchQuestions().then(dbQs => {
      if (dbQs.length > 0) {
        const mapped: ExerciseQuestion[] = dbQs.slice(0, 10).map(q => ({
          id: q.id,
          text: q.question_text,
          type: q.question_type === 'true_false' ? 'true_false' : 'multiple_choice',
          options: q.options ?? [],
          correctAnswer: q.correct_answer,
          points: q.points ?? 2,
          explanation: q.explanation || undefined,
        }));
        setQuestions(mapped);
      }
    }).catch(console.error);
  }, []);

  // ─── Exercise state ────────────────────────────────────────────────────────

  const [exerciseResults, setExerciseResults] = useState<ExerciseResult[]>([]);
  const [exerciseProgress, setExerciseProgress] = useState<Record<string, ExerciseProgress>>({});
  const [exerciseId, setExerciseId] = useState('');
  const [exerciseActive, setExerciseActive] = useState(false);
  const [studentSubmitted, setStudentSubmitted] = useState(false);
  const [showPreExModal, setShowPreExModal] = useState(false);
  const [isQuestionPresenterOpen, setIsQuestionPresenterOpen] = useState(false);
  const [presentingQuestionIndex, setPresentingQuestionIndex] = useState(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const questionsRef = useRef(questions);
  const exerciseIdRef = useRef(exerciseId);

  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { exerciseIdRef.current = exerciseId; }, [exerciseId]);

  // Listen for exercise events
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch) return;

    if (localRole === 'student') {
      ch.on('broadcast', { event: 'exercise_launch' }, () => {
        setExerciseActive(true);
        setStudentSubmitted(false);
      });
    }

    if (isHost) {
      ch.on('broadcast', { event: 'exercise_progress' }, ({ payload }) => {
        const progress = payload as ExerciseProgress;
        if (progress.studentId && progress.exerciseId && (!exerciseIdRef.current || progress.exerciseId === exerciseIdRef.current)) {
          setExerciseProgress(prev => ({ ...prev, [progress.studentId]: progress }));
        }
      });

      ch.on('broadcast', { event: 'exercise_submit' }, ({ payload }) => {
        const submittedResult = payload as ExerciseResult;
        const gradedAnswers = submittedResult.answers.map(answer => {
          const question = questionsRef.current.find(item => item.id === answer.questionId);
          const correct = Boolean(question && answer.answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase());
          return { ...answer, correct };
        });
        const totalPoints = questionsRef.current.reduce((sum, question) => sum + question.points, 0);
        const earnedPoints = gradedAnswers.reduce((sum, answer) => {
          const question = questionsRef.current.find(item => item.id === answer.questionId);
          return sum + (answer.correct ? question?.points ?? 0 : 0);
        }, 0);
        const result: ExerciseResult = {
          ...submittedResult,
          answers: gradedAnswers,
          totalPoints,
          earnedPoints,
          score: totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0,
        };
        setExerciseResults(prev => {
          const withoutStudent = prev.filter(item => item.studentId !== result.studentId);
          return [...withoutStudent, result];
        });
        setExerciseProgress(prev => {
          const current = prev[result.studentId];
          return current ? { ...prev, [result.studentId]: { ...current, submitted: true, updatedAt: Date.now() } } : prev;
        });
      });
    }

  }, [channelRef, channel, localRole, isHost]);

  const handlePresentQuestion = useCallback((index: number) => {
    const question = questions[index];
    if (!question) return;
    setPresentingQuestionIndex(index);
    setAnswerRevealed(false);
    broadcastEvent('question_present', {
      index,
      totalQuestions: questions.length,
      question: {
        id: question.id,
        text: question.text,
        type: question.type,
        options: question.options,
        points: question.points,
      },
    });
  }, [broadcastEvent, questions]);

  const handleToggleAnswer = useCallback(() => {
    const question = questions[presentingQuestionIndex];
    if (!question) return;
    const nextRevealed = !answerRevealed;
    setAnswerRevealed(nextRevealed);
    broadcastEvent('question_answer_reveal', {
      questionId: question.id,
      showCorrectAnswer: nextRevealed,
      correctAnswer: nextRevealed ? question.correctAnswer : '',
      explanation: nextRevealed ? question.explanation : undefined,
    });
  }, [answerRevealed, broadcastEvent, presentingQuestionIndex, questions]);

  const handleCloseQuestionPresenter = useCallback(() => {
    setIsQuestionPresenterOpen(false);
    setAnswerRevealed(false);
    broadcastEvent('question_present_close', {});
  }, [broadcastEvent]);

  const handleStartExercise = useCallback(() => {
    setExerciseActive(localRole === 'student');
    setStudentSubmitted(false);
    setShowPreExModal(false);
    const nextExerciseId = crypto.randomUUID();
    setExerciseId(nextExerciseId);
    setExerciseResults([]);
    setExerciseProgress({});
    // Broadcast to students
    broadcastEvent('exercise_launch', {
      exerciseId: nextExerciseId,
      questions: questions.map(q => ({ id: q.id, text: q.text, options: q.options, type: q.type, points: q.points, correctAnswer: q.correctAnswer, explanation: q.explanation })),
    });
  }, [broadcastEvent, questions, localRole]);

  const handleExerciseSubmit = useCallback((answers: StudentAnswer[]) => {
    setStudentSubmitted(true);
    const totalPoints = questions.reduce((s, q) => s + q.points, 0);
    const earnedPoints = answers.filter(a => a.correct).reduce((s, a) => {
      const q = questions.find(qq => qq.id === a.questionId);
      return s + (q?.points || 0);
    }, 0);
    const result: ExerciseResult = {
      studentId: localPeerId,
      studentName: localName,
      answers,
      score: Math.round((earnedPoints / totalPoints) * 100),
      totalPoints,
      earnedPoints,
      submittedAt: Date.now(),
    };
    setExerciseResults(prev => [...prev, result]);
    // Send to host
    broadcastEvent('exercise_submit', result as unknown as Record<string, unknown>);
  }, [questions, localPeerId, localName, broadcastEvent]);

  // ─── UI state ─────────────────────────────────────────────────────────────

  const [sidePanel, setSidePanel] = useState<SidePanel>('chat');
  const [copiedCode, setCopiedCode] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'devices' | 'exercise' | 'governance'>('exercise');
  const [isRNPHubOpen, setIsRNPHubOpen] = useState(false);
  const [broadcastState, setBroadcastState] = useState<SharedBroadcastState>({
    isSharing: false,
    sharedStudentId: null,
    sharedQuestionId: null,
  });
  const [showEndClassConfirm, setShowEndClassConfirm] = useState(false);
  const [saveAttendance, setSaveAttendance] = useState(true);
  const [saveTestResults, setSaveTestResults] = useState(true);
  const [ending, setEnding] = useState(false);

  const sessionCode = useMemo(() => sessionDetails.code || passedState?.code || classId || 'LC-ROOM', [sessionDetails.code, passedState?.code, classId]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
      : `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Handle forced removal from room
  useEffect(() => {
    const handleRemoved = () => {
      alert('You have been removed from this class by the host.');
      navigate(-1);
    };
    window.addEventListener('live_class_removed', handleRemoved);
    return () => window.removeEventListener('live_class_removed', handleRemoved);
  }, [navigate]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(`${window.location.origin}/student?code=${sessionCode}`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLeave = () => setShowEndClassConfirm(true);

  const handleConfirmEndClass = async () => {
    setEnding(true);
    try {
      if (classId && classId !== 'new' && classId !== 'demo') {
        await updateLiveClassStatus(classId, 'ended');
      }
    } catch (err) {
      console.error('Error ending class:', err);
    } finally {
      setEnding(false);
      setShowEndClassConfirm(false);
      const targetRole = location.pathname.startsWith('/admin')
        ? 'admin'
        : location.pathname.startsWith('/school')
        ? 'school'
        : 'teacher';
      navigate(`/${targetRole}/live-classes`);
    }
  };



  // Participant panel controls
  const handleToggleParticipantMic = (id: string) => {
    // Signal mute to that participant (they respond to it)
    broadcastEvent('mute_participant', { target: id });
  };
  const handleToggleParticipantCamera = (id: string) => {
    broadcastEvent('disable_participant_camera', { target: id });
  };
  const handleLowerHand = (id: string) => {
    broadcastEvent('lower_hand', { target: id });
  };

  const handleUpdateBroadcast = useCallback((state: SharedBroadcastState) => {
    setBroadcastState(state);
    broadcastEvent('exercise_results_broadcast', {
      ...state,
      exerciseResults,
    });
  }, [broadcastEvent, exerciseResults]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 font-sans select-none">

      {/* ── Top bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-slate-900 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={handleLeave} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-all font-medium">
            <ChevronLeft size={18} /> Exit
          </button>
          <div className="w-px h-5 bg-white/10" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-sm truncate max-w-[180px] sm:max-w-md">{sessionDetails.title}</h2>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-extrabold tracking-wide ${sessionStatus === 'live' ? 'bg-red-600' : 'bg-slate-600'}`}>
                <Radio size={10} className={sessionStatus === 'live' ? 'animate-pulse' : ''} /> {sessionStatus.toUpperCase()}
              </span>
            </div>
            {sessionDetails.category && <p className="text-slate-400 text-xs">{sessionDetails.category}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {isHost && (
            <>
              <button
                onClick={() => setIsRNPHubOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-bold transition-colors shadow-md"
              >
                <Sparkles size={15} />
                <span className="hidden sm:inline">Exam Engine & Projector</span>
                <span className="sm:hidden">Exam tools</span>
              </button>

              <button
                onClick={() => { setSettingsTab('exercise'); setIsSettingsOpen(true); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-200 hover:bg-purple-600/50 text-xs font-semibold transition-all shadow-sm"
              >
                <Award size={15} className="text-purple-400" />
                <span>Scores ({exerciseResults.length})</span>
              </button>
            </>
          )}

          {/* Timer */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 text-sm font-mono border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {formatElapsed(elapsed)}
          </div>

          {/* Session code / join link */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 text-sm hover:bg-white/10 transition-all border border-white/5"
            title="Copy student join link"
          >
            {copiedCode ? <><Check size={14} className="text-green-400" /> Copied!</> : <><Copy size={14} /> {sessionCode}</>}
          </button>

          {/* Panel toggles */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/5">
            <PanelToggle
              active={sidePanel === 'chat'}
              onClick={() => setSidePanel(sidePanel === 'chat' ? null : 'chat')}
              icon={<MessageCircle size={16} />}
              badge={messages.length}
            />
            <PanelToggle
              active={sidePanel === 'participants'}
              onClick={() => setSidePanel(sidePanel === 'participants' ? null : 'participants')}
              icon={<Users size={16} />}
              badge={participants.length}
              raisedHands={raisedHandCount}
            />
          </div>
        </div>
      </div>

      {/* ── Main stage ── */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <JitsiClassroom
            classId={classId || 'demo'}
            displayName={localName}
            role="teacher"
          />

          {/* Teacher action bar */}
          {isHost && !exerciseActive && (
            <div className="px-4 py-2.5 bg-slate-900/90 border-t border-white/10 flex items-center justify-center gap-3">
              <button
                onClick={() => { setPresentingQuestionIndex(0); setIsQuestionPresenterOpen(true); handlePresentQuestion(0); }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-all shadow-md"
              >
                <MonitorUp size={16} /> Present Question Bank
              </button>
              <button
                onClick={() => setShowPreExModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-all shadow-md"
              >
                <ClipboardList size={16} /> Launch Live Exercise
              </button>
              <button
                onClick={() => { setSettingsTab('exercise'); setIsSettingsOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md"
              >
                <BarChart3 size={16} /> Inspect Student Answers ({exerciseResults.length})
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 px-4 py-2.5 bg-slate-900/95 border-t border-white/10">
            <span className="text-xs text-slate-400">Jitsi classroom controls are available inside the meeting.</span>
            <button onClick={handleLeave} className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500">Leave Class</button>
          </div>
        </div>

        {/* ── Side panel ── */}
        {sidePanel && (
          <div className="fixed inset-x-3 top-24 bottom-20 z-50 rounded-2xl overflow-hidden border border-slate-200 shadow-2xl md:static md:inset-auto md:w-80 md:rounded-none md:shadow-none md:flex-shrink-0 md:border-l md:border-white/10 bg-slate-900">
            {sidePanel === 'chat' && (
              <ChatPanel
                messages={messages}
                currentUserId={localPeerId}
                onSend={sendMessage}
                onPin={pinMessage}
                onDelete={deleteMessage}
                isHost={isHost}
              />
            )}
            {sidePanel === 'participants' && (
              <ParticipantsPanel
                participants={participants}
                isHost={isHost}
                onToggleParticipantMic={handleToggleParticipantMic}
                onToggleParticipantCamera={handleToggleParticipantCamera}
                onRemoveParticipant={removeParticipant}
                onLowerHand={handleLowerHand}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      <LiveClassSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        localStream={localStream}
        micState={micState}
        cameraState={cameraState}
        onToggleMic={() => {}}
        onToggleCamera={() => {}}
        exerciseResults={exerciseResults}
        exerciseProgress={exerciseProgress}
        questions={questions}
        participants={participants}
        broadcastState={broadcastState}
        onUpdateBroadcast={handleUpdateBroadcast}
        onMuteAll={muteAll}
        onDisableAllCameras={disableAllCameras}
        onLowerAllHands={lowerAllHands}
        initialTab={settingsTab}
      />

      <RNPPhysicalClassPresenterModal
        isOpen={isRNPHubOpen}
        onClose={() => setIsRNPHubOpen(false)}
        exerciseResults={exerciseResults}
        onAddResult={(res) => setExerciseResults(prev => [...prev, res])}
        onBroadcastStudent={(studentId) => {
          handleUpdateBroadcast({ isSharing: true, sharedStudentId: studentId });
          setIsRNPHubOpen(false);
        }}
        onBroadcastResultsList={() => {
          handleUpdateBroadcast({ isSharing: true, sharedStudentId: null, message: 'Class Scoreboard' });
          setIsRNPHubOpen(false);
        }}
      />

      {isQuestionPresenterOpen && (
        <LiveQuestionPresenter
          questions={questions}
          currentIndex={presentingQuestionIndex}
          onChange={handlePresentQuestion}
          onClose={handleCloseQuestionPresenter}
          answerRevealed={answerRevealed}
          onToggleAnswer={handleToggleAnswer}
        />
      )}

      {/* Pre-exercise modal */}
      {showPreExModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPreExModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
                <ClipboardList size={22} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Launch Live Theory Exercise</h3>
                <p className="text-xs text-slate-500">Students will answer questions live without leaving the call</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Questions</span>
                <span className="font-bold text-slate-800">{questions.length} Questions</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Total Score Points</span>
                <span className="font-bold text-slate-800">{questions.reduce((s, q) => s + q.points, 0)} Points</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Active Students</span>
                <span className="font-bold text-purple-600">{participants.filter(p => !p.isHost).length} Connected</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPreExModal(false)} className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleStartExercise} className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-all shadow-md">Broadcast Exercise</button>
            </div>
          </div>
        </div>
      )}

      {/* End class confirmation */}
      {showEndClassConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full text-white space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center font-black">
                <Radio size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">{isHost ? 'End Class for Everyone?' : 'Leave Class?'}</h3>
                <p className="text-xs text-slate-400">{isHost ? 'Class will be closed for all students' : 'You will leave the live session'}</p>
              </div>
            </div>

            {isHost && (
              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">Save Student Attendance & Logs</span>
                  <input type="checkbox" checked={saveAttendance} onChange={e => setSaveAttendance(e.target.checked)} className="w-4 h-4 accent-blue-600 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">Save Live Test Results & Scores</span>
                  <input type="checkbox" checked={saveTestResults} onChange={e => setSaveTestResults(e.target.checked)} className="w-4 h-4 accent-blue-600 rounded" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowEndClassConfirm(false)}
                disabled={ending}
                className="flex-1 py-3 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEndClass}
                disabled={ending}
                className="flex-1 py-3 text-xs font-extrabold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl transition-all shadow-lg shadow-red-600/30"
              >
                {ending ? 'Ending...' : isHost ? 'Confirm & End Class' : 'Leave Class'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student exercise overlay */}
      {localRole === 'student' && exerciseActive && !studentSubmitted && (
        <LiveExercise
          questions={questions}
          exerciseTitle="Rwanda Traffic Law & Signals Test"
          onSubmit={handleExerciseSubmit}
          onClose={() => setExerciseActive(false)}
          hasSubmitted={studentSubmitted}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PanelToggle helper
// ─────────────────────────────────────────────────────────────────────────────

function PanelToggle({ active, onClick, icon, badge, raisedHands }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  badge?: number;
  raisedHands?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-md transition-all ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {raisedHands !== undefined && raisedHands > 0 && (
        <span className="absolute -bottom-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-yellow-500 text-white text-[9px] font-bold flex items-center justify-center">
          ✋{raisedHands}
        </span>
      )}
    </button>
  );
}
