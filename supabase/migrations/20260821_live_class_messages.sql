-- Migration: Create live_class_messages table
-- Run this in your Supabase SQL editor or add to your migrations folder

CREATE TABLE IF NOT EXISTS live_class_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
  sender_id   text NOT NULL,
  sender_name text NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('host', 'student')),
  message     text NOT NULL,
  pinned      boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_class_messages_class_id ON live_class_messages(class_id);
CREATE INDEX IF NOT EXISTS idx_live_class_messages_created_at ON live_class_messages(created_at);

-- Enable Row Level Security
ALTER TABLE live_class_messages ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read messages
CREATE POLICY "authenticated_can_read_messages"
  ON live_class_messages FOR SELECT
  USING (auth.role() = 'authenticated');

-- Any authenticated user can insert messages
CREATE POLICY "authenticated_can_insert_messages"
  ON live_class_messages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can delete their own messages; hosts can delete any (handled app-side)
CREATE POLICY "authenticated_can_delete_own_messages"
  ON live_class_messages FOR DELETE
  USING (auth.role() = 'authenticated');

-- Update (for pinning)
CREATE POLICY "authenticated_can_update_messages"
  ON live_class_messages FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Enable Realtime on this table
ALTER PUBLICATION supabase_realtime ADD TABLE live_class_messages;
