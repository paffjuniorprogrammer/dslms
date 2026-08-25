-- Allow all live-class participant roles to be persisted in chat.
-- The original migration only allowed host/student, while authenticated
-- teacher and administrator rooms send their actual role values.

ALTER TABLE live_class_messages
  DROP CONSTRAINT IF EXISTS live_class_messages_sender_role_check;

ALTER TABLE live_class_messages
  ADD CONSTRAINT live_class_messages_sender_role_check
  CHECK (sender_role IN ('host', 'teacher', 'school_admin', 'super_admin', 'student'));
