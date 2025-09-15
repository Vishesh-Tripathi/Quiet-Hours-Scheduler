import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import connectDB from '@/lib/db';
import { StudyBlock } from '@/lib/models';

// Types for Supabase webhook payload
interface SupabaseWebhookPayload {
  event_type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record?: {
    id: string;
    user_id: string;
    mongodb_id?: string;
    title: string;
    start_time: string;
    end_time: string;
    reminder_sent: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  old_record?: {
    id: string;
    user_id: string;
    mongodb_id?: string;
    title: string;
    start_time: string;
    end_time: string;
    reminder_sent: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature/authorization
    const authHeader = request.headers.get('authorization');
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;

    if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
      console.error('Unauthorized webhook request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: SupabaseWebhookPayload = await request.json();
    
    console.log('Received Supabase webhook:', {
      event_type: payload.event_type,
      table: payload.table,
      record_id: payload.record?.id,
      mongodb_id: payload.record?.mongodb_id,
    });

    // Only process study_blocks table events
    if (payload.table !== 'study_blocks') {
      console.log('Ignoring webhook for table:', payload.table);
      return NextResponse.json({ message: 'Event ignored' });
    }

    await connectDB();

    switch (payload.event_type) {
      case 'INSERT':
        await handleInsertEvent(payload);
        break;
      case 'UPDATE':
        await handleUpdateEvent(payload);
        break;
      case 'DELETE':
        await handleDeleteEvent(payload);
        break;
      default:
        console.log('Unknown event type:', payload.event_type);
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing Supabase webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleInsertEvent(payload: SupabaseWebhookPayload) {
  const { record } = payload;
  
  if (!record) {
    console.error('No record data in INSERT event');
    return;
  }

  console.log('Processing INSERT event for study block:', record.id);

  // If this insert came from our own API (has mongodb_id), skip processing
  if (record.mongodb_id) {
    console.log('Skipping INSERT - originated from our API');
    return;
  }

  // This could be an insert from Supabase dashboard or another source
  // We could sync it to MongoDB if needed, but for now we'll just log it
  console.log('External INSERT detected for study block:', record.id);
  
  // Optional: Sync to MongoDB
  try {
    const existingBlock = await StudyBlock.findOne({
      supabaseUserId: record.user_id,
      title: record.title,
      startTime: new Date(record.start_time),
      endTime: new Date(record.end_time),
    });

    if (!existingBlock) {
      console.log('Creating corresponding MongoDB record for external Supabase insert');
      // Note: We would need user info to create this properly
      // For now, we'll skip this to avoid complexity
    }
  } catch (error) {
    console.error('Error syncing external INSERT to MongoDB:', error);
  }
}

async function handleUpdateEvent(payload: SupabaseWebhookPayload) {
  const { record, old_record } = payload;
  
  if (!record || !old_record) {
    console.error('Missing record data in UPDATE event');
    return;
  }

  console.log('Processing UPDATE event for study block:', record.id);

  // Check if this is a meaningful change
  const titleChanged = record.title !== old_record.title;
  const timeChanged = record.start_time !== old_record.start_time || record.end_time !== old_record.end_time;
  const reminderChanged = record.reminder_sent !== old_record.reminder_sent;
  const activeChanged = record.is_active !== old_record.is_active;

  if (!titleChanged && !timeChanged && !reminderChanged && !activeChanged) {
    console.log('No meaningful changes detected, skipping');
    return;
  }

  console.log('Meaningful changes detected:', {
    titleChanged,
    timeChanged,
    reminderChanged,
    activeChanged,
  });

  // If we have a mongodb_id, sync the changes
  if (record.mongodb_id) {
    try {
      const updateData: any = {};
      
      if (titleChanged) updateData.title = record.title;
      if (timeChanged) {
        updateData.startTime = new Date(record.start_time);
        updateData.endTime = new Date(record.end_time);
      }
      if (reminderChanged) updateData.reminderSent = record.reminder_sent;
      if (activeChanged) updateData.isActive = record.is_active;

      const updated = await StudyBlock.findByIdAndUpdate(
        record.mongodb_id,
        updateData,
        { new: true }
      );

      if (updated) {
        console.log('Successfully synced UPDATE to MongoDB');
      } else {
        console.error('MongoDB record not found for ID:', record.mongodb_id);
      }
    } catch (error) {
      console.error('Error syncing UPDATE to MongoDB:', error);
    }
  }

  // Log the event for monitoring
  console.log('Study block updated via Supabase webhook:', {
    supabase_id: record.id,
    mongodb_id: record.mongodb_id,
    user_id: record.user_id,
    changes: { titleChanged, timeChanged, reminderChanged, activeChanged },
  });
}

async function handleDeleteEvent(payload: SupabaseWebhookPayload) {
  const { old_record } = payload;
  
  if (!old_record) {
    console.error('No old_record data in DELETE event');
    return;
  }

  console.log('Processing DELETE event for study block:', old_record.id);

  // If we have a mongodb_id, also delete from MongoDB
  if (old_record.mongodb_id) {
    try {
      const deleted = await StudyBlock.findByIdAndDelete(old_record.mongodb_id);
      
      if (deleted) {
        console.log('Successfully synced DELETE to MongoDB');
      } else {
        console.error('MongoDB record not found for ID:', old_record.mongodb_id);
      }
    } catch (error) {
      console.error('Error syncing DELETE to MongoDB:', error);
    }
  }

  // Log the event for monitoring
  console.log('Study block deleted via Supabase webhook:', {
    supabase_id: old_record.id,
    mongodb_id: old_record.mongodb_id,
    user_id: old_record.user_id,
  });
}

// GET method for webhook health check
export async function GET() {
  return NextResponse.json({
    message: 'Supabase webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}