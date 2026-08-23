import React, { useState, useEffect, useRef } from 'react';
import {
  X, Mic, Video, Settings, Award, Users, CheckCircle, XCircle,
  Volume2, ShieldAlert, Share2, ChevronRight, Search,
  RefreshCw, Radio
} from 'lucide-react';
import type {
  ExerciseResult, ExerciseQuestion, Participant, SharedBroadcastState
} from '@/types/live-class';

interface LiveClassSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  localStream: MediaStream | null;
  micState: 'on' | 'off';
  cameraState: 'on' | 'off';
  onToggleMic: () => void;
  onToggleCamera: () => void;
  exerciseResults: ExerciseResult[];
  questions: ExerciseQuestion[];
  participants: Participant[];
  broadcastState: SharedBroadcastState;
  onUpdateBroadcast: (state: SharedBroadcastState) => void;
  onMuteAll: () => void;
  onDisableAllCameras: () => void;
  onLowerAllHands: () => void;
  initialTab?: 'devices' | 'exercise' | 'governance';
}

export default function LiveClassSettingsModal({
  isOpen,
  onClose,
  localStream,
  micState,
  cameraState,
  onToggleMic,
  onToggleCamera,
  exerciseResults,
  questions,
  participants,
  broadcastState,
  onUpdateBroadcast,
  onMuteAll,
  onDisableAllCameras,
  onLowerAllHands,
  initialTab = 'exercise'
}: LiveClassSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'devices' | 'exercise' | 'governance'>(initialTab);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScore, setFilterScore] = useState<'all' | 'pass' | 'fail'>('all');

  // Mic level testing state
  const [micLevel, setMicLevel] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Set initial tab if changed
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Mic level analyzer using Web Audio API
  useEffect(() => {
    if (!isOpen || micState !== 'on' || !localStream) {
      setMicLevel(0);
      return;
    }

    try {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(localStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch {
      // Fallback pulse for simulated volume
      const interval = setInterval(() => {
        setMicLevel(Math.floor(Math.random() * 45) + 30);
      }, 200);
      return () => clearInterval(interval);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [isOpen, micState, localStream]);

  if (!isOpen) return null;

  const students = participants.filter(p => p.role === 'student');

  // Filtered results
  const filteredResults = exerciseResults.filter(r => {
    const matchesSearch = r.studentName.toLowerCase().includes(searchQuery.toLowerCase());
    const pct = (r.earnedPoints / r.totalPoints) * 100;
    if (filterScore === 'pass') return matchesSearch && pct >= 60;
    if (filterScore === 'fail') return matchesSearch && pct < 60;
    return matchesSearch;
  });

  const selectedStudent = exerciseResults.find(r => r.studentId === selectedStudentId);

  // Calculate summary metrics
  const totalSubmissions = exerciseResults.length;
  const avgScore = totalSubmissions > 0
    ? Math.round(exerciseResults.reduce((acc, r) => acc + (r.earnedPoints / r.totalPoints) * 100, 0) / totalSubmissions)
    : 0;

  const passCount = exerciseResults.filter(r => (r.earnedPoints / r.totalPoints) * 100 >= 60).length;

  const handleToggleBroadcast = (studentId?: string) => {
    if (broadcastState.isSharing && broadcastState.sharedStudentId === (studentId || null)) {
      onUpdateBroadcast({ isSharing: false, sharedStudentId: null, sharedQuestionId: null });
    } else {
      onUpdateBroadcast({
        isSharing: true,
        sharedStudentId: studentId || null,
        message: studentId
          ? `Highlighting answer review for ${exerciseResults.find(r => r.studentId === studentId)?.studentName}`
          : `Live Class Exercise Results & Answer Key shared by teacher!`
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] max-h-[720px] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-base text-white">Classroom Settings & Live Analytics</h2>
              <p className="text-xs text-slate-400">Manage media devices, review student exercise answers, and control live class broadcast</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 py-2">
            <button
              onClick={() => setActiveTab('exercise')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'exercise'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Award size={16} />
              <span>Exercise Scores & Student Answers</span>
              {exerciseResults.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] ${activeTab === 'exercise' ? 'bg-purple-800 text-white' : 'bg-purple-100 text-purple-700 font-bold'}`}>
                  {exerciseResults.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('devices')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'devices'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Mic size={16} />
              <span>Camera & Microphone Test</span>
            </button>

            <button
              onClick={() => setActiveTab('governance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'governance'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Users size={16} />
              <span>Class Controls</span>
            </button>
          </div>

          {/* Broadcast Status Pill */}
          {broadcastState.isSharing && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold animate-pulse">
              <Radio size={12} />
              <span>Broadcasting Results to Students</span>
            </div>
          )}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-hidden bg-slate-50/50 p-6">
          {/* TAB 1: EXERCISE SCORES & STUDENT ANSWERS */}
          {activeTab === 'exercise' && (
            <div className="h-full flex flex-col min-h-0">
              {exerciseResults.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-dashed border-slate-300">
                  <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                    <Award size={32} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1">No Exercise Submitted Yet</h3>
                  <p className="text-slate-500 text-sm max-w-md mb-6">
                    Launch a live exercise from the class room bar. Once students complete the questions, their scores, time spent, and detailed correct/incorrect answers will appear here in real-time.
                  </p>
                </div>
              ) : (
                <div className="h-full flex flex-col lg:flex-row gap-6 min-h-0">
                  {/* Left Column: Summary & Student List */}
                  <div className={`flex flex-col min-h-0 ${selectedStudent ? 'w-full lg:w-1/2' : 'w-full'}`}>
                    
                    {/* Top KPI Cards */}
                    <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs text-slate-500 font-medium">Class Avg Score</div>
                        <div className="text-xl font-bold text-purple-600 mt-1">{avgScore}%</div>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs text-slate-500 font-medium">Passed (≥60%)</div>
                        <div className="text-xl font-bold text-green-600 mt-1">{passCount} / {totalSubmissions}</div>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs text-slate-500 font-medium">Submissions</div>
                        <div className="text-xl font-bold text-slate-800 mt-1">{totalSubmissions} / {students.length}</div>
                      </div>
                    </div>

                    {/* Controls & Share Button Bar */}
                    <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
                      <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search student..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                        <button
                          onClick={() => setFilterScore('all')}
                          className={`px-2 py-1 text-[11px] font-medium rounded-md ${filterScore === 'all' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setFilterScore('pass')}
                          className={`px-2 py-1 text-[11px] font-medium rounded-md ${filterScore === 'pass' ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                          Passed
                        </button>
                        <button
                          onClick={() => setFilterScore('fail')}
                          className={`px-2 py-1 text-[11px] font-medium rounded-md ${filterScore === 'fail' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                          Needs Review
                        </button>
                      </div>

                      {/* Main Broadcast Toggle Button */}
                      <button
                        onClick={() => handleToggleBroadcast()}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                          broadcastState.isSharing && !broadcastState.sharedStudentId
                            ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90'
                        }`}
                      >
                        <Share2 size={13} />
                        <span>{broadcastState.isSharing && !broadcastState.sharedStudentId ? 'Stop Live Share' : 'Share Scores with Class'}</span>
                      </button>
                    </div>

                    {/* Student Score Cards List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                      {filteredResults.map((res) => {
                        const pct = Math.round((res.earnedPoints / res.totalPoints) * 100);
                        const isSelected = selectedStudentId === res.studentId;
                        const isBroadcastingThis = broadcastState.isSharing && broadcastState.sharedStudentId === res.studentId;

                        return (
                          <div
                            key={res.studentId}
                            onClick={() => setSelectedStudentId(res.studentId)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-400/20'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                  pct >= 70 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {res.studentName.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-semibold text-xs text-slate-800 flex items-center gap-2">
                                    <span>{res.studentName}</span>
                                    {isBroadcastingThis && (
                                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold animate-pulse">
                                        Live Shared
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span>Submitted {new Date(res.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span>•</span>
                                    <span className="text-green-600 font-medium">{res.answers.filter(a => a.correct).length} Correct</span>
                                    <span>•</span>
                                    <span className="text-red-500 font-medium">{res.answers.filter(a => !a.correct).length} Incorrect</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className={`font-bold text-sm ${pct >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                                    {pct}%
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {res.earnedPoints}/{res.totalPoints} pts
                                  </div>
                                </div>

                                <ChevronRight size={16} className={`text-slate-400 transition-transform ${isSelected ? 'rotate-90 text-purple-600' : ''}`} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Detailed Student Answer Inspector */}
                  {selectedStudent && (
                    <div className="w-full lg:w-1/2 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
                      
                      {/* Inspector Header */}
                      <div className="p-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
                        <div>
                          <div className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Detailed Answer Review</div>
                          <h4 className="text-base font-bold text-white">{selectedStudent.studentName}</h4>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Share specific student to class */}
                          <button
                            onClick={() => handleToggleBroadcast(selectedStudent.studentId)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              broadcastState.isSharing && broadcastState.sharedStudentId === selectedStudent.studentId
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'bg-purple-600 text-white hover:bg-purple-700'
                            }`}
                          >
                            <Share2 size={13} />
                            <span>
                              {broadcastState.isSharing && broadcastState.sharedStudentId === selectedStudent.studentId
                                ? 'Stop Class Highlight'
                                : 'Show on Live Class'}
                            </span>
                          </button>

                          <button
                            onClick={() => setSelectedStudentId(null)}
                            className="p-1 text-slate-400 hover:text-white rounded-lg"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Student Score Overview Bar */}
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs flex-shrink-0">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-600 font-medium">Final Score:</span>
                          <span className={`font-bold text-sm ${
                            (selectedStudent.earnedPoints / selectedStudent.totalPoints) * 100 >= 60 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {Math.round((selectedStudent.earnedPoints / selectedStudent.totalPoints) * 100)}% ({selectedStudent.earnedPoints}/{selectedStudent.totalPoints} pts)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-slate-500">
                          <span className="flex items-center gap-1 text-green-600 font-semibold">
                            <CheckCircle size={13} /> {selectedStudent.answers.filter(a => a.correct).length} Correct
                          </span>
                          <span className="flex items-center gap-1 text-red-500 font-semibold">
                            <XCircle size={13} /> {selectedStudent.answers.filter(a => !a.correct).length} Incorrect
                          </span>
                        </div>
                      </div>

                      {/* Question Breakdown List */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                        {questions.map((q, idx) => {
                          const studentAns = selectedStudent.answers.find(a => a.questionId === q.id);
                          const isCorrect = studentAns?.correct || false;

                          return (
                            <div
                              key={q.id}
                              className={`p-3.5 rounded-xl border transition-all ${
                                isCorrect
                                  ? 'bg-green-50/40 border-green-200'
                                  : 'bg-red-50/50 border-red-200 shadow-sm'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 mb-2">
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${
                                  isCorrect ? 'bg-green-600' : 'bg-red-600'
                                }`}>
                                  {idx + 1}
                                </span>
                                <div className="flex-1">
                                  <p className="text-xs font-semibold text-slate-800 leading-snug">{q.text}</p>
                                  <span className="text-[10px] text-slate-400">Points: {q.points}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                  isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                              </div>

                              {/* Selected answer vs Correct Answer */}
                              <div className="ml-7 space-y-1.5 text-xs">
                                <div className={`p-2 rounded-lg flex items-center justify-between ${
                                  isCorrect ? 'bg-green-100/70 text-green-800 font-medium' : 'bg-red-100/80 text-red-900 font-bold'
                                }`}>
                                  <span>Student Answer: <strong>{studentAns?.answer || 'No answer submitted'}</strong></span>
                                  {isCorrect ? <CheckCircle size={14} className="text-green-600" /> : <XCircle size={14} className="text-red-600" />}
                                </div>

                                {!isCorrect && (
                                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                                    <span className="font-semibold text-emerald-800">Correct Answer: </span>
                                    <span>{q.correctAnswer}</span>
                                  </div>
                                )}

                                {q.explanation && (
                                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600 text-[11px] italic">
                                    💡 <strong>Explanation:</strong> {q.explanation}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CAMERA & MICROPHONE TEST */}
          {activeTab === 'devices' && (
            <div className="h-full flex flex-col md:flex-row gap-6 min-h-0">
              {/* Camera Preview Box */}
              <div className="w-full md:w-1/2 flex flex-col bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800 relative">
                <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-slate-950/80 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm">
                  <Video size={14} className="text-blue-400" />
                  <span>Camera Live Preview</span>
                </div>

                <div className="flex-1 flex items-center justify-center bg-slate-950 relative">
                  {cameraState === 'on' && localStream ? (
                    <video
                      ref={(node) => {
                        if (node && localStream) node.srcObject = localStream;
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                      <Video size={48} className="mb-2 text-slate-600" />
                      <p className="text-xs font-medium">Camera is currently turned off</p>
                      <button
                        onClick={onToggleCamera}
                        className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Turn On Camera
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">Camera Status: {cameraState === 'on' ? 'Active' : 'Disabled'}</span>
                  <button
                    onClick={onToggleCamera}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all ${
                      cameraState === 'on' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {cameraState === 'on' ? 'Stop Camera' : 'Start Camera'}
                  </button>
                </div>
              </div>

              {/* Mic & Audio Test */}
              <div className="w-full md:w-1/2 flex flex-col space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Mic size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Microphone Input & Level Meter</h4>
                        <p className="text-xs text-slate-500">Speak into your mic to test audio input levels</p>
                      </div>
                    </div>
                    <button
                      onClick={onToggleMic}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all ${
                        micState === 'on' ? 'bg-slate-700 hover:bg-slate-800' : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {micState === 'on' ? 'Mute Mic' : 'Unmute Mic'}
                    </button>
                  </div>

                  {/* Meter Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
                      <span>Audio Volume Indicator</span>
                      <span className="font-bold text-blue-600">{micState === 'on' ? `${micLevel}%` : 'Muted'}</span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-75 ${
                          micLevel > 75 ? 'bg-red-500' : micLevel > 40 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: micState === 'on' ? `${micLevel}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Volume2 size={16} className="text-slate-500" />
                    Input Device Selection
                  </h4>
                  
                  <div className="space-y-2">
                    <label className="block text-xs text-slate-500 font-medium">Selected Camera</label>
                    <select className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none">
                      <option>Integrated HD Webcam (Default)</option>
                      <option>USB External Camera</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-slate-500 font-medium">Selected Microphone</label>
                    <select className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none">
                      <option>Default Built-in Microphone</option>
                      <option>Headset Microphone (USB Audio)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLASSROOM GOVERNANCE */}
          {activeTab === 'governance' && (
            <div className="h-full space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <ShieldAlert size={20} className="text-purple-600" />
                  Host Classroom Controls
                </h3>
                <p className="text-slate-500 text-xs">Quick bulk actions for host and teacher moderation during live class sessions.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <button
                    onClick={onMuteAll}
                    className="p-4 bg-red-50 border border-red-200 hover:bg-red-100 rounded-2xl text-left transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center mb-3">
                      <Mic size={20} />
                    </div>
                    <div className="font-bold text-red-900 text-sm">Mute All Students</div>
                    <div className="text-xs text-red-700/80 mt-1">Turns off microphones for all connected students immediately</div>
                  </button>

                  <button
                    onClick={onDisableAllCameras}
                    className="p-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-2xl text-left transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center mb-3">
                      <Video size={20} />
                    </div>
                    <div className="font-bold text-slate-800 text-sm">Disable All Cameras</div>
                    <div className="text-xs text-slate-500 mt-1">Disables student video feeds to save classroom bandwidth</div>
                  </button>

                  <button
                    onClick={onLowerAllHands}
                    className="p-4 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-2xl text-left transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-3">
                      <RefreshCw size={20} />
                    </div>
                    <div className="font-bold text-amber-900 text-sm">Lower All Hands</div>
                    <div className="text-xs text-amber-700/80 mt-1">Clears raised hand indicators for all participants</div>
                  </button>
                </div>
              </div>

              {/* Roster overview */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">Connected Class Roster ({students.length} Students)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {students.map((s) => (
                    <div key={s.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                      <span className="font-semibold text-slate-700 truncate">{s.name}</span>
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${s.mic === 'on' ? 'bg-green-500' : 'bg-red-400'}`} />
                        <span className={`w-2 h-2 rounded-full ${s.camera === 'on' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500">
            Live Class System • Session Active
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
}
