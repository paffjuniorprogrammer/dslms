-- =============================================================================
-- Migration: 20260813140000_make_live_classes_teacher_id_nullable.sql
-- Purpose:   Allow live_classes.teacher_id to be nullable so school admins
--            and platform admins can schedule and manage sessions.
-- =============================================================================

ALTER TABLE public.live_classes
  ALTER COLUMN teacher_id DROP NOT NULL;
