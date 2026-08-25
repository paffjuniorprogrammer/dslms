-- Publish live-class lifecycle changes so teacher and student rooms share
-- the same database-backed session status.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.live_classes;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
