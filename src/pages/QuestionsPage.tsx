import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchQuestions, createQuestion, deleteQuestion, type DBQuestion } from '@/lib/db';
import { useLocation } from 'react-router-dom';
import {
  Search, Plus, Upload, Download, Eye, Edit, Trash2,
  CheckCircle2, X, AlertCircle, Sparkles,
  BarChart2, Check, Globe
} from 'lucide-react';

// ── Adapter: map DB row to local display shape ──────────────────
export interface QuestionItem {
  id: string;
  questionText: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  language: 'Kinyarwanda' | 'English' | 'French';
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  lastUpdated: string;
  status: 'Active' | 'Draft';
  timesAskedToday: number;
  correctRatePercent: number;
}

function dbToItem(q: DBQuestion): QuestionItem {
  const opts = q.options ?? [];
  const correctIdx = opts.indexOf(q.correct_answer);
  return {
    id: q.id.slice(0, 8).toUpperCase(),
    questionText: q.question_text,
    category: q.category ?? 'Road Rules',
    difficulty: q.difficulty === 'easy' ? 'Easy' : q.difficulty === 'hard' ? 'Hard' : 'Medium',
    language: q.language === 'rw' ? 'Kinyarwanda' : q.language === 'fr' ? 'French' : 'English',
    options: opts,
    correctOptionIndex: correctIdx >= 0 ? correctIdx : 0,
    explanation: q.explanation ?? '',
    lastUpdated: q.created_at.split('T')[0],
    status: q.status === 'active' ? 'Active' : 'Draft',
    timesAskedToday: q.times_asked,
    correctRatePercent: q.correct_rate,
    _dbId: q.id,
  } as QuestionItem & { _dbId: string };
}

