import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { createClient } from '@/lib/supabase-server';
import connectDB from '@/lib/db';
import { StudyBlock, User as UserModel } from '@/lib/models';
import { syncUser } from '@/lib/auth';
import { SupabaseStudyBlockService } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const {  user } = await createClient(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    
    await syncUser(user);

    // Get MongoDB user
    const blocks = await StudyBlock.find({
      supabaseUserId: user.id,
      isActive: true,
    }).sort({ startTime: 1 });

    return NextResponse.json({ blocks });
  } catch (error) {
    console.error('Error fetching study blocks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {  user } = await createClient(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, startTime, endTime } = body;

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

    // Ensure minimum lead time for email reminders (15 minutes)
    const minimumStartTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    if (start < minimumStartTime) {
      return NextResponse.json(
        { error: 'Start time must be at least 15 minutes from now to ensure email reminder delivery' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Sync user to MongoDB
    await syncUser(user);

    // Get MongoDB user
    const mongoUser = await UserModel.findOne({ supabaseId: user.id });
    if (!mongoUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check for overlapping blocks in MongoDB
    const hasOverlap = await StudyBlock.hasOverlap(
      user.id,
      start,
      end
    );

    if (hasOverlap) {
      return NextResponse.json(
        { error: 'This time slot overlaps with an existing study block' },
        { status: 409 }
      );
    }

    // Create study block in MongoDB first
    const studyBlock = await StudyBlock.create({
      userId: mongoUser._id.toString(),
      supabaseUserId: user.id,
      title: title.trim(),
      startTime: start,
      endTime: end,
    });

    // Also create in Supabase for row-level events and additional features
    try {
      console.log('Attempting to create study block in Supabase for user:', user.id);
      console.log('MongoDB block ID:', (studyBlock._id as mongoose.Types.ObjectId).toString());
      console.log('Block data:', {
        title: title.trim(),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      });

      const supabaseBlock = await SupabaseStudyBlockService.create(
        user.id,
        (studyBlock._id as mongoose.Types.ObjectId).toString(),
        {
          title: title.trim(),
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        }
      );

      if (!supabaseBlock) {
        console.warn('Failed to create study block in Supabase, but MongoDB creation succeeded');
      } else {
        console.log('Successfully created study block in Supabase:', supabaseBlock);
      }
    } catch (supabaseError) {
      console.error('Error creating study block in Supabase:', supabaseError);
      // Continue - MongoDB is the primary storage, Supabase is supplementary
    }

    return NextResponse.json(studyBlock, { status: 201 });
  } catch (error) {
    console.error('Error creating study block:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}