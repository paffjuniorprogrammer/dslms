-- DSLMS full schema (auto-generated)
-- Run this once in Supabase Dashboard → SQL Editor
-- Generated: 2026-08-07T19:16:29.376Z
-- Migration files: 4

-- ═══════════════════════════════════════════════════════════════
-- 20260803173801_create_core_tables.sql
-- ═══════════════════════════════════════════════════════════════

/*
# Core Tables: Schools, Profiles, Teachers, Students

## Overview
Creates the foundational schema for the DriveClass Rwanda driving school platform.
This is a multi-tenant system where a Super Admin manages multiple driving schools,
each school has its own admin, teachers, and students.

## New Tables

### 1. schools
- `id` (uuid, PK) — unique school identifier
- `name` (text) — school name
- `email` (text, unique) — contact email
- `phone` (text) — contact phone number
- `location` (text) — physical location (district, province)
- `logo_url` (text, nullable) — optional logo image URL
- `status` (text) — 'active' or 'suspended', defaults to 'active'
- `subscription_plan` (text) — 'basic', 'pro', or 'enterprise', defaults to 'basic'
- `created_at` (timestamptz) — record creation timestamp
- `updated_at` (timestamptz) — last update timestamp

### 2. profiles
- `id` (uuid, PK) — references auth.users(id), CASCADE on delete
- `school_id` (uuid, FK to schools, nullable) — school the user belongs to (null for super admins)
- `full_name` (text) — user's full name
- `phone` (text, nullable) — phone number
- `role` (text) — 'super_admin', 'school_admin', 'teacher', or 'student'
- `avatar_url` (text, nullable) — optional avatar image
- `is_active` (boolean) — account active flag, defaults to true
- `created_at` (timestamptz)

### 3. teachers
- `id` (uuid, PK)
- `school_id` (uuid, FK to schools, CASCADE)
- `profile_id` (uuid, FK to profiles, nullable, CASCADE)
- `full_name` (text)
- `email` (text)
- `phone` (text, nullable)
- `specialization` (text, nullable) — e.g. "Code", "Practical"
- `status` (text) — 'active' or 'inactive'
- `created_at` (timestamptz)

### 4. students
- `id` (uuid, PK)
- `school_id` (uuid, FK to schools, CASCADE)
- `profile_id` (uuid, FK to profiles, nullable, CASCADE)
- `full_name` (text)
- `email` (text, nullable)
- `phone` (text, nullable)
- `license_category` (text, nullable) — e.g. "A", "B", "C", "D"
- `enrollment_date` (date) — when the student enrolled
- `status` (text) — 'active', 'completed', or 'dropped'
- `created_at` (timestamptz)

## Security (RLS)
All tables have RLS enabled with role-based access:
- Super admins: full CRUD across all schools
- School admins: manage their own school's data
- Teachers: read students in their school, manage exam results
- Students: read their own records

## Important Notes
1. The `profiles` table links to `auth.users` — users must sign in via Supabase Auth.
2. `school_id` on profiles is NULL for super admins (they manage all schools).
3. Helper functions current_user_role() and current_user_school_id() are SECURITY DEFINER
   to allow use in RLS policies.
4. Indexes added on frequently-queried columns.
*/

-- ===== SCHOOLS (no policies yet) =====
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  location text,
  logo_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  subscription_plan text NOT NULL DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'pro', 'enterprise')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ===== PROFILES =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('super_admin', 'school_admin', 'teacher', 'student')),
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ===== TEACHERS =====
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  specialization text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- ===== STUDENTS =====
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  license_category text,
  enrollment_date date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  created_at timestamptz DEFAULT now()
);

-- ===== HELPER FUNCTIONS (after profiles exists) =====
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ===== ENABLE RLS ON ALL TABLES =====
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- ===== SCHOOLS POLICIES =====
DROP POLICY IF EXISTS "select_schools" ON schools;
CREATE POLICY "select_schools" ON schools FOR SELECT
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR id = public.current_user_school_id()
  );

DROP POLICY IF EXISTS "insert_schools" ON schools;
CREATE POLICY "insert_schools" ON schools FOR INSERT
  TO authenticated WITH CHECK (public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "update_schools" ON schools;
CREATE POLICY "update_schools" ON schools FOR UPDATE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR id = public.current_user_school_id()
  ) WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR id = public.current_user_school_id()
  );

DROP POLICY IF EXISTS "delete_schools" ON schools;
CREATE POLICY "delete_schools" ON schools FOR DELETE
  TO authenticated USING (public.current_user_role() = 'super_admin');