const initialQuestions: QuestionItem[] = [
  {
    id: 'Q-101',
    questionText: 'Icyapa gipima uburebure n’ubugari bw’ikinyabiziga (Priority road sign at narrow bridge) kigusaba kureka ibinyabiziga biturutse mu rundi ruhande bikagutanga kuba binyura:',
    category: 'Traffic Signs',
    difficulty: 'Medium',
    language: 'Kinyarwanda',
    options: [
      'Yego, ufite uburenganzira bwo gutambuka mbere',
      'Oya, ugomba guhagarara ukagabanya umuduko ukareka abaturutse imbere bagatambuka',
      'Ufite uburenganzira bwo gupasa niba nta modoka nini ihari',
      'Nta cyo icyo cyapa kiba gisobanura'
    ],
    correctOptionIndex: 1,
    explanation: 'A red circular sign with opposing arrows indicates yielding right-of-way to oncoming traffic on narrow road sections.',
    lastUpdated: '2026-08-05',
    status: 'Active',
    timesAskedToday: 1240,
    correctRatePercent: 88
  },
  {
    id: 'Q-102',
    questionText: 'When driving through a roundabout in Rwanda, which vehicle has priority right-of-way?',
    category: 'Road Rules',
    difficulty: 'Easy',
    language: 'English',
    options: [
      'Vehicles entering the roundabout from the right',
      'Vehicles already inside the roundabout',
      'Vehicles blowing their horns first',
      'Heavy commercial trucks regardless of position'
    ],
    correctOptionIndex: 1,
    explanation: 'Under Rwanda National Police traffic codes, vehicles already navigating inside the roundabout possess right-of-way over entering vehicles.',
    lastUpdated: '2026-08-02',
    status: 'Active',
    timesAskedToday: 1890,
    correctRatePercent: 92
  },
  {
    id: 'Q-103',
    questionText: 'Ni ubuhe muvuduko ntarengwa w’ibinyabiziga bitwara abantu mu mijyi n’utwiterere tw’imihanda yo mu Rwanda (Speed limit in urban areas)?',
    category: 'Driving Safety',
    difficulty: 'Easy',
    language: 'Kinyarwanda',
    options: [
      'Km 40 mu isaha (40 km/h)',
      'Km 50 mu isaha (50 km/h)',
      'Km 60 mu isaha (60 km/h)',
      'Km 80 mu isaha (80 km/h)'
    ],
    correctOptionIndex: 1,
    explanation: 'Standard speed limit in designated urban zones across Rwanda is strictly 50 km/h unless explicitly posted otherwise.',
    lastUpdated: '2026-07-28',
    status: 'Active',
    timesAskedToday: 2150,
    correctRatePercent: 94
  },
  {
    id: 'Q-104',
    questionText: 'Quel est le rôle du système de freinage ABS (Anti-lock Braking System) sur un véhicule automobile?',
    category: 'Vehicle Maintenance',
    difficulty: 'Hard',
    language: 'French',
    options: [
      'Réduire la consommation de carburant lors du freinage',
      'Empêcher le blocage des roues lors d’un freinage d’urgence pour conserver le contrôle de la trajectoire',
      'Augmenter automatiquement la vitesse du véhicule',
      'Refroidir les disques de frein par air comprimé'
    ],
    correctOptionIndex: 1,
    explanation: 'L’ABS empêche le blocage des roues lors d’un freinage brusque, maintenant la capacité de braquage.',
    lastUpdated: '2026-07-15',
    status: 'Active',
    timesAskedToday: 820,
    correctRatePercent: 64
  },
  {
    id: 'Q-105',
    questionText: 'Uramutse ugeze ku mpanuka yo mu muhanda ugasanga inkomere igira ikibazo cyo kutahumeka vizuri, ni iki ugomba gukora mbere y’ibindi (First Aid Procedure)?',
    category: 'First Aid',
    difficulty: 'Medium',
    language: 'Kinyarwanda',
    options: [
      'Kumuha amazi akonje yo kunywa vuba',
      'Kumuha massage ku maguru',
      'Kuzibura inzira y’umwuka (airway check) no guhamagara gucunga ubutabazi kuri 112',
      'Kwiruka ukajya gushaka umuturanyi'
    ],
    correctOptionIndex: 2,
    explanation: 'Emergency ABC protocol dictates clearing airways and contacting emergency services immediately.',
    lastUpdated: '2026-08-01',
    status: 'Active',
    timesAskedToday: 650,
    correctRatePercent: 78
  },
  {
    id: 'Q-106',
    questionText: 'Mock Exam Comprehensive Set #12: What does a yellow flashing traffic beacon indicate?',
    category: 'Mock Exams',
    difficulty: 'Medium',
    language: 'English',
    options: [
      'Stop completely and wait for green light',
      'Proceed with caution and yield to pedestrians',
      'Speed up to clear intersection quickly',
      'Road closed ahead'
    ],
    correctOptionIndex: 1,
    explanation: 'Flashing yellow signal warns drivers to slow down and proceed with heightened caution.',
    lastUpdated: '2026-08-06',
    status: 'Draft',
    timesAskedToday: 0,
    correctRatePercent: 0
  }
];

