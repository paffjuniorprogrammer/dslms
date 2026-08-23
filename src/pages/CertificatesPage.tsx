import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Award, Printer, Download, Sparkles, Building2, UserCheck,
  ShieldCheck, FileText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchStudents, fetchSchool, type DBStudent, type DBSchool } from '@/lib/db';

interface SchoolCertificateConfig {
  schoolName: string;
  schoolTagline: string;
  schoolLogo: string;
  address: string;
  phone: string;
  email: string;
  directorName: string;
  directorTitle: string;
  accreditationNo: string;
  stampColor: string;
}

export default function CertificatesPage() {
  const location = useLocation();
  const { profile } = useAuth();

  // Student list from DB
  const [students, setStudents] = useState<DBStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    (location.state as { selectedStudentId?: string })?.selectedStudentId || ''
  );

  const [selectedTemplate, setSelectedTemplate] = useState<'national_official' | 'gold_luxury' | 'modern_clean'>('national_official');

  // School certificate config — populated from DB school record
  const [schoolConfig, setSchoolConfig] = useState<SchoolCertificateConfig>({
    schoolName: 'Loading...',
    schoolTagline: 'Certified Road Safety & National Driving Academy',
    schoolLogo: '',
    address: '',
    phone: '',
    email: '',
    directorName: 'School Director',
    directorTitle: 'Director General & Chief Examiner',
    accreditationNo: 'N/A',
    stampColor: '#1e3a8a',
  });

  // Load students + school info from DB
  const loadData = useCallback(async () => {
    if (!profile?.school_id) return;
    setLoadingStudents(true);
    try {
      const [studentRows, school] = await Promise.all([
        fetchStudents(profile.school_id),
        fetchSchool(profile.school_id),
      ]);
      setStudents(studentRows);
      if (studentRows.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studentRows[0].id);
      }
      if (school) {
        setSchoolConfig(prev => ({
          ...prev,
          schoolName: school.name,
          email: school.email,
          phone: school.phone ?? '',
          address: school.location ?? '',
          schoolLogo: school.logo_url ?? '',
        }));
      }
    } catch (err) {
      console.error('Failed to load certificate data:', err);
    } finally {
      setLoadingStudents(false);
    }
  }, [profile?.school_id]);

  useEffect(() => { void loadData(); }, [loadData]);

  // Active student
  const activeStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const studentAvgScore = 0; // Real scores come from Reports page

  // Print trigger
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    alert(`Downloading Official Certificate for ${activeStudent?.full_name ?? 'Student'} (Category: ${activeStudent?.license_category ?? 'B'})...`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-purple-500/30 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-extrabold flex items-center gap-1.5">
                <Award size={14} /> Official Driving License Certificate Generator
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-bold">
                National Standard Compliant
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Certificate Designer & Issuance
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Select a trainee student, customize your school logo, address, director name & stamp, and generate high-resolution official completion certificates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all"
            >
              <Printer size={16} />
              <span>Print Certificate</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-extrabold shadow-lg shadow-purple-600/30 transition-all"
            >
              <Download size={16} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Settings & Live Certificate Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Student & School Settings Controls */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-6">
          {/* 1. Student Selection */}
          <div className="space-y-3 pb-5 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <UserCheck size={16} className="text-purple-600" />
              1. Select Trainee Student
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Student from System</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              >
              {loadingStudents ? (
                <option disabled>Loading students...</option>
              ) : students.length === 0 ? (
                <option disabled>No students found</option>
              ) : (
                students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.full_name} — {st.license_category ?? 'N/A'}
                  </option>
                ))
              )}
              </select>
            </div>

            {/* Selected Student Card Summary */}
            {activeStudent ? (
              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-xs space-y-1">
                <div className="font-black text-purple-900 text-sm">{activeStudent.full_name}</div>
                <div className="text-slate-600 flex items-center gap-1 font-mono text-[11px]">
                  <ShieldCheck size={12} className="text-purple-600" /> ID: {activeStudent.id.slice(0, 8)}…
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-slate-700">Cat {activeStudent.license_category ?? '—'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px]">
                    {activeStudent.status}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* 2. Certificate Template */}
          <div className="space-y-3 pb-5 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} className="text-purple-600" />
              2. Certificate Style Template
            </h3>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                { id: 'national_official', title: 'Official National Royal Seal', desc: 'Classic navy/gold border with official seal graphic' },
                { id: 'gold_luxury', title: 'Luxury Gold Foil Crest', desc: 'Deep burgundy accents and metallic gold framing' },
                { id: 'modern_clean', title: 'Modern Minimalist Driving', desc: 'Clean slate layout with high-contrast badge' },
              ].map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl.id as typeof selectedTemplate)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedTemplate === tpl.id
                      ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-400'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="font-bold">{tpl.title}</div>
                  <div className={`text-[11px] ${selectedTemplate === tpl.id ? 'text-purple-200' : 'text-slate-500'}`}>
                    {tpl.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. School Details Customization */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <Building2 size={16} className="text-purple-600" />
              3. School Branding & Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Driving School Name</label>
                <input
                  type="text"
                  value={schoolConfig.schoolName}
                  onChange={(e) => setSchoolConfig((prev) => ({ ...prev, schoolName: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">School Tagline / Accreditation</label>
                <input
                  type="text"
                  value={schoolConfig.schoolTagline}
                  onChange={(e) => setSchoolConfig((prev) => ({ ...prev, schoolTagline: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">School Address & Contact</label>
                <input
                  type="text"
                  value={schoolConfig.address}
                  onChange={(e) => setSchoolConfig((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Name of Director / Principal</label>
                <input
                  type="text"
                  value={schoolConfig.directorName}
                  onChange={(e) => setSchoolConfig((prev) => ({ ...prev, directorName: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Accreditation / Registration No.</label>
                <input
                  type="text"
                  value={schoolConfig.accreditationNo}
                  onChange={(e) => setSchoolConfig((prev) => ({ ...prev, accreditationNo: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Stamp Ink Color</label>
                <div className="flex items-center gap-3">
                  {[
                    { name: 'Royal Navy', color: '#1e3a8a' },
                    { name: 'Crimson Red', color: '#991b1b' },
                    { name: 'Emerald', color: '#065f46' },
                  ].map((st) => (
                    <button
                      key={st.color}
                      type="button"
                      onClick={() => setSchoolConfig((prev) => ({ ...prev, stampColor: st.color }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold ${
                        schoolConfig.stampColor === st.color
                          ? 'border-purple-600 bg-purple-50 text-purple-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: st.color }} />
                      {st.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Live Certificate Graphic Preview Canvas */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold pb-2 border-b border-slate-800">
            <span className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" /> Live Certificate Render Preview
            </span>
            <span className="text-slate-500 font-mono">100% Scale Printable Visual Canvas</span>
          </div>

          {/* Certificate Container */}
          <div className="bg-amber-50/20 p-3 sm:p-6 rounded-2xl overflow-hidden flex justify-center">
            {/* The Certificate Paper */}
            <div
              className={`w-full max-w-2xl bg-white text-slate-900 rounded-xl p-8 sm:p-10 shadow-2xl relative border-8 ${
                selectedTemplate === 'national_official'
                  ? 'border-blue-900 outline outline-4 outline-amber-500/60'
                  : selectedTemplate === 'gold_luxury'
                  ? 'border-amber-600 outline outline-4 outline-red-900'
                  : 'border-slate-800 outline outline-4 outline-slate-300'
              }`}
              style={{
                backgroundImage: 'radial-gradient(#f1f5f9 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            >
              {/* Corner Ornaments */}
              <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-600" />
              <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-600" />
              <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-600" />
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-600" />

              {/* Watermark Crest */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <ShieldCheck size={320} className="text-blue-900" />
              </div>

              <div className="relative z-10 space-y-6 text-center">
                {/* Header Logo & School Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-900 text-amber-400 flex items-center justify-center font-black shadow-md border-2 border-amber-400">
                      <Building2 size={28} />
                    </div>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
                    {schoolConfig.schoolName}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">{schoolConfig.schoolTagline}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{schoolConfig.address}</p>
                  <div className="w-24 h-0.5 bg-amber-500 mx-auto rounded-full" />
                </div>

                {/* Certificate Main Title */}
                <div className="py-2">
                  <div className="inline-block px-4 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase tracking-widest mb-1 border border-slate-200">
                    REPUBLIC OF RWANDA — DRIVING EDUCATION
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-blue-950 uppercase">
                    Certificate of Completion
                  </h1>
                  <p className="text-xs text-slate-500 font-serif italic">
                    Provisional Driving Theory & Practical Examination Competency
                  </p>
                </div>

                {/* Certification Statement */}
                <div className="space-y-3 py-2">
                  <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
                    This is to officially certify that:
                  </p>

                  {/* Student Name Display in Distinct Badge */}
                  <div className="inline-block bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white font-black text-2xl sm:text-3xl px-8 py-3 rounded-2xl shadow-lg border-2 border-amber-400 tracking-wide">
                    {activeStudent?.full_name ?? 'Select a Student'}
                  </div>

                  <div className="flex items-center justify-center gap-4 text-xs font-mono font-bold text-slate-700">
                    <span>Student ID: <strong className="text-slate-900">{activeStudent?.id.slice(0, 12) ?? '—'}</strong></span>
                    <span>•</span>
                    <span>Category: <strong className="text-blue-900">Cat {activeStudent?.license_category ?? '—'}</strong></span>
                  </div>
                </div>

                {/* Details Text */}
                <p className="text-xs text-slate-700 max-w-lg mx-auto leading-relaxed">
                  Has successfully passed all required theoretical traffic laws, road safety regulations, speed control rules, and practical vehicle handling modules under registration <strong>{schoolConfig.accreditationNo}</strong> with an overall score of <strong className="text-emerald-700">{studentAvgScore}%</strong>.
                </p>

                {/* Signature & Official Seal Stamp Footer */}
                <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-6 items-end">
                  {/* Left: Director Signature */}
                  <div className="text-left space-y-1">
                    <div className="font-serif italic text-lg text-slate-800 font-bold border-b border-slate-300 pb-1 w-48">
                      {schoolConfig.directorName}
                    </div>
                    <div className="text-xs font-black text-slate-900">{schoolConfig.directorName}</div>
                    <div className="text-[10px] text-slate-500">{schoolConfig.directorTitle}</div>
                  </div>

                  {/* Right: Authentic School Stamp Seal Graphic */}
                  <div className="flex justify-end">
                    <div
                      className="w-28 h-28 rounded-full border-4 border-dashed p-1 flex items-center justify-center relative shadow-sm rotate-[-8deg] opacity-90"
                      style={{ borderColor: schoolConfig.stampColor, color: schoolConfig.stampColor }}
                    >
                      <div className="w-full h-full rounded-full border-2 border-solid flex flex-col items-center justify-center p-1 text-center font-mono">
                        <div className="text-[8px] font-black uppercase leading-tight tracking-tighter">
                          OFFICIAL SEAL
                        </div>
                        <ShieldCheck size={20} className="my-0.5" />
                        <div className="text-[7px] font-bold leading-none uppercase">
                          {schoolConfig.schoolName.substring(0, 22)}
                        </div>
                        <div className="text-[6px] font-extrabold mt-0.5">APPROVED</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Serial Date */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2">
                  <span>Issue Date: {new Date().toLocaleDateString('en-GB')}</span>
                  <span>Serial: CERT-{activeStudent?.id.slice(0, 8) ?? 'N/A'}-{new Date().getFullYear()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
