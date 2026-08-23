import { Link } from 'react-router-dom';
import {
  School, GraduationCap, Video, BookOpen, Award, BarChart3,
  MapPin, Phone, Mail, User, ShieldCheck, ArrowRight,
  Clock, CheckCircle, ChevronRight
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';

export default function StudentDashboard() {
  const schoolInfo = {
    name: 'Kigali International Driving Academy',
    logo: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=120&q=80',
    tagline: 'Leading Accredited Driving Academy in Rwanda',
    address: 'Kigali City, Nyarugenge District, KN 5 Rd (Opposite City Tower)',
    phone: '+250 788 123 456 / +250 722 987 654',
    email: 'info@kigalidriving.rw',
    director: 'Director Jean Paul Nshimiye',
    accreditation: 'NLA/RDA-CERT/2024/0942',
    registeredCategory: 'Category B (Private Car & SUV)',
    enrollmentDate: 'Jan 10, 2026',
    status: 'Active Student'
  };

  const upcomingClasses = [
    { id: '1', title: 'Priority & Right of Way Rules', type: 'Live Class', code: 'LIVE-7049', time: 'Today, 2:00 PM', instructor: 'Teacher Eric Mugisha', status: 'live_now' },
    { id: '2', title: 'Traffic Signs & Road Markings Exam', type: 'Physical Exam', code: 'PHYS-8842', time: 'Tomorrow, 10:00 AM', instructor: 'Teacher Chantal Akimana', status: 'upcoming' },
    { id: '3', title: 'Speed Limits & Highway Overtaking', type: 'Live Class', code: 'LIVE-9102', time: 'Friday, 4:00 PM', instructor: 'Teacher Eric Mugisha', status: 'upcoming' },
  ];

  const recentScores = [
    { title: 'Full Theory Mock Exam 01', score: 19, total: 20, percentage: 95, status: 'Passed', date: 'Yesterday' },
    { title: 'Road Signs & Signals Test', score: 18, total: 20, percentage: 90, status: 'Passed', date: '3 days ago' },
    { title: 'Vehicle Mechanics Essentials', score: 17, total: 20, percentage: 85, status: 'Passed', date: 'Feb 20, 2026' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome & Student Badge Banner */}
      <div className="rounded-2xl p-6 text-white shadow-xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1e3a8a 100%)' }}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-400/20">
              <GraduationCap size={14} /> Student Portal • Reg No: STU-2026-089
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Welcome back, Uwase Aline!</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              You are enrolled in <strong className="text-white">{schoolInfo.registeredCategory}</strong> at {schoolInfo.name}. Keep practicing to pass your national driver test!
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/student/classes"
              className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center gap-2"
            >
              <BookOpen size={16} /> Enter Class Code
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Quick Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Average Score" value="90.5%" icon={<BarChart3 size={20} />} color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatCard title="Tests Completed" value={6} icon={<BookOpen size={20} />} color="text-blue-600" bgColor="bg-blue-50" />
        <StatCard title="Live Classes Attended" value={14} icon={<Video size={20} />} color="text-purple-600" bgColor="bg-purple-50" />
        <StatCard title="Certificates Earned" value={1} icon={<Award size={20} />} color="text-amber-600" bgColor="bg-amber-50" />
      </div>

      {/* School Information Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <School size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-800 text-base">My Registered Driving School</h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
            <CheckCircle size={12} /> {schoolInfo.status}
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-md">
                KDA
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{schoolInfo.name}</h3>
                <p className="text-xs text-blue-600 font-medium">{schoolInfo.tagline}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-mono">
                  <ShieldCheck size={13} className="text-blue-600" /> Accreditation: {schoolInfo.accreditation}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <MapPin size={15} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{schoolInfo.address}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <User size={15} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{schoolInfo.director}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <Phone size={15} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{schoolInfo.phone}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <Mail size={15} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{schoolInfo.email}</span>
              </div>
            </div>
          </div>

          {/* Student enrollment box */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-xl p-4 border border-blue-100/60 flex flex-col justify-between">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Your Registration Details</div>
              <div className="text-sm font-bold text-slate-800 mt-2">{schoolInfo.registeredCategory}</div>
              <p className="text-xs text-slate-500 mt-1">Full Provisional & Practical Driver Training Package</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Enrolled Date:</span>
                <span className="font-semibold text-slate-800">{schoolInfo.enrollmentDate}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Attendance Rate:</span>
                <span className="font-semibold text-emerald-600">96%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Upcoming Classes & Quick Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming / Active Classes */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-800 text-sm">Scheduled Classes & Exams</h3>
            </div>
            <Link to="/student/classes" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              Join with Code <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-2.5">
            {upcomingClasses.map((cls) => (
              <div key={cls.id} className="p-3.5 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 flex items-center justify-between transition-all">
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      cls.type === 'Live Class' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {cls.type}
                    </span>
                    <span className="text-xs font-mono text-slate-500">Code: <strong>{cls.code}</strong></span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mt-1 truncate">{cls.title}</h4>
                  <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span><Clock size={11} className="inline mr-1" />{cls.time}</span>
                    <span>•</span>
                    <span>{cls.instructor}</span>
                  </p>
                </div>
                <Link
                  to={`/student/classes?code=${cls.code}`}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex-shrink-0 shadow-sm flex items-center gap-1"
                >
                  Join <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Test Results */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm">Recent Test Performance</h3>
            </div>
            <Link to="/student/results" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              View History <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentScores.map((score, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{score.title}</h4>
                  <div className="text-[11px] text-slate-400 mt-0.5">{score.date} • {score.score}/{score.total} Correct</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-600">{score.percentage}%</div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    {score.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