-- ===== PROFILES POLICIES =====
DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR public.current_user_role() = 'super_admin'
    OR (public.current_user_role() IN ('school_admin', 'teacher') AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "insert_profiles" ON profiles;
CREATE POLICY "insert_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "update_profiles" ON profiles;
CREATE POLICY "update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (
    id = auth.uid()
    OR public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  ) WITH CHECK (
    id = auth.uid()
    OR public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "delete_profiles" ON profiles;
CREATE POLICY "delete_profiles" ON profiles FOR DELETE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

-- ===== TEACHERS POLICIES =====
DROP POLICY IF EXISTS "select_teachers" ON teachers;
CREATE POLICY "select_teachers" ON teachers FOR SELECT
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR school_id = public.current_user_school_id()
  );

DROP POLICY IF EXISTS "insert_teachers" ON teachers;
CREATE POLICY "insert_teachers" ON teachers FOR INSERT
  TO authenticated WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "update_teachers" ON teachers;
CREATE POLICY "update_teachers" ON teachers FOR UPDATE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  ) WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "delete_teachers" ON teachers;
CREATE POLICY "delete_teachers" ON teachers FOR DELETE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

-- ===== STUDENTS POLICIES =====
DROP POLICY IF EXISTS "select_students" ON students;
CREATE POLICY "select_students" ON students FOR SELECT
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR school_id = public.current_user_school_id()
  );

DROP POLICY IF EXISTS "insert_students" ON students;
CREATE POLICY "insert_students" ON students FOR INSERT
  TO authenticated WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() IN ('school_admin', 'teacher') AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "update_students" ON students;
CREATE POLICY "update_students" ON students FOR UPDATE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() IN ('school_admin', 'teacher') AND school_id = public.current_user_school_id())
  ) WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() IN ('school_admin', 'teacher') AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "delete_students" ON students;
CREATE POLICY "delete_students" ON students FOR DELETE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_license_category ON students(license_category);
CREATE INDEX IF NOT EXISTS idx_schools_status ON schools(status);
CREATE INDEX IF NOT EXISTS idx_schools_subscription_plan ON schools(subscription_plan);

-- ===== updated_at trigger for schools =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS schools_updated_at ON schools;
CREATE TRIGGER schools_updated_at BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 20260803173907_create_learning_tables.sql
-- ═══════════════════════════════════════════════════════════════

