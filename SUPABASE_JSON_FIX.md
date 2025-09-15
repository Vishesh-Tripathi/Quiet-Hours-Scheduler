# Fix for Supabase JSON Parsing Error

## Problem
When creating study blocks, you're encountering a Supabase error:
```
Error: {
  code: '22P02',
  details: 'Token ""}" is invalid.',
  hint: null,
  message: 'invalid input syntax for type json'
}
```

## Root Cause
The error is caused by the webhook trigger function `notify_study_block_events()` that's trying to create JSON payloads for webhook notifications. The `row_to_json()` function in the original implementation can sometimes create malformed JSON, especially when dealing with special characters or null values.

## Solution Steps

### Step 1: Immediate Fix - Disable Webhook Trigger
Run the SQL script `supabase/disable_webhook_trigger.sql` in your Supabase SQL Editor:

```sql
-- Disable the webhook trigger temporarily
DROP TRIGGER IF EXISTS study_blocks_webhook_trigger ON study_blocks;
```

This will immediately resolve the insertion error and allow study blocks to be created normally.

### Step 2: Apply the Fixed Webhook Function
Run the SQL script `supabase/fixed_webhook_setup.sql` in your Supabase SQL Editor. This script:

1. **Replaces the problematic webhook function** with a more robust version that uses `jsonb_build_object()` instead of `row_to_json()`
2. **Adds proper error handling** so webhook failures don't break the database operation
3. **Sanitizes data** to prevent JSON parsing issues
4. **Uses JSONB** instead of JSON for better performance and safety

### Step 3: Verify the Fix
1. Run the test script `supabase/test_study_block_creation.sql` to verify everything is working
2. Try creating a study block through your application
3. Check the Supabase logs to ensure webhooks are working properly

## Technical Details

### What Changed in the Code

#### 1. Improved Supabase Service Error Handling
- Added input validation
- Sanitized title data to remove control characters
- Added detailed error logging with specific error code handling
- Better error categorization (JSON parsing, duplicates, foreign key violations)

#### 2. Fixed Webhook Function
- Replaced `row_to_json()` with `jsonb_build_object()` for safer JSON construction
- Added proper null handling
- Wrapped JSON operations in try-catch blocks
- Added timeout handling for webhook requests
- Ensured webhook failures don't break the main database transaction

#### 3. Better Error Recovery
- Webhook errors are now logged as warnings instead of failing the transaction
- The application continues to work even if webhooks are down
- MongoDB remains the primary data store with Supabase as supplementary

## Prevention

To prevent similar issues in the future:

1. **Always use `jsonb_build_object()`** instead of `row_to_json()` in PostgreSQL functions
2. **Wrap webhook operations in exception handlers** so they don't break core functionality
3. **Sanitize user input** before storing in the database
4. **Test webhook functions thoroughly** before deploying to production

## Rollback Plan

If you need to rollback these changes:

1. Run the original webhook setup from `supabase/setup_webhooks.sql`
2. The improved error handling in the Supabase service can remain as it's backward compatible

## Monitoring

After applying the fix, monitor:

1. **Supabase logs** for any webhook-related warnings
2. **Application logs** for successful study block creation
3. **Database performance** to ensure the new webhook function doesn't cause slowdowns

## Files Modified

- `src/lib/supabase-admin.ts` - Enhanced error handling and input validation
- `supabase/disable_webhook_trigger.sql` - Temporary fix script
- `supabase/fixed_webhook_setup.sql` - Permanent webhook fix
- `supabase/test_study_block_creation.sql` - Verification script