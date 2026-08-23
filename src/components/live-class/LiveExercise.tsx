import { useState, useEffect, useRef } from 'react';
import {
  ClipboardList, Clock, CheckCircle, X, ChevronLeft, ChevronRight,
  AlertCircle, Send
} from 'lucide-react';
import type { ExerciseQuestion, StudentAnswer } from '@/types/live-class';

interface LiveExerciseProps {
  questions: ExerciseQuestion[];
  exerciseTitle: string;
  onSubmit: (answers: StudentAnswer[]) => void;
  onClose: () => void;
  hasSubmitted: boolean;
}

export default function LiveExercise({
  questions, exerciseTitle, onSubmit, onClose, hasSubmitted
}: LiveExerciseProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(300);
  const [showResults, setShowResults] = useState(false);

  const handleSubmit = () => {
    const studentAnswers: StudentAnswer[] = questions.map(q => ({
      questionId: q.id,
      answer: answers[q.id] || '',
      correct: answers[q.id] === q.correctAnswer,
    }));
    onSubmit(studentAnswers);
    setShowResults(true);
  };

  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;

  useEffect(() => {
    if (hasSubmitted || showResults) return;
    if (timeLeft <= 0) {
      submitRef.current();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, hasSubmitted, showResults]);

  const question = questions[currentQ];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  const handleSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (hasSubmitted || showResults) {
    const correctCount = questions.filter(q => answers[q.id] === q.correctAnswer).length;
    return (
      <div className="absolute inset-0 z-40 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">Exercise Submitted!</h3>
            <p className="text-sm text-slate-500 mb-4">Your answers have been sent to the teacher</p>
            <div className="w-full bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Correct Answers</span>
                <span className="text-sm font-bold text-green-600">{correctCount} / {questions.length}</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${(correctCount / questions.length) * 100}%` }}
                />
              </div>
              <div className="text-center mt-2 text-xs text-slate-400">
                Wait for the teacher to review the results on screen
              </div>
            </div>
            <button
              onClick={onClose}
              className="mt-5 px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <ClipboardList size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">{exerciseTitle}</h3>
              <p className="text-xs text-slate-400">Question {currentQ + 1} of {questions.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
              timeLeft < 60 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
            }`}>
              <Clock size={13} />
              {formatTime(timeLeft)}
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  i === currentQ ? 'bg-blue-500' : answers[q.id] ? 'bg-green-400' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex items-start gap-2 mb-4">
            <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {currentQ + 1}
            </span>
            <p className="text-base font-medium text-slate-800 leading-relaxed">{question.text}</p>
          </div>

          {/* Options */}
          <div className="space-y-2.5 ml-9">
            {question.options.map((option, i) => {
              const isSelected = answers[question.id] === option;
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(question.id, option)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-red-600 bg-red-600 text-white shadow-md shadow-red-500/30'
                      : 'border-slate-200 hover:border-red-300 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'border-white bg-white text-red-600' : 'border-slate-300'
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-red-600" />}
                    </div>
                    <span className={`text-sm ${isSelected ? 'text-white font-bold' : 'text-slate-800'}`}>
                      {option}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-red-700 text-[10px] font-extrabold uppercase">
                      Selected (RED)
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {question.type === 'true_false' && question.options.length === 0 && (
            <div className="flex items-center gap-2 ml-9 text-amber-600 text-sm">
              <AlertCircle size={16} />
              <span>Answer True or False</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
            disabled={currentQ === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <div className="text-xs text-slate-400">
            {answeredCount} / {questions.length} answered
          </div>

          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ(q => q + 1)}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-all"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send size={15} /> Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
