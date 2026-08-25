import { ChevronLeft, ChevronRight, Radio, X } from 'lucide-react';
import type { ExerciseQuestion } from '@/types/live-class';

interface LiveQuestionPresenterProps {
  questions: ExerciseQuestion[];
  currentIndex: number;
  onChange: (index: number) => void;
  onClose: () => void;
}

export default function LiveQuestionPresenter({
  questions,
  currentIndex,
  onChange,
  onClose,
}: LiveQuestionPresenterProps) {
  if (questions.length === 0) return null;
  const question = questions[Math.min(currentIndex, questions.length - 1)];

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden rounded-3xl bg-slate-900 border border-blue-500/40 shadow-2xl text-white">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[11px] font-black uppercase tracking-wide">
              <Radio size={13} className="animate-pulse" /> Live question
            </div>
            <span className="text-xs text-slate-400">Students see the current question on their class screen</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10" aria-label="Close question presenter">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-10">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-300 mb-3">
            Question {currentIndex + 1} of {questions.length} · {question.points} marks
          </div>
          <h2 className="text-2xl sm:text-4xl font-black leading-tight text-white">{question.text}</h2>

          {question.options.length > 0 && (
            <div className="grid gap-3 mt-8">
              {question.options.map((option, index) => (
                <div key={`${question.id}-${index}`} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-base sm:text-lg text-slate-200">
                  <span className="w-8 h-8 shrink-0 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-sm font-black text-blue-200">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/10 bg-slate-950/80">
          <button
            disabled={currentIndex === 0}
            onClick={() => onChange(currentIndex - 1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 disabled:opacity-40 hover:bg-slate-700"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-xs text-slate-400">Read this question aloud, then guide students through the answer.</span>
          <button
            disabled={currentIndex >= questions.length - 1}
            onClick={() => onChange(currentIndex + 1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white disabled:opacity-40 hover:bg-blue-500"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
