-- FIXED WEBHOOK SOLUTION: Keep email monitoring but fix JSON parsing error
-- This maintains your email reminder functionality while fixing the insert issue

-- Remove the broken webhook function and trigger
DROP TRIGGER IF EXISTS study_blocks_webhook_trigger ON study_blocks;
DROP FUNCTION IF EXISTS notify_study_block_events();

-- Create a robust webhook function that handles JSON properly
CREATE OR REPLACE FUNCTION notify_study_block_events()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  webhook_secret TEXT;
  http_response JSONB;
  should_send_webhook BOOLEAN := TRUE;
BEGIN
  -- Get configuration values (check if they exist)
  BEGIN
    webhook_url := current_setting('app.webhook_url', true);
    webhook_secret := current_setting('app.webhook_secret', true);
  EXCEPTION
    WHEN OTHERS THEN
      webhook_url := NULL;
      webhook_secret := NULL;
  END;
  
  -- Check if webhook is configured
  IF webhook_url IS NULL OR webhook_url = '' OR webhook_url = 'null' THEN
    RAISE NOTICE 'Webhook URL not configured, skipping notification for % operation', TG_OP;
    should_send_webhook := FALSE;
  END IF;

  -- Send webhook only if configured
  IF should_send_webhook THEN
    BEGIN
      -- Use a simpler payload that's less likely to cause JSON issues
      SELECT net.http_post(
        url := webhook_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(webhook_secret, 'no-secret')
        ),
        body := jsonb_build_object(
          'event_type', TG_OP,
          'table', 'study_blocks',
          'user_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id::text ELSE NEW.user_id::text END,
          'record_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
          'mongodb_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.mongodb_id ELSE NEW.mongodb_id END,
          'timestamp', extract(epoch from now())::bigint
        ),
        timeout_milliseconds := 5000
      ) INTO http_response;
      
      RAISE NOTICE 'Webhook sent successfully for % operation on study_blocks', TG_OP;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Critical: Don't let webhook failures break the database operation
        RAISE WARNING 'Webhook failed for % operation but continuing database transaction: %', TG_OP, SQLERRM;
    END;
  END IF;

  -- Always return the appropriate record to continue the operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ language 'plpgsql';

-- Create the trigger with the fixed function
CREATE TRIGGER study_blocks_webhook_trigger
  AFTER INSERT OR UPDATE OR DELETE ON study_blocks
  FOR EACH ROW
  EXECUTE FUNCTION notify_study_block_events();

-- Set up basic webhook configuration (you can change these URLs)
-- For local development:
SELECT set_config('app.webhook_url', 'http://localhost:3000/api/webhooks/supabase', false);
SELECT set_config('app.webhook_secret', 'my-secure-webhook-secret-2025-xyz789', false);

-- Verify the setup
SELECT 
  'Webhook function fixed and enabled' as status,
  current_setting('app.webhook_url', true) as webhook_url,
  CASE 
    WHEN current_setting('app.webhook_secret', true) IS NOT NULL 
    THEN 'Secret configured' 
    ELSE 'No secret set' 
  END as webhook_secret_status;