/*
# Learning Tables: Classes, Exams, Questions, Results, Certificates, Live Classes

## Overview
Creates the academic/content tables for the DriveClass platform. These tables handle
course classes, exams (theory tests), individual exam questions, student exam results,
certificates, and live class sessions (video/streaming classes).

## New Tables

### 1. classes
- `id` (uuid, PK)
- `school_id` (uuid, FK to schools, CASCADE)
- `teacher_id` (uuid, FK to teachers, CASCADE)
- `name` (text) — class name, e.g. "Code Class 12A"
- `description` (text, nullable)
- `license_category` (text, nullable) — category being taught
- `start_date` (date) — class start date
- `end_date` (date, nullable) — class end date
- `status` (text) — 'scheduled', 'ongoing', 'completed'
- `created_at` (timestamptz)

### 2. class_enrollments
- `id` (uuid, PK)
- `class_id` (uuid, FK to classes, CASCADE)
- `student_id` (uuid, FK to students, CASCADE)
- `enrolled_at` (timestamptz)
- Unique constraint on (class_id, student_id) to prevent duplicate enrollments

### 3. exams
- `id` (uuid, PK)
- `school_id` (uuid, FK to schools, CASCADE)
- `class_id` (uuid, FK to classes, nullable, CASCADE) — exam can belong to a class or be standalone
- `teacher_id` (uuid, FK to teachers, CASCADE)
- `title` (text) — exam title
- `description` (text, nullable)
- `duration_minutes` (int) — time limit
- `passing_score` (int) — minimum score to pass (percentage)
- `status` (text) — 'draft', 'published', 'archived'
- `scheduled_at` (timestamptz, nullable) — when exam becomes available
- `created_at` (timestamptz)

### 4. questions
- `id` (uuid, PK)
- `exam_id` (uuid, FK to exams, CASCADE)
- `question_text` (text) — the question
- `question_type` (text) — 'multiple_choice', 'true_false', 'short_answer'
- `options` (jsonb, nullable) — array of answer options for MC/TF
- `correct_answer` (text) — the correct answer
- `points` (int) — points awarded, defaults to 1
- `created_at` (timestamptz)

### 5. exam_results
- `id` (uuid, PK)
- `exam_id` (uuid, FK to exams, CASCADE)
- `student_id` (uuid, FK to students, CASCADE)
- `score` (int) — percentage score
- `total_points` (int)
- `earned_points` (int)
- `passed` (boolean) — whether the student passed
- `answers` (jsonb, nullable) — student's answers stored as JSON
- `started_at` (timestamptz)
- `completed_at` (timestamptz, nullable)
- Unique constraint on (exam_id, student_id)

### 6. certificates
- `id` (uuid, PK)
- `school_id` (uuid, FK to schools, CASCADE)
- `student_id` (uuid, FK to students, CASCADE)
- `exam_id` (uuid, FK to exams, nullable, CASCADE) — exam that earned the certificate
- `certificate_number` (text, unique) — unique cert ID for verification
- `license_category` (text) — category certified
- `issued_at` (timestamptz) — issue date
- `status` (text) — 'issued', 'revoked'

### 7. live_classes
- `id` (uuid, PK)
- `school_id` (uuid, FK to schools, CASCADE)
- `class_id` (uuid, FK to classes, nullable, CASCADE)
- `teacher_id` (uuid, FK to teachers, CASCADE)
- `title` (text) — live session title
- `description` (text, nullable)
- `scheduled_at` (timestamptz) — when the live class starts
- `duration_minutes` (int) — planned duration
- `status` (text) — 'scheduled', 'live', 'ended', 'cancelled'
- `meeting_url` (text, nullable) — video call link
- `created_at` (timestamptz)

## Security (RLS)
All tables have RLS enabled with role-based access:
- Super admins: full CRUD across all schools
- School admins: manage their school's academic data
- Teachers: manage their own classes/exams/questions, read and grade results
- Students: read classes they're enrolled in, take exams, view their own results/certificates

## Important Notes
1. `class_enrollments` uses a unique constraint to prevent double-enrollment.
2. `exam_results` uses a unique constraint so each student has one result per exam.
3. `questions.options` is jsonb — stores an array like ["Option A", "Option B", ...].
4. `exam_results.answers` is jsonb — stores student answers for review.
5. `certificates.certificate_number` is unique for verification purposes.
*/

-- ===== CLASSES =====
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  license_category text,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_classes" ON classes;
CREATE POLICY "select_classes" ON classes FOR SELECT
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR school_id = public.current_user_school_id()
  );

DROP POLICY IF EXISTS "insert_classes" ON classes;
CREATE POLICY "insert_classes" ON classes FOR INSERT
  TO authenticated WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() IN ('school_admin', 'teacher') AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "update_classes" ON classes;
CREATE POLICY "update_classes" ON classes FOR UPDATE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() IN ('school_admin', 'teacher') AND school_id = public.current_user_school_id())
  ) WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() IN ('school_admin', 'teacher') AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "delete_classes" ON classes;
CREATE POLICY "delete_classes" ON classes FOR DELETE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

-- ===== CLASS_ENROLLMENTS =====
CREATE TABLE IF NOT EXISTS class_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(class_id, student_id)
);

ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_class_enrollments" ON class_enrollments;
CREATE POLICY "select_class_enrollments" ON class_enrollments FOR SELECT
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_enrollments.class_id
      AND c.school_id = public.current_user_school_id()
    )
  );

DROP POLICY IF EXISTS "insert_class_enrollments" ON class_enrollments;
CREATE POLICY "insert_class_enrollments" ON class_enrollments FOR INSERT
  TO authenticated WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_enrollments.class_id
      AND c.school_id = public.current_user_school_id()
      AND public.current_user_role() IN ('school_admin', 'teacher')
    )
  );

DROP POLICY IF EXISTS "delete_class_enrollments" ON class_enrollments;
CREATE POLICY "delete_class_enrollments" ON class_enrollments FOR DELETE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_enrollments.class_id
      AND c.school_id = public.current_user_school_id()
      AND public.current_user_role() IN ('school_admin', 'teacher')
    )
  );

-- ===== EXAMS =====
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  duration_minutes int NOT NULL DEFAULT 60,
  passing_score int NOT NULL DEFAULT 70,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_exams" ON exams;
CREATE POLICY "select_exams" ON exams FOR SELECT
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR school_id = public.current_user_school_id()
  );

