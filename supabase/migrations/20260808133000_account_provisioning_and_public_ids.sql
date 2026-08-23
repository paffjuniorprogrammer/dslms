-- Secure account provisioning and school-scoped, human-readable identifiers.
-- UUID primary keys remain internal; public_id is the value shown to people.

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS school_code text UNIQUE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS public_id text UNIQUE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS public_id text UNIQUE;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS public_id text UNIQUE;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS public_id text UNIQUE;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS public_id text UNIQUE;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS public_id text UNIQUE;

CREATE TABLE IF NOT EXISTS public.school_id_counters (
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  entity text NOT NULL,
  last_value integer NOT NULL DEFAULT 0,
  PRIMARY KEY (school_id, entity)
);

CREATE SEQUENCE IF NOT EXISTS public.school_code_sequence START 1;

CREATE OR REPLACE FUNCTION public.next_school_public_number(p_school_id uuid, p_entity text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_value integer;
BEGIN
  INSERT INTO public.school_id_counters (school_id, entity, last_value)
  VALUES (p_school_id, p_entity, 1)
  ON CONFLICT (school_id, entity)
  DO UPDATE SET last_value = public.school_id_counters.last_value + 1
  RETURNING last_value INTO v_value;
  RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_human_readable_ids()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_code text;
  v_number integer;
BEGIN
  IF TG_TABLE_NAME = 'schools' THEN
    IF NEW.school_code IS NULL THEN
      NEW.school_code := 'DSLMS-' || lpad(nextval('public.school_code_sequence')::text, 5, '0');
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.public_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'profiles' THEN
    IF NEW.school_id IS NULL THEN
      NEW.public_id := 'USR-PLATFORM-' || lpad(nextval('public.school_code_sequence')::text, 5, '0');
      RETURN NEW;
    END IF;
    SELECT school_code INTO v_school_code FROM public.schools WHERE id = NEW.school_id;
    v_number := public.next_school_public_number(NEW.school_id, 'profile');
    NEW.public_id := 'USR-' || v_school_code || '-' || lpad(v_number::text, 5, '0');
    RETURN NEW;
  END IF;

  SELECT school_code INTO v_school_code FROM public.schools WHERE id = NEW.school_id;
  v_number := public.next_school_public_number(NEW.school_id, TG_TABLE_NAME);
  NEW.public_id := upper(left(TG_TABLE_NAME, 3)) || '-' || v_school_code || '-' || lpad(v_number::text, 5, '0');
  RETURN NEW;
END;
$$;

-- Existing schools receive a code before any new account is provisioned.
UPDATE public.schools
SET school_code = 'DSLMS-' || lpad(nextval('public.school_code_sequence')::text, 5, '0')
WHERE school_code IS NULL;

DROP TRIGGER IF EXISTS set_school_public_id ON public.schools;
CREATE TRIGGER set_school_public_id BEFORE INSERT ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.assign_human_readable_ids();

DROP TRIGGER IF EXISTS set_profile_public_id ON public.profiles;
CREATE TRIGGER set_profile_public_id BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_human_readable_ids();

DROP TRIGGER IF EXISTS set_teacher_public_id ON public.teachers;
CREATE TRIGGER set_teacher_public_id BEFORE INSERT ON public.teachers
FOR EACH ROW EXECUTE FUNCTION public.assign_human_readable_ids();

DROP TRIGGER IF EXISTS set_student_public_id ON public.students;
CREATE TRIGGER set_student_public_id BEFORE INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION public.assign_human_readable_ids();

DROP TRIGGER IF EXISTS set_class_public_id ON public.classes;
CREATE TRIGGER set_class_public_id BEFORE INSERT ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.assign_human_readable_ids();

DROP TRIGGER IF EXISTS set_exam_public_id ON public.exams;
CREATE TRIGGER set_exam_public_id BEFORE INSERT ON public.exams
FOR EACH ROW EXECUTE FUNCTION public.assign_human_readable_ids();

DROP TRIGGER IF EXISTS set_certificate_public_id ON public.certificates;
CREATE TRIGGER set_certificate_public_id BEFORE INSERT ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.assign_human_readable_ids();

DROP TRIGGER IF EXISTS set_live_class_public_id ON public.live_classes;
CREATE TRIGGER set_live_class_public_id BEFORE INSERT ON public.live_classes
FOR EACH ROW EXECUTE FUNCTION public.assign_human_readable_ids();

-- New accounts created by an administrator must change their temporary password.
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
  IF user_role NOT IN ('super_admin', 'school_admin', 'teacher', 'student') THEN user_role := 'student'; END IF;
  user_school_id := NULLIF(meta->>'school_id', '')::uuid;

  INSERT INTO public.profiles (id, full_name, role, school_id, phone, avatar_url, is_active, must_change_password)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(meta->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    user_role, user_school_id, NULLIF(trim(meta->>'phone'), ''), NULLIF(trim(meta->>'avatar_url'), ''), true,
    COALESCE((meta->>'must_change_password')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
