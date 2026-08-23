-- ═══════════════════════════════════════════════════════════════
-- 20260808195600_platform_question_bank.sql
-- ═══════════════════════════════════════════════════════════════
--
-- PURPOSE
-- -------
-- The driving theory question bank is platform-wide: super admin
-- creates questions that are visible to ALL schools.  Exams are
-- per-school and may reference platform questions OR have their
-- own inline questions.
--
-- CHANGES
-- -------
-- 1. Drop NOT NULL constraint on questions.exam_id
--    (platform questions have no exam association)
-- 2. Add questions.school_id (nullable)
--    NULL  → platform question (super admin, all schools read it)
--    UUID  → school-specific question (only that school can see it)
-- 3. Add questions.category  (text) – e.g. 'Traffic Signs'
-- 4. Add questions.difficulty (text) – 'easy', 'medium', 'hard'
-- 5. Add questions.language   (text) – 'en', 'rw', 'fr'
-- 6. Add questions.status     (text) – 'active', 'draft'
-- 7. Update RLS on questions to allow:
--    - super admin: full CRUD on all questions
--    - school roles: read platform questions + CRUD own-school questions
-- ═══════════════════════════════════════════════════════════════

-- 1. Make exam_id nullable (platform questions have no exam)
ALTER TABLE questions
  ALTER COLUMN exam_id DROP NOT NULL;

-- 2. school_id (nullable → NULL means platform-wide)
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id) ON DELETE CASCADE;

-- 3-6. Extra metadata columns
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS category   text,
  ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'medium'
    CHECK (difficulty IN ('easy', 'medium', 'hard')),
  ADD COLUMN IF NOT EXISTS language   text DEFAULT 'en'
    CHECK (language   IN ('en', 'rw', 'fr')),
  ADD COLUMN IF NOT EXISTS status     text NOT NULL DEFAULT 'active'
    CHECK (status     IN ('active', 'draft')),
  ADD COLUMN IF NOT EXISTS explanation text,
  ADD COLUMN IF NOT EXISTS times_asked int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS correct_rate int NOT NULL DEFAULT 0;

-- ── Index helpers ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_questions_school_id ON questions(school_id);
CREATE INDEX IF NOT EXISTS idx_questions_category  ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_status    ON questions(status);

-- ── Drop old RLS policies ────────────────────────────────────────
DROP POLICY IF EXISTS "select_questions" ON questions;
DROP POLICY IF EXISTS "insert_questions" ON questions;
DROP POLICY IF EXISTS "update_questions" ON questions;
DROP POLICY IF EXISTS "delete_questions" ON questions;

-- ── New RLS: SELECT ──────────────────────────────────────────────
-- Everyone authenticated can read:
--   • platform questions (school_id IS NULL)
--   • questions belonging to their own school
CREATE POLICY "select_questions" ON questions FOR SELECT
  TO authenticated
  USING (
    school_id IS NULL                            -- platform-wide
    OR school_id = public.current_user_school_id() -- own school
    OR public.current_user_role() = 'super_admin'
  );

-- ── New RLS: INSERT ──────────────────────────────────────────────
-- super_admin  → can create platform questions (school_id NULL) or any
-- school roles → can only create questions for their own school
CREATE POLICY "insert_questions" ON questions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (
      public.current_user_role() IN ('school_admin', 'teacher')
      AND school_id = public.current_user_school_id()
    )
  );

-- ── New RLS: UPDATE ──────────────────────────────────────────────
CREATE POLICY "update_questions" ON questions FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'super_admin'
    OR (
      public.current_user_role() IN ('school_admin', 'teacher')
      AND school_id = public.current_user_school_id()
    )
  )
  WITH CHECK (
    public.current_user_role() = 'super_admin'
    OR (
      public.current_user_role() IN ('school_admin', 'teacher')
      AND school_id = public.current_user_school_id()
    )
  );

-- ── New RLS: DELETE ──────────────────────────────────────────────
CREATE POLICY "delete_questions" ON questions FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() = 'super_admin'
    OR (
      public.current_user_role() IN ('school_admin', 'teacher')
      AND school_id = public.current_user_school_id()
    )
  );