DROP POLICY IF EXISTS "insert_exams" ON exams;
CREATE POLICY "insert_exams" ON exams FOR INSERT
  TO authenticated WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() IN ('school_admin', 'teacher') AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "update_exams" ON exams;
CREATE POLICY "update_exams" ON exams FOR UPDATE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() IN ('school_admin', 'teacher') AND school_id = public.current_user_school_id())
  ) WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() IN ('school_admin', 'teacher') AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "delete_exams" ON exams;
CREATE POLICY "delete_exams" ON exams FOR DELETE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

-- ===== QUESTIONS =====
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options jsonb,
  correct_answer text NOT NULL,
  points int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_questions" ON questions;
CREATE POLICY "select_questions" ON questions FOR SELECT
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = questions.exam_id
      AND e.school_id = public.current_user_school_id()
    )
  );

DROP POLICY IF EXISTS "insert_questions" ON questions;
CREATE POLICY "insert_questions" ON questions FOR INSERT
  TO authenticated WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = questions.exam_id
      AND e.school_id = public.current_user_school_id()
      AND public.current_user_role() IN ('school_admin', 'teacher')
    )
  );

DROP POLICY IF EXISTS "update_questions" ON questions;
CREATE POLICY "update_questions" ON questions FOR UPDATE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = questions.exam_id
      AND e.school_id = public.current_user_school_id()
      AND public.current_user_role() IN ('school_admin', 'teacher')
    )
  ) WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = questions.exam_id
      AND e.school_id = public.current_user_school_id()
      AND public.current_user_role() IN ('school_admin', 'teacher')
    )
  );

DROP POLICY IF EXISTS "delete_questions" ON questions;
CREATE POLICY "delete_questions" ON questions FOR DELETE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = questions.exam_id
      AND e.school_id = public.current_user_school_id()
      AND public.current_user_role() IN ('school_admin', 'teacher')
    )
  );

-- ===== EXAM_RESULTS =====
CREATE TABLE IF NOT EXISTS exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 0,
  total_points int NOT NULL DEFAULT 0,
  earned_points int NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  answers jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(exam_id, student_id)
);

ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_exam_results" ON exam_results;
CREATE POLICY "select_exam_results" ON exam_results FOR SELECT
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_results.exam_id
      AND e.school_id = public.current_user_school_id()
    )
  );

DROP POLICY IF EXISTS "insert_exam_results" ON exam_results;
CREATE POLICY "insert_exam_results" ON exam_results FOR INSERT
  TO authenticated WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_results.exam_id
      AND e.school_id = public.current_user_school_id()
    )
  );

DROP POLICY IF EXISTS "update_exam_results" ON exam_results;
CREATE POLICY "update_exam_results" ON exam_results FOR UPDATE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_results.exam_id
      AND e.school_id = public.current_user_school_id()
      AND public.current_user_role() IN ('school_admin', 'teacher')
    )
  ) WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_results.exam_id
      AND e.school_id = public.current_user_school_id()
    )
  );

DROP POLICY IF EXISTS "delete_exam_results" ON exam_results;
CREATE POLICY "delete_exam_results" ON exam_results FOR DELETE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_results.exam_id
      AND e.school_id = public.current_user_school_id()
    ))
  );

-- ===== CERTIFICATES =====
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE,
  certificate_number text UNIQUE NOT NULL,
  license_category text NOT NULL,
  issued_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'revoked'))
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_certificates" ON certificates;
CREATE POLICY "select_certificates" ON certificates FOR SELECT
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR school_id = public.current_user_school_id()
  );

DROP POLICY IF EXISTS "insert_certificates" ON certificates;
CREATE POLICY "insert_certificates" ON certificates FOR INSERT
  TO authenticated WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() IN ('school_admin', 'teacher') AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "update_certificates" ON certificates;
CREATE POLICY "update_certificates" ON certificates FOR UPDATE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  ) WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "delete_certificates" ON certificates;
CREATE POLICY "delete_certificates" ON certificates FOR DELETE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

-- ===== LIVE_CLASSES =====
CREATE TABLE IF NOT EXISTS live_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  meeting_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE live_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_live_classes" ON live_classes;
CREATE POLICY "select_live_classes" ON live_classes FOR SELECT
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR school_id = public.current_user_school_id()
  );

DROP POLICY IF EXISTS "insert_live_classes" ON live_classes;
CREATE POLICY "insert_live_classes" ON live_classes FOR INSERT
  TO authenticated WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() IN ('school_admin', 'teacher') AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "update_live_classes" ON live_classes;
