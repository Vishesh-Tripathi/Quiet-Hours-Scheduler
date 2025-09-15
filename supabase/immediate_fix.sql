-- IMMEDIATE FIX: Remove the problematic webhook trigger
-- Run this in your Supabase SQL Editor to fix the insertion issue right now

-- Drop the webhook trigger that's causing the JSON parsing error
DROP TRIGGER IF EXISTS study_blocks_webhook_trigger ON study_blocks;

-- Also drop the problematic function
DROP FUNCTION IF EXISTS notify_study_block_events();

-- Verify the trigger is gone
SELECT 
  'Webhook trigger removed - inserts should work now' as status,
  count(*) as remaining_triggers
FROM information_schema.triggers 
WHERE trigger_name = 'study_blocks_webhook_trigger';