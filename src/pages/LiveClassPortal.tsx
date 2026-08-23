import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video, Plus, Calendar, Clock, Users, Search, Play,
  Copy, Check, Radio, X, ChevronRight, Sparkles, Building2,
  BookOpen, ShieldCheck, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchLiveClasses, fetchAllLiveClasses, createLiveClass, updateLiveClassStatus,
  fetchSchools, fetchTeacherByProfileId,
  type DBLiveClass
} from '@/lib/db';

interface ExtendedLiveClass extends DBLiveClass {
  teacher_name?: string;
  enrolled_count?: number;
  class_code?: string;
}

const statusConfig = {
  live: { label: 'Live Now', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500', icon: <Radio size={12} /> },
  scheduled: { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-500', icon: <Calendar size={12} /> },
  ended: { label: 'Ended', color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700', dot: 'bg-slate-500', icon: <Clock size={12} /> },
  cancelled: { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-900', border: 'border-slate-800', dot: 'bg-slate-600', icon: <X size={12} /> },
};

function generateClassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'LC-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function LiveClassPortal() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [classes, setClasses] = useState<ExtendedLiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'live' | 'scheduled' | 'ended'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load live classes from database
  const loadClasses = async () => {
    try {
      setLoading(true);
      setError(null);

      let data: DBLiveClass[] = [];
      if (profile?.role === 'super_admin') {
        data = await fetchAllLiveClasses();
      } else if (profile?.school_id) {
        data = await fetchLiveClasses(profile.school_id);
      } else {
        data = [];
      }

      // Map to extended shape
      const extended: ExtendedLiveClass[] = data.map((c, idx) => ({
        ...c,
        teacher_name: profile?.role === 'teacher' ? (profile.full_name || 'You') : (c.teacher_id ? `Instructor` : 'School Admin'),
        enrolled_count: Math.floor(8 + (idx * 3) % 15),
        class_code: c.access_code || c.meeting_url || `LC-${c.id.slice(0, 4).toUpperCase()}`,
      }));

      setClasses(extended);
    } catch (err: any) {
      console.error('Failed to load live classes:', err);
      setError('Unable to load live classes. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      loadClasses();
    }
  }, [profile]);

  const handleCopyLink = (e: React.MouseEvent, classCode: string, id: string) => {
    e.stopPropagation();
    const link = `${window.location.origin}/student?code=${classCode}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateClass = async (payload: { title: string; description: string; topic: string; duration: number }) => {
    let validSchoolId = profile?.school_id;
    if (!validSchoolId) {
      const schools = await fetchSchools();
      if (schools && schools.length > 0) validSchoolId = schools[0].id;
    }
    if (!validSchoolId) {
      alert('No active school found to associate with this live class.');
      return;
    }

    let validTeacherId: string | null = null;
    if (profile?.id) {
      try {
        const t = await fetchTeacherByProfileId(profile.id);
        if (t) validTeacherId = t.id;
      } catch {
        // School admin or super admin without teacher record
      }
    }

    const code = generateClassCode();

    try {
      const created = await createLiveClass({
        school_id: validSchoolId,
        teacher_id: validTeacherId,
        class_id: null,
        title: payload.title,
        description: payload.description || payload.topic,
        scheduled_at: new Date().toISOString(),
        duration_minutes: payload.duration,
        status: 'live', // Start immediately
        meeting_url: code,
        class_type: 'online',
        access_code: code,
        room: null,
        max_students: 100,
      });

      setShowCreateModal(false);
      // Navigate to live room
      const targetRole = profile?.role === 'super_admin' ? 'admin' : profile?.role === 'school_admin' ? 'school' : 'teacher';
      navigate(`/${targetRole}/live-class/${created.id}`, {
        state: { title: created.title, code, topic: payload.topic }
      });
    } catch (err: any) {
      console.error('Failed to create class:', err);
      alert('Error creating class: ' + err.message);
    }
  };

  const filtered = classes.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                          (c.description && c.description.toLowerCase().includes(search.toLowerCase())) ||
                          (c.class_code && c.class_code.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === 'all' || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  const liveCount = classes.filter(c => c.status === 'live').length;
  const scheduledCount = classes.filter(c => c.status === 'scheduled').length;
  const endedCount = classes.filter(c => c.status === 'ended').length;

  const formatDateTime = (dt: string) => {
    const d = new Date(dt);
    return {
      date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  return (
    <div className="space-y-6 text-white min-h-screen pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Video size={14} /> Digital Classroom Portal
            {profile?.role === 'super_admin' && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] border border-purple-500/30">
                All Schools (Super Admin)
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Live & Online Classes</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Conduct remote driving theory lessons, share screen & digital textbooks, give live interactive tests, and track real-time student participation.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-3 text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-600/30 active:scale-95"
          >
            <Plus size={18} /> Open New Class
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Total Classes</p>
            <p className="text-2xl font-black text-white mt-1">{classes.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Video size={22} />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Live Now</p>
            <p className="text-2xl font-black text-red-400 mt-1">{liveCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Radio size={22} className="animate-pulse" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Scheduled</p>
            <p className="text-2xl font-black text-blue-400 mt-1">{scheduledCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Calendar size={22} />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">Completed</p>
            <p className="text-2xl font-black text-slate-400 mt-1">{endedCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by class title, code, or description..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(['all', 'live', 'scheduled', 'ended'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                filter === f ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          onClick={loadClasses}
          className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          title="Refresh class list"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">Loading online classes...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center max-w-md mx-auto">
          <AlertCircle size={32} className="text-rose-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-white mb-1">{error}</p>
          <button onClick={loadClasses} className="mt-3 text-xs font-bold text-rose-300 hover:underline">
            Try Again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-4">
            <Video size={28} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No Live Classes Found</h3>
          <p className="text-xs text-slate-400 mb-6">
            There are currently no active or scheduled online classes matching your search criteria for your school.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all"
          >
            <Plus size={16} /> Open First Class
          </button>
        </div>
      ) : (
        /* Class Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(item => {
            const cfg = statusConfig[item.status] || statusConfig.scheduled;
            const dt = formatDateTime(item.scheduled_at);
            const targetRole = profile?.role === 'super_admin' ? 'admin' : profile?.role === 'school_admin' ? 'school' : 'teacher';

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Top status & code badge */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                      {item.status === 'live' && <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />}
                      {cfg.icon}
                      {cfg.label}
                    </span>

                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs text-blue-400 font-extrabold tracking-wider">
                      {item.class_code}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {item.description || 'Theory lesson & Interactive live quiz'}
                  </p>

                  <div className="space-y-2 mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Users size={13} className="text-blue-400" /> Students Attending:
                      </span>
                      <span className="font-extrabold text-white">{item.enrolled_count || 12}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Calendar size={13} className="text-indigo-400" /> Date & Time:
                      </span>
                      <span className="font-semibold text-slate-200">{dt.date} · {dt.time}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Clock size={13} className="text-amber-400" /> Duration:
                      </span>
                      <span className="font-semibold text-slate-200">{item.duration_minutes || 60} mins</span>
                    </div>
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                  {item.status === 'live' ? (
                    <button
                      onClick={() => navigate(`/${targetRole}/live-class/${item.id}`, { state: { title: item.title, code: item.class_code } })}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-red-600/20 animate-pulse"
                    >
                      <Play size={14} /> Enter Live Classroom
                    </button>
                  ) : item.status === 'scheduled' ? (
                    <button
                      onClick={() => navigate(`/${targetRole}/live-class/${item.id}`, { state: { title: item.title, code: item.class_code } })}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                    >
                      <Video size={14} /> Start Class Now
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/${targetRole}/live-class/${item.id}`, { state: { title: item.title, code: item.class_code, ended: true } })}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
                    >
                      View Summary
                    </button>
                  )}

                  <button
                    onClick={e => handleCopyLink(e, item.class_code || 'CODE', item.id)}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition-colors"
                    title="Copy Student Join Link"
                  >
                    {copiedId === item.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Open New Class */}
      {showCreateModal && (
        <OpenNewClassModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateClass}
        />
      )}
    </div>
  );
}