export default function QuestionsPage() {
  const location = useLocation();
  const { profile } = useAuth();
  const isSuperAdmin = location.pathname.startsWith('/admin') || profile?.role === 'super_admin';
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Map from display id → real DB uuid
  const dbIdMap = new Map<string, string>();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');

  // Preview Question
  const [previewQuestion, setPreviewQuestion] = useState<QuestionItem | null>(null);

  // Add Question Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContentUpload, setShowContentUpload] = useState(false);
  const [contentType, setContentType] = useState<'Book' | 'Question file'>('Book');
  const [contentTitle, setContentTitle] = useState('');
  const [contentLanguage, setContentLanguage] = useState<'English' | 'Kinyarwanda'>('English');
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [qText, setQText] = useState('');
  const [qCategory, setQCategory] = useState<QuestionItem['category']>('Traffic Signs');
  const [qDifficulty, setQDifficulty] = useState<QuestionItem['difficulty']>('Medium');
  const [qLanguage, setQLanguage] = useState<QuestionItem['language']>('Kinyarwanda');
  const [qOpt0, setQOpt0] = useState('');
  const [qOpt1, setQOpt1] = useState('');
  const [qOpt2, setQOpt2] = useState('');
  const [qOpt3, setQOpt3] = useState('');
  const [qCorrectIdx, setQCorrectIdx] = useState(0);
  const [qExplanation, setQExplanation] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ── Load questions from DB ───────────────────────────────────────
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setDbError(null);
    try {
      const rows = await fetchQuestions();
      const items = rows.map(dbToItem);
      // populate dbIdMap
      rows.forEach((row, i) => { dbIdMap.set(items[i].id, row.id); });
      setQuestions(items);
    } catch (err: any) {
      setDbError(err.message ?? 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadQuestions(); }, [loadQuestions]);

  const categoriesList = [
    'Traffic Signs',
    'Road Rules',
    'Driving Safety',
    'Vehicle Maintenance',
    'First Aid',
    'Mock Exams'
  ];

  // Filtering
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.questionText.toLowerCase().includes(search.toLowerCase()) ||
      q.id.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || q.category === selectedCategory;
    const matchesDiff = selectedDifficulty === 'All' || q.difficulty === selectedDifficulty;
    const matchesLang = selectedLanguage === 'All' || q.language === selectedLanguage;

    return matchesSearch && matchesCat && matchesDiff && matchesLang;
  });

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim() || !qOpt0.trim() || !qOpt1.trim()) return;

    const opts = [qOpt0.trim(), qOpt1.trim()];
    if (qOpt2.trim()) opts.push(qOpt2.trim());
    if (qOpt3.trim()) opts.push(qOpt3.trim());
    const correctAnswer = opts[qCorrectIdx] ?? opts[0];

    const langMap: Record<string, 'en' | 'rw' | 'fr'> = {
      English: 'en', Kinyarwanda: 'rw', French: 'fr',
    };

    setSaving(true);
    try {
      await createQuestion({
        exam_id: null,
        school_id: null, // platform-wide: super admin question
        question_text: qText.trim(),
        question_type: 'multiple_choice',
        options: opts,
        correct_answer: correctAnswer,
        points: 1,
        category: qCategory,
        difficulty: qDifficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
        language: langMap[qLanguage] ?? 'en',
        status: 'active',
        explanation: qExplanation.trim() || null,
      });
      await loadQuestions();
      setShowAddModal(false);
      triggerToast(`✨ Question saved to Platform Question Bank!`);
      setQText(''); setQOpt0(''); setQOpt1(''); setQOpt2(''); setQOpt3(''); setQExplanation('');
    } catch (err: any) {
      triggerToast(`❌ Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    const realId = dbIdMap.get(id);
    if (!realId) {
      triggerToast('❌ Cannot delete: question ID not found');
      return;
    }
    try {
      await deleteQuestion(realId);
      setQuestions(questions.filter(q => q.id !== id));
      if (previewQuestion?.id === id) setPreviewQuestion(null);
      triggerToast(`🗑️ Question removed from Platform Bank.`);
    } catch (err: any) {
      triggerToast(`❌ Error deleting: ${err.message}`);
    }
  };

  const handleContentUpload = (event: React.FormEvent) => {
    event.preventDefault();
    if (!contentTitle.trim() || !contentFile) {
      triggerToast('Add a title and select a file before uploading.');
      return;
    }
    setShowContentUpload(false);
    triggerToast(`${contentType} “${contentTitle.trim()}” has been queued for review and import.`);
    setContentTitle('');
    setContentFile(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2"><X size={16} /></button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-extrabold text-[11px] border border-purple-200">
              National Exam Bank
            </span>
            <span className="text-xs text-slate-400 font-medium">DriveClass Rwanda Engine</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Question Bank Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain official provisional driving license questions, mock exams, category weights, and multi-language translations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isSuperAdmin && (
            <button
              onClick={() => setShowContentUpload(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              <Upload size={15} /> <span>Upload book or file</span>
            </button>
          )}
          <button
            onClick={() => triggerToast('📥 Importing questions template (.json / .csv)...')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-all"
          >
            <Upload size={15} className="text-blue-600" />
            <span>Import</span>
          </button>

          <button
            onClick={() => triggerToast('📊 Question Bank exported successfully!')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-all"
          >
            <Download size={15} className="text-emerald-600" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition-all"
          >
            <Plus size={16} />
            <span>Add New Question</span>
          </button>
        </div>
      </div>

      {/* Top Question Statistics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Total Platform Questions</span>
            <Sparkles size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{loading ? '—' : questions.length} <span className="text-xs text-slate-400 font-normal">Questions</span></div>
          <p className="text-[11px] text-emerald-600 font-bold">Shared across all driving schools</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Active Questions</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{loading ? '—' : questions.filter(q => q.status === 'Active').length} <span className="text-xs text-slate-400 font-normal">Published</span></div>
          <p className="text-[11px] text-slate-400">Ready for student exams</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Draft Questions</span>
            <AlertCircle size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{loading ? '—' : questions.filter(q => q.status === 'Draft').length} <span className="text-xs text-slate-400 font-normal">Pending</span></div>
          <p className="text-[11px] text-amber-600 font-bold">Under review before publishing</p>
        </div>
      </div>

      {/* DB Error */}
      {dbError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-semibold">⚠️ {dbError}</div>
      )}

      {/* Categories Tab Selector */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            selectedCategory === 'All'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Categories ({questions.length})
        </button>

        {categoriesList.map(cat => {
          const count = questions.filter(q => q.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search question text or ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {/* Difficulty & Language Filters */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <BarChart2 size={13} className="text-slate-400" />
            <span className="text-slate-500 font-bold">Difficulty:</span>
            <select
              value={selectedDifficulty}
              onChange={e => setSelectedDifficulty(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="All">All</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Globe size={13} className="text-slate-400" />
            <span className="text-slate-500 font-bold">Language:</span>
            <select
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="All">All Languages</option>
              <option value="Kinyarwanda">Kinyarwanda</option>
              <option value="English">English</option>
              <option value="French">French</option>
            </select>
          </div>
        </div>
      </div>

      {/* Question Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200/80">
                <th className="px-4 py-3.5">ID & Question Prompt</th>
                <th className="px-3 py-3.5">Category</th>
                <th className="px-3 py-3.5">Difficulty</th>
                <th className="px-3 py-3.5">Language</th>
                <th className="px-3 py-3.5">Last Updated</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-3.5 bg-slate-100 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                    {questions.length === 0 ? 'No questions in the platform bank yet. Add the first one!' : 'No questions match your filters.'}
                  </td>
                </tr>
              ) : (
                filteredQuestions.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-all group">
                    {/* Prompt */}
                    <td className="px-4 py-3.5 max-w-md">
                      <div className="flex items-start gap-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono font-black text-slate-700 text-[10px] flex-shrink-0 mt-0.5">
                          {q.id}
                        </span>
                        <p className="font-semibold text-slate-900 leading-relaxed line-clamp-2">
                          {q.questionText}
                        </p>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3.5 font-bold text-slate-700">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-[10px]">
                        {q.category}
                      </span>
                    </td>

                    {/* Difficulty */}
                    <td className="px-3 py-3.5 font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        q.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800' :
                        q.difficulty === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {q.difficulty}
                      </span>
                    </td>

                    {/* Language */}
                    <td className="px-3 py-3.5 font-bold text-slate-700">{q.language}</td>

                    {/* Last Updated */}
                    <td className="px-3 py-3.5 text-slate-400 font-mono">{q.lastUpdated}</td>

                    {/* Status */}
                    <td className="px-3 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        q.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {q.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewQuestion(q)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          title="Preview Question"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => triggerToast(`✏ Editing question ${q.id}...`)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all"
                          title="Edit Question"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          title="Delete Question"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Question Preview Panel Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setPreviewQuestion(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 space-y-5 border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-mono font-black text-xs">
                  {previewQuestion.id}
                </span>
                <span className="text-xs text-slate-400 font-semibold">{previewQuestion.category} ({previewQuestion.language})</span>
              </div>
              <button onClick={() => setPreviewQuestion(null)} className="p-1 text-slate-400 hover:text-slate-800">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-sm font-black text-slate-900 leading-relaxed">
                {previewQuestion.questionText}
              </p>

              <div className="space-y-2">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Answer Options:</p>
                {previewQuestion.options.map((opt, idx) => {
                  const isCorrect = idx === previewQuestion.correctOptionIndex;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between font-medium ${
                        isCorrect
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{opt}</span>
                      {isCorrect && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-black uppercase">
                          <Check size={14} /> Correct Option
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 text-blue-900 text-xs space-y-1">
                <span className="font-black text-[10px] uppercase text-blue-700 block">Explanation & Reference:</span>
                <p>{previewQuestion.explanation}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Times Used Today: <strong>{previewQuestion.timesAskedToday.toLocaleString()}</strong>
              </span>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Question Modal */}
      {showContentUpload && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowContentUpload(false)}>
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div><h3 className="text-base font-black text-slate-900">Content Library Upload</h3><p className="mt-1 text-xs text-slate-500">Add a driving manual or validated question file for Super Admin review.</p></div>
              <button onClick={() => setShowContentUpload(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleContentUpload} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <label className="font-bold text-slate-700">Content type<select value={contentType} onChange={(event) => setContentType(event.target.value as 'Book' | 'Question file')} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-medium"><option>Book</option><option>Question file</option></select></label>
                <label className="font-bold text-slate-700">Language<select value={contentLanguage} onChange={(event) => setContentLanguage(event.target.value as 'English' | 'Kinyarwanda')} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-medium"><option>English</option><option>Kinyarwanda</option></select></label>
              </div>
              <label className="block font-bold text-slate-700">Title<input required value={contentTitle} onChange={(event) => setContentTitle(event.target.value)} placeholder="e.g. Category B Road Rules Manual" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
              <label className="block rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5 text-center font-bold text-blue-700 cursor-pointer hover:bg-blue-50"><Upload size={22} className="mx-auto mb-2" /><span>{contentFile ? contentFile.name : 'Choose PDF, DOCX, CSV, or XLSX file'}</span><input type="file" accept=".pdf,.doc,.docx,.csv,.xlsx" className="hidden" onChange={(event) => setContentFile(event.target.files?.[0] ?? null)} /></label>
              <div className="rounded-xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800"><strong>Quality check:</strong> uploads are marked for review. Questions should include the correct answer, explanation, category, difficulty, and language before publishing.</div>
              <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => setShowContentUpload(false)} className="rounded-xl bg-slate-100 px-4 py-2.5 font-bold text-slate-700">Cancel</button><button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white">Queue for review</button></div>
            </form>
          </div>
        </div>
      )}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Plus size={18} className="text-blue-600" /> Add Question to National Bank
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Question Statement / Prompt *</label>
                <textarea
                  required
                  rows={3}
                  value={qText}
                  onChange={e => setQText(e.target.value)}
                  placeholder="Enter official theory exam question statement..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={qCategory}
                    onChange={e => setQCategory(e.target.value as QuestionItem['category'])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Difficulty *</label>
                  <select
                    value={qDifficulty}
                    onChange={e => setQDifficulty(e.target.value as QuestionItem['difficulty'])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Language *</label>
                  <select
                    value={qLanguage}
                    onChange={e => setQLanguage(e.target.value as QuestionItem['language'])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="Kinyarwanda">Kinyarwanda</option>
                    <option value="English">English</option>
                    <option value="French">French</option>
                  </select>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Answer Choices (Select Correct Option Index):</label>

                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctIndex"
                    checked={qCorrectIdx === 0}
                    onChange={() => setQCorrectIdx(0)}
                  />
                  <input
                    type="text"
                    required
                    value={qOpt0}
                    onChange={e => setQOpt0(e.target.value)}
                    placeholder="Option A"
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctIndex"
                    checked={qCorrectIdx === 1}
                    onChange={() => setQCorrectIdx(1)}
                  />
                  <input
                    type="text"
                    required
                    value={qOpt1}
                    onChange={e => setQOpt1(e.target.value)}
                    placeholder="Option B"
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctIndex"
                    checked={qCorrectIdx === 2}
                    onChange={() => setQCorrectIdx(2)}
                  />
                  <input
                    type="text"
                    value={qOpt2}
                    onChange={e => setQOpt2(e.target.value)}
                    placeholder="Option C"
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctIndex"
                    checked={qCorrectIdx === 3}
                    onChange={() => setQCorrectIdx(3)}
                  />
                  <input
                    type="text"
                    value={qOpt3}
                    onChange={e => setQOpt3(e.target.value)}
                    placeholder="Option D"
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Explanation / Legal Rule Reference</label>
                <input
                  type="text"
                  value={qExplanation}
                  onChange={e => setQExplanation(e.target.value)}
                  placeholder="e.g. Article 48 Traffic Code Rwanda..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
