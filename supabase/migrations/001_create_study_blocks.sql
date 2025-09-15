-- Create study_blocks table in Supabase
CREATE TABLE study_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mongodb_id TEXT, -- Reference to MongoDB document
  title TEXT NOT NULL CHECK (char_length(title) <= 200),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL CHECK (end_time > start_time),
  reminder_sent BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX study_blocks_user_id_idx ON study_blocks(user_id);
CREATE INDEX study_blocks_start_time_idx ON study_blocks(start_time);
CREATE INDEX study_blocks_reminder_sent_idx ON study_blocks(reminder_sent);
CREATE INDEX study_blocks_is_active_idx ON study_blocks(is_active);
CREATE INDEX study_blocks_mongodb_id_idx ON study_blocks(mongodb_id);

-- Compound index for cron job queries
CREATE INDEX study_blocks_cron_idx ON study_blocks(start_time, reminder_sent, is_active);

-- Index for overlap detection
CREATE INDEX study_blocks_overlap_idx ON study_blocks(user_id, start_time, end_time, is_active);

-- Enable Row Level Security
ALTER TABLE study_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own study blocks
CREATE POLICY "Users can view own study blocks" ON study_blocks
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own study blocks
CREATE POLICY "Users can insert own study blocks" ON study_blocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own study blocks
CREATE POLICY "Users can update own study blocks" ON study_blocks
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own study blocks
CREATE POLICY "Users can delete own study blocks" ON study_blocks
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_study_blocks_updated_at 
  BEFORE UPDATE ON study_blocks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check for overlapping blocks
CREATE OR REPLACE FUNCTION check_study_block_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for overlapping blocks for the same user
  IF EXISTS (
    SELECT 1 FROM study_blocks 
    WHERE user_id = NEW.user_id 
      AND is_active = TRUE
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND (
        -- New block starts during existing block
        (start_time <= NEW.start_time AND end_time > NEW.start_time) OR
        -- New block ends during existing block  
        (start_time < NEW.end_time AND end_time >= NEW.end_time) OR
        -- New block completely contains existing block
        (start_time >= NEW.start_time AND end_time <= NEW.end_time) OR
        -- Existing block completely contains new block
        (start_time <= NEW.start_time AND end_time >= NEW.end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Study block overlaps with existing block';
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to prevent overlapping blocks
CREATE TRIGGER check_study_block_overlap_trigger
  BEFORE INSERT OR UPDATE ON study_blocks
  FOR EACH ROW
  EXECUTE FUNCTION check_study_block_overlap();

-- Function for webhook notifications
CREATE OR REPLACE FUNCTION notify_study_block_events()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  -- Create payload for webhook
  IF TG_OP = 'DELETE' THEN
    payload = json_build_object(
      'event_type', 'DELETE',
      'table', 'study_blocks',
      'record', row_to_json(OLD),
      'old_record', row_to_json(OLD),
      'timestamp', extract(epoch from now())
    );
  ELSE
    payload = json_build_object(
      'event_type', TG_OP,
      'table', 'study_blocks', 
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
      'timestamp', extract(epoch from now())
    );
  END IF;

  -- Send webhook notification (requires supabase_hooks extension)
  PERFORM net.http_post(
    url := current_setting('app.webhook_url', true),
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.webhook_secret', true) || '"}'::jsonb,
    body := payload::jsonb
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ language 'plpgsql';

-- Triggers for webhook notifications
CREATE TRIGGER study_blocks_webhook_trigger
  AFTER INSERT OR UPDATE OR DELETE ON study_blocks
  FOR EACH ROW
  EXECUTE FUNCTION notify_study_block_events();