-- Test script to verify Supabase study block creation works
-- Run this in your Supabase SQL Editor after applying the fixes

-- First, let's check if the webhook trigger is currently enabled
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'study_blocks_webhook_trigger' 
  AND event_object_table = 'study_blocks';

-- Check current webhook configuration
SELECT 
  current_setting('app.webhook_url', true) as webhook_url,
  current_setting('app.webhook_secret', true) as webhook_secret;

-- Test inserting a study block directly (replace with a valid user_id from your auth.users table)
-- You'll need to replace 'YOUR_USER_ID_HERE' with an actual UUID from your auth.users table
/*
INSERT INTO study_blocks (
  user_id, 
  mongodb_id, 
  title, 
  start_time, 
  end_time
) VALUES (
  'YOUR_USER_ID_HERE'::UUID,
  'test_mongodb_id_' || extract(epoch from now()),
  'Test Study Block',
  now() + interval '1 hour',
  now() + interval '2 hours'
);
*/

-- Check if the insert was successful
-- SELECT * FROM study_blocks WHERE title = 'Test Study Block' ORDER BY created_at DESC LIMIT 1;