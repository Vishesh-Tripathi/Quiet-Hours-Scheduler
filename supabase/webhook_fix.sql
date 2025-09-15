-- PROPER FIX: Replace the broken webhook function with a working one
-- Only use this if you actually need webhook notifications

-- Remove the broken function and trigger
DROP TRIGGER IF EXISTS study_blocks_webhook_trigger ON study_blocks;
DROP FUNCTION IF EXISTS notify_study_block_events();

-- Create a robust webhook function that won't break JSON parsing
CREATE OR REPLACE FUNCTION notify_study_block_events()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  webhook_secret TEXT;
BEGIN
  -- Get configuration values
  webhook_url := current_setting('app.webhook_url', true);
  webhook_secret := current_setting('app.webhook_secret', true);
  
  -- Skip webhook if not configured (prevents errors)
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RAISE NOTICE 'Webhook URL not configured, skipping notification';
    GOTO skip_webhook;
  END IF;

  -- Send webhook with proper error handling that won't break the insert
  BEGIN
    PERFORM net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(webhook_secret, '')
      ),
      body := jsonb_build_object(
        'event_type', TG_OP,
        'table', 'study_blocks',
        'user_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END,
        'record_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        'timestamp', extract(epoch from now())
      ),
      timeout_milliseconds := 3000
    );
    
    RAISE NOTICE 'Webhook sent for % operation', TG_OP;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the transaction
      RAISE WARNING 'Webhook failed but continuing with database operation: %', SQLERRM;
  END;

  <<skip_webhook>>
  -- Always return the record to continue the operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ language 'plpgsql';

-- Only recreate the trigger if you actually need webhooks
-- Uncomment the next 4 lines if you want to enable webhooks:
-- CREATE TRIGGER study_blocks_webhook_trigger
--   AFTER INSERT OR UPDATE OR DELETE ON study_blocks
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_study_block_events();

SELECT 'Webhook function fixed - trigger not enabled yet' as status;