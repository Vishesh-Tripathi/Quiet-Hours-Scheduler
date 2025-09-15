-- Temporary fix: Disable the webhook trigger to allow inserts to work
-- This should be run in your Supabase SQL Editor

-- Disable the webhook trigger temporarily
DROP TRIGGER IF EXISTS study_blocks_webhook_trigger ON study_blocks;

-- Add a notice that the trigger has been disabled
SELECT 'Webhook trigger has been disabled temporarily to fix JSON parsing issue' as status;