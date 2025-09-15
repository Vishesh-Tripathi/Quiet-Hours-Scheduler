-- Fixed webhook setup with proper JSON handling
-- This script replaces the problematic webhook function with a more robust version

-- Drop the existing function
DROP FUNCTION IF EXISTS notify_study_block_events();

-- Create a more robust webhook function with better JSON handling
CREATE OR REPLACE FUNCTION notify_study_block_events()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  webhook_url TEXT;
  webhook_secret TEXT;
  record_json JSONB;
  old_record_json JSONB;
BEGIN
  -- Get configuration values
  webhook_url := current_setting('app.webhook_url', true);
  webhook_secret := current_setting('app.webhook_secret', true);
  
  -- Skip if webhook not configured
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RAISE NOTICE 'Webhook URL not configured, skipping notification';
    GOTO skip_webhook;
  END IF;

  -- Safely convert records to JSON with proper null handling
  BEGIN
    IF TG_OP != 'DELETE' THEN
      record_json := jsonb_build_object(
        'id', NEW.id,
        'user_id', NEW.user_id,
        'mongodb_id', NEW.mongodb_id,
        'title', NEW.title,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'reminder_sent', NEW.reminder_sent,
        'is_active', NEW.is_active,
        'created_at', NEW.created_at,
        'updated_at', NEW.updated_at
      );
    END IF;

    IF TG_OP = 'UPDATE' THEN
      old_record_json := jsonb_build_object(
        'id', OLD.id,
        'user_id', OLD.user_id,
        'mongodb_id', OLD.mongodb_id,
        'title', OLD.title,
        'start_time', OLD.start_time,
        'end_time', OLD.end_time,
        'reminder_sent', OLD.reminder_sent,
        'is_active', OLD.is_active,
        'created_at', OLD.created_at,
        'updated_at', OLD.updated_at
      );
    ELSIF TG_OP = 'DELETE' THEN
      old_record_json := jsonb_build_object(
        'id', OLD.id,
        'user_id', OLD.user_id,
        'mongodb_id', OLD.mongodb_id,
        'title', OLD.title,
        'start_time', OLD.start_time,
        'end_time', OLD.end_time,
        'reminder_sent', OLD.reminder_sent,
        'is_active', OLD.is_active,
        'created_at', OLD.created_at,
        'updated_at', OLD.updated_at
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to construct JSON records: %', SQLERRM;
      GOTO skip_webhook;
  END;

  -- Create payload for webhook using jsonb_build_object for safety
  BEGIN
    payload := jsonb_build_object(
      'event_type', TG_OP,
      'table', 'study_blocks',
      'record', CASE WHEN TG_OP != 'DELETE' THEN record_json ELSE NULL END,
      'old_record', old_record_json,
      'timestamp', extract(epoch from now())
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to construct webhook payload: %', SQLERRM;
      GOTO skip_webhook;
  END;

  -- Send webhook using pg_net with proper error handling
  BEGIN
    PERFORM net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(webhook_secret, '')
      ),
      body := payload,
      timeout_milliseconds := 5000
    );
    
    RAISE NOTICE 'Webhook sent successfully for % operation on study_blocks', TG_OP;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to send webhook for % operation: %', TG_OP, SQLERRM;
      -- Don't fail the transaction, just log the error
  END;

  <<skip_webhook>>
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ language 'plpgsql';

-- Recreate the trigger with the fixed function
CREATE TRIGGER study_blocks_webhook_trigger
  AFTER INSERT OR UPDATE OR DELETE ON study_blocks
  FOR EACH ROW
  EXECUTE FUNCTION notify_study_block_events();

-- Test the configuration
SELECT 
  current_setting('app.webhook_url', true) as webhook_url,
  current_setting('app.webhook_secret', true) as webhook_secret,
  'Webhook function updated with improved JSON handling' as status;