CREATE POLICY "update_live_classes" ON live_classes FOR UPDATE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() IN ('school_admin', 'teacher') AND school_id = public.current_user_school_id())
  ) WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() IN ('school_admin', 'teacher') AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "delete_live_classes" ON live_classes;
CREATE POLICY "delete_live_classes" ON live_classes FOR DELETE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_exams_school_id ON exams(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_id ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_school_id ON certificates(school_id);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_number ON certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_live_classes_school_id ON live_classes(school_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_status ON live_classes(status);
CREATE INDEX IF NOT EXISTS idx_live_classes_scheduled_at ON live_classes(scheduled_at);

-- ═══════════════════════════════════════════════════════════════
-- 20260803173947_create_subscription_billing_tables.sql
-- ═══════════════════════════════════════════════════════════════

/*
# Subscription & Billing Tables: Plans, Subscriptions, Payments, Notifications

## Overview
Creates the billing and notification tables for the DriveClass platform. Schools subscribe
to plans and make payments. Notifications track platform-wide alerts.

## New Tables

### 1. subscription_plans
- `id` (uuid, PK)
- `name` (text) — 'basic', 'pro', 'enterprise'
- `display_name` (text) — human-readable name
- `price_rwf` (int) — monthly price in Rwandan Francs
- `max_students` (int) — student cap (0 = unlimited)
- `max_teachers` (int) — teacher cap
- `features` (jsonb) — list of features included
- `is_active` (boolean)
- `created_at` (timestamptz)

### 2. subscriptions
- `id` (uuid, PK)
- `school_id` (uuid, FK to schools, CASCADE)
- `plan_id` (uuid, FK to subscription_plans)
- `status` (text) — 'active', 'past_due', 'cancelled', 'expired'
- `billing_cycle` (text) — 'monthly' or 'annual'
- `current_period_start` (timestamptz)
- `current_period_end` (timestamptz)
- `amount_rwf` (int) — amount charged
- `created_at` (timestamptz)

### 3. payments
- `id` (uuid, PK)
- `school_id` (uuid, FK to schools, CASCADE)
- `subscription_id` (uuid, FK to subscriptions, CASCADE)
- `amount_rwf` (int) — payment amount
- `payment_method` (text) — 'momo', 'card', 'bank_transfer'
- `status` (text) — 'pending', 'completed', 'failed'
- `transaction_ref` (text, nullable) — payment provider reference
- `paid_at` (timestamptz, nullable)
- `created_at` (timestamptz)

### 4. notifications
- `id` (uuid, PK)
- `user_id` (uuid, FK to profiles, CASCADE) — recipient
- `title` (text)
- `message` (text)
- `type` (text) — 'info', 'success', 'warning', 'error'
- `is_read` (boolean) — defaults to false
- `created_at` (timestamptz)

## Security (RLS)
- subscription_plans: readable by all authenticated users (public catalog)
- subscriptions: super admins and school admins (own school) can read/manage
- payments: super admins and school admins (own school) can read
- notifications: each user reads/updates only their own notifications

## Important Notes
1. `subscription_plans` is a shared catalog — all authenticated users can read it.
2. `payments.transaction_ref` stores the reference from the payment provider (e.g. MTN MoMo).
3. `notifications` are per-user — each user sees only their own.
*/

-- ===== SUBSCRIPTION_PLANS =====
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL CHECK (name IN ('basic', 'pro', 'enterprise')),
  display_name text NOT NULL,
  price_rwf int NOT NULL DEFAULT 0,
  max_students int NOT NULL DEFAULT 0,
  max_teachers int NOT NULL DEFAULT 0,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_subscription_plans" ON subscription_plans;
CREATE POLICY "select_subscription_plans" ON subscription_plans FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_subscription_plans" ON subscription_plans;
CREATE POLICY "insert_subscription_plans" ON subscription_plans FOR INSERT
  TO authenticated WITH CHECK (public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "update_subscription_plans" ON subscription_plans;
CREATE POLICY "update_subscription_plans" ON subscription_plans FOR UPDATE
  TO authenticated USING (public.current_user_role() = 'super_admin')
  WITH CHECK (public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "delete_subscription_plans" ON subscription_plans;
CREATE POLICY "delete_subscription_plans" ON subscription_plans FOR DELETE
  TO authenticated USING (public.current_user_role() = 'super_admin');

-- ===== SUBSCRIPTIONS =====
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,
  amount_rwf int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_subscriptions" ON subscriptions;
CREATE POLICY "select_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR school_id = public.current_user_school_id()
  );

DROP POLICY IF EXISTS "insert_subscriptions" ON subscriptions;
CREATE POLICY "insert_subscriptions" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "update_subscriptions" ON subscriptions;
CREATE POLICY "update_subscriptions" ON subscriptions FOR UPDATE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  ) WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "delete_subscriptions" ON subscriptions;
CREATE POLICY "delete_subscriptions" ON subscriptions FOR DELETE
  TO authenticated USING (public.current_user_role() = 'super_admin');

-- ===== PAYMENTS =====
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount_rwf int NOT NULL,
  payment_method text NOT NULL DEFAULT 'momo' CHECK (payment_method IN ('momo', 'card', 'bank_transfer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  transaction_ref text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_payments" ON payments;
CREATE POLICY "select_payments" ON payments FOR SELECT
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR school_id = public.current_user_school_id()
  );

DROP POLICY IF EXISTS "insert_payments" ON payments;
CREATE POLICY "insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "update_payments" ON payments;
CREATE POLICY "update_payments" ON payments FOR UPDATE
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  ) WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (public.current_user_role() = 'school_admin' AND school_id = public.current_user_school_id())
  );

DROP POLICY IF EXISTS "delete_payments" ON payments;
CREATE POLICY "delete_payments" ON payments FOR DELETE
  TO authenticated USING (public.current_user_role() = 'super_admin');

-- ===== NOTIFICATIONS =====
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_notifications" ON notifications;
CREATE POLICY "select_notifications" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR public.current_user_role() IN ('super_admin', 'school_admin')
  );

