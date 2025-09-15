-- Configuration script for Supabase webhooks
-- This needs to be run in your Supabase SQL Editor

-- Set the webhook URL and secret (replace with your actual values)
-- For local development: http://localhost:3000/api/webhooks/supabase
-- For production: https://yourdomain.com/api/webhooks/supabase
SELECT set_config('app.webhook_url', 'http://localhost:3000/api/webhooks/supabase', false);
SELECT set_config('app.webhook_secret', 'my-secure-webhook-secret-2025', false);

-- Enable the http extension for webhooks (if not already enabled)
-- This might need to be done by a Supabase admin
-- CREATE EXTENSION IF NOT EXISTS http;

-- Alternative approach: Update the webhook function to use pg_net
-- (pg_net is available by default in Supabase)

DROP FUNCTION IF EXISTS notify_study_block_events();

CREATE OR REPLACE FUNCTION notify_study_block_events()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
  webhook_url TEXT;
  webhook_secret TEXT;
BEGIN
  -- Get configuration values
  webhook_url := current_setting('app.webhook_url', true);
  webhook_secret := current_setting('app.webhook_secret', true);
  
  -- Skip if webhook not configured
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RAISE NOTICE 'Webhook URL not configured, skipping notification';
    GOTO skip_webhook;
  END IF;

  -- Create payload for webhook
  IF TG_OP = 'DELETE' THEN
    payload = json_build_object(
      'event_type', 'DELETE',
      'table', 'study_blocks',
      'record', NULL,
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

  -- Send webhook using pg_net (Supabase's HTTP client)
  BEGIN
    PERFORM net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(webhook_secret, '')
      ),
      body := payload::jsonb,
      timeout_milliseconds := 5000
    );
    
    RAISE NOTICE 'Webhook sent successfully for % operation on study_blocks', TG_OP;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to send webhook: %', SQLERRM;
  END;

  <<skip_webhook>>
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ language 'plpgsql';

-- Recreate the trigger
DROP TRIGGER IF EXISTS study_blocks_webhook_trigger ON study_blocks;

CREATE TRIGGER study_blocks_webhook_trigger
  AFTER INSERT OR UPDATE OR DELETE ON study_blocks
  FOR EACH ROW
  EXECUTE FUNCTION notify_study_block_events();

-- Test the configuration
SELECT 
  current_setting('app.webhook_url', true) as webhook_url,
  current_setting('app.webhook_secret', true) as webhook_secret;