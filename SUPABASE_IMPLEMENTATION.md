# Supabase Row-Level Events Implementation

This implementation adds Supabase row-level security and database events alongside the existing MongoDB storage, creating a hybrid dual-storage system.

## Setup Instructions

### 1. Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Existing variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
MONGODB_URI=your_mongodb_connection_string

# New variables for webhooks
SUPABASE_WEBHOOK_SECRET=your-secure-webhook-secret-here
```

### 2. Supabase Database Setup

1. **Run the main migration:**
   - Copy the contents of `supabase/migrations/001_create_study_blocks.sql`
   - Run it in your Supabase SQL Editor

2. **Configure webhooks:**
   - Copy the contents of `supabase/setup_webhooks.sql`
   - Update the webhook URL (localhost:3000 for dev, your domain for production)
   - Update the webhook secret to match your environment variable
   - Run it in your Supabase SQL Editor

### 3. Features Implemented

#### ✅ Row-Level Security (RLS)
- Users can only see/modify their own study blocks
- Proper RLS policies for SELECT, INSERT, UPDATE, DELETE
- Authenticated access required for all operations

#### ✅ Database Events & Triggers
- Automatic timestamp updates (`updated_at`)
- Overlap prevention at database level
- Webhook notifications for all CRUD operations
- Job monitoring and logging

#### ✅ Dual Storage System
- **Primary Storage**: MongoDB (existing logic preserved)
- **Secondary Storage**: Supabase (for RLS and events)
- Automatic synchronization between both systems
- Graceful degradation if either system fails

### 4. How It Works

#### Creating Study Blocks:
1. User submits form → Next.js API
2. Validates and creates in MongoDB (primary)
3. Also creates in Supabase (secondary)
4. Supabase triggers fire → webhook notification
5. Webhook logs the event and maintains sync

#### Updating Study Blocks:
1. API updates MongoDB first
2. Then updates Supabase
3. Webhook captures the change event
4. Sync maintained between systems

#### CRON Email System:
1. Reads from MongoDB (primary source)
2. Sends emails as before
3. Updates reminder status in both systems
4. Webhook captures reminder status changes

### 5. Webhook Events

The system captures these events from Supabase:

- **INSERT**: New study block created
- **UPDATE**: Study block modified (title, time, reminder status, etc.)
- **DELETE**: Study block removed

All events include:
- Event type and timestamp
- Full record data (new and old)
- User information
- MongoDB reference ID

### 6. Testing the Implementation

#### Test 1: Basic CRUD Operations
```bash
# Create a study block via API
curl -X POST http://localhost:3000/api/blocks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Study Session",
    "startTime": "2025-09-16T10:00:00Z",
    "endTime": "2025-09-16T11:00:00Z"
  }'
```

#### Test 2: Webhook Functionality
1. Check webhook endpoint health: `GET /api/webhooks/supabase`
2. Create/update/delete via Supabase dashboard
3. Monitor webhook logs in your application

#### Test 3: Row-Level Security
1. Try accessing another user's study blocks
2. Verify RLS prevents unauthorized access
3. Test with different authenticated users

### 7. Architecture Benefits

- **Redundancy**: Data exists in both systems
- **Performance**: MongoDB for app operations, Supabase for admin queries
- **Security**: RLS enforced at database level
- **Monitoring**: Real-time events via webhooks
- **Flexibility**: Can query either system as needed

### 8. Migration Notes

- Existing MongoDB logic is **completely preserved**
- No breaking changes to current functionality
- Supabase integration is additive only
- System degrades gracefully if Supabase is unavailable

### 9. Monitoring & Debugging

Check these locations for logs:
- Application logs: MongoDB operations
- Supabase logs: RLS policy enforcement, trigger execution
- Webhook logs: Event processing and sync status
- Network logs: Webhook delivery success/failure

### 10. Production Deployment

1. Update webhook URL in Supabase to production domain
2. Set strong webhook secret in production environment
3. Monitor webhook delivery and error rates
4. Set up alerts for sync failures between systems

## Summary

✅ **All Requirements Now Met:**
1. ✅ Supabase Authentication
2. ✅ MongoDB Data Storage  
3. ✅ CRON Email Functionality
4. ✅ No CRON Overlap Protection
5. ✅ Authenticated Block Creation
6. ✅ **Supabase Row-Level Events** (NEW)

The system now implements true row-level events through Supabase triggers and webhooks while maintaining all existing functionality.