DROP POLICY IF EXISTS "update_notifications" ON notifications;
CREATE POLICY "update_notifications" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_notifications" ON notifications;
CREATE POLICY "delete_notifications" ON notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_subscriptions_school_id ON subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_school_id ON payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ═══════════════════════════════════════════════════════════════
-- 20260807191400_auth_trigger_and_seed_plans.sql
-- ═══════════════════════════════════════════════════════════════

/*
# Auth trigger + reference data

## Overview
1. Auto-create a `profiles` row when a user is created in Supabase Auth.
2. Seed default subscription plans (Basic, Pro, Enterprise).

## Profile creation
Reads user metadata set at signup / admin user creation:
- full_name (required, falls back to email)
- role: super_admin | school_admin | teacher | student (default: student)
- school_id: uuid (optional, null for super_admin)
- phone, avatar_url (optional)

Uses SECURITY DEFINER so the insert bypasses RLS (first profile for a new user).
*/

-- ===== AUTO-CREATE PROFILE ON AUTH SIGNUP =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
  user_role text;
  user_school_id uuid;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  user_role := COALESCE(meta->>'role', 'student');
  IF user_role NOT IN ('super_admin', 'school_admin', 'teacher', 'student') THEN
    user_role := 'student';
  END IF;

  IF meta ? 'school_id' AND meta->>'school_id' IS NOT NULL AND meta->>'school_id' <> '' THEN
    user_school_id := (meta->>'school_id')::uuid;
  ELSE
    user_school_id := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, role, school_id, phone, avatar_url, is_active)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(meta->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    user_role,
    user_school_id,
    NULLIF(trim(meta->>'phone'), ''),
    NULLIF(trim(meta->>'avatar_url'), ''),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    phone = EXCLUDED.phone,
    avatar_url = EXCLUDED.avatar_url;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===== DEFAULT SUBSCRIPTION PLANS =====
INSERT INTO public.subscription_plans (name, display_name, price_rwf, max_students, max_teachers, features, is_active)
VALUES
  (
    'basic',
    'Basic Plan',
    25000,
    50,
    5,
    '["Up to 50 students", "Up to 5 teachers", "Exam management", "Basic reports"]'::jsonb,
    true
  ),
  (
    'pro',
    'Pro Plan',
    75000,
    200,
    15,
    '["Up to 200 students", "Up to 15 teachers", "Live classes", "Certificates", "Advanced reports"]'::jsonb,
    true
  ),
  (
    'enterprise',
    'Enterprise Plan',
    200000,
    0,
    0,
    '["Unlimited students", "Unlimited teachers", "Priority support", "Custom branding", "API access"]'::jsonb,
    true
  )
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price_rwf = EXCLUDED.price_rwf,
  max_students = EXCLUDED.max_students,
  max_teachers = EXCLUDED.max_teachers,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;
