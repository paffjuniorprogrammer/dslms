/**
 * src/lib/db.ts
 *
 * Centralised Supabase query helpers.
 * All pages import from here instead of writing raw .from() calls inline.
 * This makes it trivial to add caching, optimistic updates, or swap
 * the backend later without touching every page.
 */

import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Types returned by the helpers (DB shapes, not the legacy mock shapes)
// ─────────────────────────────────────────────────────────────────────────────

export interface DBStudent {
  id: string;
  school_id: string;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  license_category: string | null;
  enrollment_date: string;
  status: 'active' | 'completed' | 'dropped';
  created_at: string;
}

export interface DBTeacher {
  id: string;
  school_id: string;
  profile_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface DBSchool {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  logo_url: string | null;
  status: 'active' | 'suspended';
  subscription_plan: 'basic' | 'pro' | 'enterprise';
  created_at: string;
  updated_at: string;
  // Extended columns (from migration / provisioning function)
  school_code?: string | null;
  reg_number?: string | null;
  owner?: string | null;
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  cell?: string | null;
  village?: string | null;
  address?: string | null;
  alt_phone?: string | null;
  website?: string | null;
  tin_number?: string | null;
  teachers_count?: number;
  students_count?: number;
  certificates_count?: number;
  exams_count?: number;
  reg_date?: string | null;
  expiry_date?: string | null;
  remaining_days?: number | null;
  last_login?: string | null;
  storage_usage?: string | null;
  notes?: string | null;
}

export interface DBQuestion {
  id: string;
  exam_id: string | null;
  school_id: string | null; // null = platform-wide question
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[] | null;
  correct_answer: string;
  points: number;
  category: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  language: 'en' | 'rw' | 'fr';
  status: 'active' | 'draft';
  explanation: string | null;
  times_asked: number;
  correct_rate: number;
  created_at: string;
}

export interface DBLiveClass {
  id: string;
  school_id: string;
  class_id: string | null;
  teacher_id: string | null;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  meeting_url: string | null;
  class_type: 'online' | 'physical';
  access_code: string | null;
  room: string | null;
  max_students: number;
  created_at: string;
}

export interface DBPhysicalClassResult {
  id: string;
  session_id: string;
  school_id: string;
  student_id: string | null;
  student_name: string;
  nin: string | null;
  score: number;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  time_used_secs: number | null;
  passed: boolean;
  answers: Record<string, unknown> | null;
  submitted_at: string;
}

export interface DBExam {
  id: string;
  school_id: string;
  class_id: string | null;
  teacher_id: string | null;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number;
  status: 'draft' | 'published' | 'archived';
  scheduled_at: string | null;
  created_at: string;
  question_count?: number;
}

export interface DBExamResult {
  id: string;
  exam_id: string;
  student_id: string;
  score: number;
  total_points: number;
  earned_points: number;
  passed: boolean;
  answers: Record<string, string> | null;
  started_at: string;
  completed_at: string | null;
  // Joined fields
  student_name?: string;
  exam_title?: string;
}

export interface DBCertificate {
  id: string;
  school_id: string;
  student_id: string;
  exam_id: string | null;
  certificate_number: string;
  license_category: string;
  issued_at: string;
  status: 'issued' | 'revoked';
  // Joined fields
  student_name?: string;
  student_email?: string;
}

export interface SuperAdminStats {
  schoolsCount: number;
  teachersCount: number;
  studentsCount: number;
  certificatesCount: number;
  liveClassesCount: number;
  activeSchoolsCount: number;
}

export interface StudentReport {
  studentId: string;
  studentName: string;
  licenseCategory: string | null;
  exercisesCompleted: number;
  averageScorePercentage: number;
  highestScore: number;
  lowestScore: number;
  lastActive: string | null;
  status: 'Pass (Mastered)' | 'Average' | 'Needs Practice';
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchStudents(schoolId: string): Promise<DBStudent[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id, school_id, profile_id, full_name, email, phone, license_category, enrollment_date, status, created_at')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DBStudent[];
}

export async function fetchAllStudents(): Promise<DBStudent[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id, school_id, profile_id, full_name, email, phone, license_category, enrollment_date, status, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DBStudent[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TEACHERS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchTeachers(schoolId: string): Promise<DBTeacher[]> {
  const { data, error } = await supabase
    .from('teachers')
    .select('id, school_id, profile_id, full_name, email, phone, specialization, status, created_at')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DBTeacher[];
}

/**
 * Resolve the teachers table row for the currently signed-in teacher
 * using their profile_id (= auth.users id).
 */
export async function fetchTeacherByProfileId(profileId: string): Promise<DBTeacher | null> {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as DBTeacher | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOLS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSchools(): Promise<DBSchool[]> {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DBSchool[];
}

export async function fetchSchool(schoolId: string): Promise<DBSchool | null> {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as DBSchool | null;
}

export async function updateSchoolStatus(schoolId: string, status: 'active' | 'suspended'): Promise<void> {
  const { error } = await supabase
    .from('schools')
    .update({ status })
    .eq('id', schoolId);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN STATS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSuperAdminStats(): Promise<SuperAdminStats> {
  const [
    { count: schoolsCount },
    { count: teachersCount },
    { count: studentsCount },
    { count: certificatesCount },
    { count: liveClassesCount },
    { count: activeSchoolsCount },
  ] = await Promise.all([
    supabase.from('schools').select('id', { count: 'exact', head: true }),
    supabase.from('teachers').select('id', { count: 'exact', head: true }),
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('certificates').select('id', { count: 'exact', head: true }),
    supabase.from('live_classes').select('id', { count: 'exact', head: true }),
    supabase.from('schools').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  return {
    schoolsCount: schoolsCount ?? 0,
    teachersCount: teachersCount ?? 0,
    studentsCount: studentsCount ?? 0,
    certificatesCount: certificatesCount ?? 0,
    liveClassesCount: liveClassesCount ?? 0,
    activeSchoolsCount: activeSchoolsCount ?? 0,
  };
}

/**
 * Fetch the most recently registered schools for the activity feed.
 */
export async function fetchRecentSchools(limit = 5): Promise<Pick<DBSchool, 'id' | 'name' | 'created_at' | 'status'>[]> {
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, created_at, status')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<DBSchool, 'id' | 'name' | 'created_at' | 'status'>[];
}

/**
 * Group schools by registration month for the trend chart.
 * Returns last N months with school count.
 */
export async function fetchSchoolMonthlyTrend(months = 8): Promise<{ month: string; schools: number }[]> {
  const { data, error } = await supabase
    .from('schools')
    .select('created_at')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const monthLabels = Array.from({ length: months }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (months - 1 - i));
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('en', { month: 'short' }) };
  });

  const counts: Record<string, number> = {};
  monthLabels.forEach(m => { counts[m.key] = 0; });

  (data ?? []).forEach((row: { created_at: string }) => {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (counts[key] !== undefined) counts[key]++;
  });

  return monthLabels.map(m => ({ month: m.label, schools: counts[m.key] }));
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM QUESTION BANK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch platform-wide questions (school_id IS NULL) plus optionally
 * school-specific questions. Super admin always gets all.
 */
export async function fetchQuestions(options?: {
  schoolId?: string;
  category?: string;
  status?: 'active' | 'draft';
}): Promise<DBQuestion[]> {
  let query = supabase
    .from('questions')
    .select('*')
    .is('exam_id', null) // Only question-bank questions (not exam-specific)
    .order('created_at', { ascending: false });

  if (options?.category && options.category !== 'all') {
    query = query.eq('category', options.category);
  }
  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DBQuestion[];
}

export async function createQuestion(question: Omit<DBQuestion, 'id' | 'created_at' | 'times_asked' | 'correct_rate'>): Promise<DBQuestion> {
  const { data, error } = await supabase
    .from('questions')
    .insert(question)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DBQuestion;
}

export async function updateQuestion(id: string, updates: Partial<Omit<DBQuestion, 'id' | 'created_at'>>): Promise<void> {
  const { error } = await supabase
    .from('questions')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE CLASSES
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchLiveClasses(schoolId: string): Promise<DBLiveClass[]> {
  const { data, error } = await supabase
    .from('live_classes')
    .select('*')
    .eq('school_id', schoolId)
    .order('scheduled_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DBLiveClass[];
}

export async function fetchTeacherLiveClasses(teacherId: string): Promise<DBLiveClass[]> {
  const { data, error } = await supabase
    .from('live_classes')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('scheduled_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DBLiveClass[];
}

export async function createLiveClass(liveClass: Omit<DBLiveClass, 'id' | 'created_at'>): Promise<DBLiveClass> {
  const { data, error } = await supabase
    .from('live_classes')
    .insert(liveClass)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DBLiveClass;
}

export async function fetchAllLiveClasses(): Promise<DBLiveClass[]> {
  const { data, error } = await supabase
    .from('live_classes')
    .select('*')
    .order('scheduled_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DBLiveClass[];
}

export async function fetchLiveClassById(id: string): Promise<DBLiveClass | null> {
  const { data, error } = await supabase
    .from('live_classes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as DBLiveClass | null;
}

export async function fetchLiveClassByCode(code: string): Promise<DBLiveClass | null> {
  const { data, error } = await supabase
    .from('live_classes')
    .select('*')
    .eq('meeting_url', code)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as DBLiveClass | null;
}

export async function updateLiveClassStatus(id: string, status: DBLiveClass['status']): Promise<void> {
  const { error } = await supabase
    .from('live_classes')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function saveExamResult(result: {
  exam_id?: string;
  student_id: string;
  score: number;
  total_points: number;
  earned_points: number;
  passed: boolean;
  answers: Record<string, string>;
}): Promise<DBExamResult> {
  const { data, error } = await supabase
    .from('exam_results')
    .insert({
      exam_id: result.exam_id ?? '00000000-0000-0000-0000-000000000000',
      student_id: result.student_id,
      score: result.score,
      total_points: result.total_points,
      earned_points: result.earned_points,
      passed: result.passed,
      answers: result.answers,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DBExamResult;
}


// ─────────────────────────────────────────────────────────────────────────────
// PHYSICAL CLASSES
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchPhysicalClasses(schoolId: string): Promise<DBLiveClass[]> {
  const { data, error } = await supabase
    .from('live_classes')
    .select('*')
    .eq('school_id', schoolId)
    .eq('class_type', 'physical')
    .order('scheduled_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DBLiveClass[];
}

export async function fetchPhysicalClassByCode(code: string): Promise<DBLiveClass | null> {
  const { data, error } = await supabase
    .from('live_classes')
    .select('*')
    .eq('access_code', code)
    .eq('class_type', 'physical')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as DBLiveClass | null;
}

export async function createPhysicalClass(
  session: Omit<DBLiveClass, 'id' | 'created_at' | 'meeting_url'>
): Promise<DBLiveClass> {
  const { data, error } = await supabase
    .from('live_classes')
    .insert({ ...session, class_type: 'physical' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DBLiveClass;
}

export async function updatePhysicalClassStatus(
  id: string,
  status: DBLiveClass['status']
): Promise<void> {
  const { error } = await supabase
    .from('live_classes')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function savePhysicalClassResult(result: {
  session_id: string;
  school_id: string;
  student_id?: string;
  student_name: string;
  nin?: string;
  score: number;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  time_used_secs?: number;
  passed: boolean;
  answers?: Record<string, unknown>;
}): Promise<DBPhysicalClassResult> {
  const { data, error } = await supabase
    .from('physical_class_results')
    .insert({
      session_id: result.session_id,
      school_id: result.school_id,
      student_id: result.student_id ?? null,
      student_name: result.student_name,
      nin: result.nin ?? null,
      score: result.score,
      total_questions: result.total_questions,
      correct_count: result.correct_count,
      wrong_count: result.wrong_count,
      time_used_secs: result.time_used_secs ?? null,
      passed: result.passed,
      answers: result.answers ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DBPhysicalClassResult;
}

export async function fetchPhysicalClassResults(
  sessionId: string
): Promise<DBPhysicalClassResult[]> {
  const { data, error } = await supabase
    .from('physical_class_results')
    .select('*')
    .eq('session_id', sessionId)
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DBPhysicalClassResult[];
}

export async function fetchAllPhysicalClassResults(
  schoolId: string
): Promise<DBPhysicalClassResult[]> {
  const { data, error } = await supabase
    .from('physical_class_results')
    .select('*')
    .eq('school_id', schoolId)
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DBPhysicalClassResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMS (per-school)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchExams(schoolId: string): Promise<DBExam[]> {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DBExam[];
}

export async function fetchTeacherExams(teacherId: string): Promise<DBExam[]> {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DBExam[];
}

export async function createExam(exam: Omit<DBExam, 'id' | 'created_at' | 'question_count'>): Promise<DBExam> {
  const { data, error } = await supabase
    .from('exams')
    .insert(exam)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DBExam;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAM RESULTS → Reports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate exam results per student for the Reports page.
 * Returns one row per student with score aggregations.
 */
export async function fetchStudentReports(schoolId: string): Promise<StudentReport[]> {
  // Fetch all exam results for this school's exams
  const { data: results, error } = await supabase
    .from('exam_results')
    .select(`
      id,
      score,
      passed,
      completed_at,
      student_id,
      students!inner (
        id,
        full_name,
        license_category,
        school_id
      )
    `)
    .eq('students.school_id', schoolId);

  if (error) throw new Error(error.message);
  if (!results || results.length === 0) return [];

  // Group by student
  const byStudent: Record<string, {
    studentName: string;
    licenseCategory: string | null;
    scores: number[];
    lastActive: string | null;
  }> = {};

  for (const row of results as any[]) {
    const sid = row.student_id as string;
    if (!byStudent[sid]) {
      byStudent[sid] = {
        studentName: row.students?.full_name ?? 'Unknown',
        licenseCategory: row.students?.license_category ?? null,
        scores: [],
        lastActive: null,
      };
    }
    byStudent[sid].scores.push(row.score as number);
    if (row.completed_at) {
      const prev = byStudent[sid].lastActive;
      if (!prev || new Date(row.completed_at) > new Date(prev)) {
        byStudent[sid].lastActive = row.completed_at as string;
      }
    }
  }

  return Object.entries(byStudent).map(([studentId, data]) => {
    const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    const highest = Math.max(...data.scores);
    const lowest = Math.min(...data.scores);
    const status: StudentReport['status'] =
      avg >= 80 ? 'Pass (Mastered)' :
      avg >= 60 ? 'Average' :
      'Needs Practice';

    return {
      studentId,
      studentName: data.studentName,
      licenseCategory: data.licenseCategory,
      exercisesCompleted: data.scores.length,
      averageScorePercentage: parseFloat(avg.toFixed(1)),
      highestScore: highest,
      lowestScore: lowest,
      lastActive: data.lastActive,
      status,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATES
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCertificates(schoolId: string): Promise<DBCertificate[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      id, school_id, student_id, exam_id, certificate_number,
      license_category, issued_at, status,
      students ( full_name, email )
    `)
    .eq('school_id', schoolId)
    .order('issued_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((c: any) => ({
    id: c.id,
    school_id: c.school_id,
    student_id: c.student_id,
    exam_id: c.exam_id,
    certificate_number: c.certificate_number,
    license_category: c.license_category,
    issued_at: c.issued_at,
    status: c.status,
    student_name: c.students?.full_name ?? null,
    student_email: c.students?.email ?? null,
  })) as DBCertificate[];
}

export async function issueCertificate(payload: {
  schoolId: string;
  studentId: string;
  examId?: string;
  licenseCategory: string;
}): Promise<DBCertificate> {
  const certNumber = `RW-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const { data, error } = await supabase
    .from('certificates')
    .insert({
      school_id: payload.schoolId,
      student_id: payload.studentId,
      exam_id: payload.examId ?? null,
      certificate_number: certNumber,
      license_category: payload.licenseCategory,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DBCertificate;
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Class Messages (real-time chat persistence)
// ─────────────────────────────────────────────────────────────────────────────

export interface DBLiveClassMessage {
  id: string;
  class_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'host' | 'student';
  message: string;
  pinned: boolean;
  created_at: string;
}

export async function fetchLiveClassMessages(classId: string): Promise<DBLiveClassMessage[]> {
  const { data, error } = await supabase
    .from('live_class_messages')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as DBLiveClassMessage[];
}

export async function sendLiveClassMessage(payload: {
  classId: string;
  senderId: string;
  senderName: string;
  senderRole: 'host' | 'student';
  message: string;
  id?: string;
}): Promise<DBLiveClassMessage> {
  const { data, error } = await supabase
    .from('live_class_messages')
    .insert({
      id: payload.id ?? undefined,
      class_id: payload.classId,
      sender_id: payload.senderId,
      sender_name: payload.senderName,
      sender_role: payload.senderRole,
      message: payload.message,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DBLiveClassMessage;
}

export async function pinLiveClassMessage(messageId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase
    .from('live_class_messages')
    .update({ pinned })
    .eq('id', messageId);
  if (error) throw new Error(error.message);
}

export async function deleteLiveClassMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('live_class_messages')
    .delete()
    .eq('id', messageId);
  if (error) throw new Error(error.message);
}


