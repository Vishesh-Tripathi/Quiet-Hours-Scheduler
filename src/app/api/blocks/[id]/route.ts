import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import connectDB from '@/lib/db';
import { StudyBlock } from '@/lib/models';
import { SupabaseStudyBlockService } from '@/lib/supabase-admin';
import mongoose from 'mongoose';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await createClient(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid block ID' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find and delete the study block (only if it belongs to the user)
    const deletedBlock = await StudyBlock.findOneAndDelete({
      _id: id,
      supabaseUserId: user.id,
    });

    if (!deletedBlock) {
      return NextResponse.json(
        { error: 'Study block not found' },
        { status: 404 }
      );
    }

    // Also delete from Supabase
    try {
      await SupabaseStudyBlockService.delete(id);
    } catch (supabaseError) {
      console.error('Error deleting from Supabase:', supabaseError);
      // Continue - MongoDB deletion succeeded
    }

    return NextResponse.json(
      { message: 'Study block deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting study block:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await createClient(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, startTime, endTime } = body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid block ID' },
        { status: 400 }
      );
    }

    // Validation
    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Title, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    if (start <= new Date()) {
      return NextResponse.json(
        { error: 'Start time must be in the future' },
        { status: 400 }
      );
    }

    // Ensure minimum lead time for email reminders (13 minutes actual, 15 minutes shown to user)
    const minimumStartTime = new Date(Date.now() + 13 * 60 * 1000); // 13 minutes from now
    if (start < minimumStartTime) {
      return NextResponse.json(
        { error: 'Start time must be at least 15 minutes from now to ensure email reminder delivery' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if block exists and belongs to user
    const existingBlock = await StudyBlock.findOne({
      _id: id,
      supabaseUserId: user.id,
    });

    if (!existingBlock) {
      return NextResponse.json(
        { error: 'Study block not found' },
        { status: 404 }
      );
    }

    // Check for overlapping blocks (excluding current block)
    const hasOverlap = await StudyBlock.hasOverlap(
      user.id,
      start,
      end,
      id
    );

    if (hasOverlap) {
      return NextResponse.json(
        { error: 'This time slot overlaps with an existing study block' },
        { status: 409 }
      );
    }

    // Update the study block
    const updatedBlock = await StudyBlock.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        startTime: start,
        endTime: end,
        reminderSent: false, // Reset reminder if time changed
      },
      { new: true }
    );

    // Also update in Supabase
    try {
      await SupabaseStudyBlockService.update(id, {
        title: title.trim(),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        reminder_sent: false,
      });
    } catch (supabaseError) {
      console.error('Error updating in Supabase:', supabaseError);
      // Continue - MongoDB update succeeded
    }

    return NextResponse.json(updatedBlock);
  } catch (error) {
    console.error('Error updating study block:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}