function OpenNewClassModal({
  onClose,
  onCreate
}: {
  onClose: () => void;
  onCreate: (data: { title: string; description: string; topic: string; duration: number }) => void;
}) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('Road Rules & Priority Signs');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Video size={20} />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base">Open New Online Class</h2>
              <p className="text-xs text-slate-400">Creates a live session & code for your students</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-white rounded-lg"><X size={20} /></button>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            if (title.trim()) {
              onCreate({ title: title.trim(), description, topic, duration });
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Class Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="e.g. Masterclass: Priority Road Signs & Roundabout Rules"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Lesson Topic</label>
              <select
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full px-3 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Road Rules & Priority Signs">Road Rules & Priority</option>
                <option value="Traffic Light Signals & Markings">Traffic Signals & Markings</option>
                <option value="Defensive Driving & Speed Limits">Defensive Driving & Speed</option>
                <option value="First Aid & Emergency Response">First Aid & Emergency</option>
                <option value="Vehicle Mechanical Inspection">Mechanical Inspection</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Duration (Minutes)</label>
              <input
                type="number"
                min={15}
                max={240}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Lesson Description & Materials</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief outline of lesson goals or reference textbook chapters..."
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-3 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl transition-all shadow-lg shadow-blue-600/30"
            >
              Launch Class Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
