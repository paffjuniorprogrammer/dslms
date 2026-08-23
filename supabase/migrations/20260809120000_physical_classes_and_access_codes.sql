-- =============================================================================
-- Migration: 20260809120000_physical_classes_and_access_codes.sql
-- Purpose:   Extend live_classes for physical classroom support.
--            Add class_type to distinguish online vs physical classes.
--            Add access_code as the PHYS-xxxx / LC-xxxx teacher-shared code.
--            Add room column for physical classroom location.
--            Add max_students to limit class capacity.
-- =============================================================================

-- 1. Add class_type column to live_classes
ALTER TABLE live_classes
  ADD COLUMN IF NOT EXISTS class_type text NOT NULL DEFAULT 'online'
  CHECK (class_type IN ('online', 'physical'));

-- 2. Add access_code column (replaces meeting_url for non-video classes)
ALTER TABLE live_classes
  ADD COLUMN IF NOT EXISTS access_code text UNIQUE;

-- 3. Add room column for physical classrooms
ALTER TABLE live_classes
  ADD COLUMN IF NOT EXISTS room text;

-- 4. Add max_students capacity column
ALTER TABLE live_classes
  ADD COLUMN IF NOT EXISTS max_students int NOT NULL DEFAULT 50;

-- 5. Create physical_class_results table to track student test submissions
--    from physical classroom sessions (distinct from online exam results)
CREATE TABLE IF NOT EXISTS physical_class_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
  school_id       uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id      uuid REFERENCES students(id) ON DELETE SET NULL,
  student_name    text NOT NULL,
  nin             text,
  score           int NOT NULL DEFAULT 0,
  total_questions int NOT NULL DEFAULT 20,
  correct_count   int NOT NULL DEFAULT 0,
  wrong_count     int NOT NULL DEFAULT 0,
  time_used_secs  int,
  passed          boolean NOT NULL DEFAULT false,
  answers         jsonb,
  submitted_at    timestamptz DEFAULT now()
);

-- 6. Enable RLS on physical_class_results
ALTER TABLE physical_class_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_physical_results" ON physical_class_results;
CREATE POLICY "select_physical_results" ON physical_class_results FOR SELECT
  TO authenticated USING (
    public.current_user_role() = 'super_admin'
    OR school_id = public.current_user_school_id()
  );

DROP POLICY IF EXISTS "insert_physical_results" ON physical_class_results;
CREATE POLICY "insert_physical_results" ON physical_class_results FOR INSERT
  TO authenticated WITH CHECK (
    school_id = public.current_user_school_id()
    OR public.current_user_role() = 'super_admin'
  );

-- Allow anonymous (student portal) insert — students submit their results
-- without being authenticated (they just have an access code)
DROP POLICY IF EXISTS "anon_insert_physical_results" ON physical_class_results;
CREATE POLICY "anon_insert_physical_results" ON physical_class_results FOR INSERT
  TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_physical_results" ON physical_class_results;
CREATE POLICY "anon_select_physical_results" ON physical_class_results FOR SELECT
  TO anon USING (true);

-- Allow anonymous SELECT on live_classes so students can look up their session code
DROP POLICY IF EXISTS "anon_select_live_classes" ON live_classes;
CREATE POLICY "anon_select_live_classes" ON live_classes FOR SELECT
  TO anon USING (true);

-- Allow anonymous SELECT on questions so student portal can display the test
DROP POLICY IF EXISTS "anon_select_questions" ON questions;
CREATE POLICY "anon_select_questions" ON questions FOR SELECT
  TO anon USING (status = 'active');

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_live_classes_access_code ON live_classes(access_code);
CREATE INDEX IF NOT EXISTS idx_live_classes_class_type  ON live_classes(class_type);
CREATE INDEX IF NOT EXISTS idx_physical_results_session ON physical_class_results(session_id);
CREATE INDEX IF NOT EXISTS idx_physical_results_school  ON physical_class_results(school_id);
