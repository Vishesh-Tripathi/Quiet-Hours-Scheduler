import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    await connectDB();

    if (action === 'create-test-user') {
      console.log('🧪 Creating test user for monitoring...');
      
      const testUserId = '00000000-0000-0000-0000-000000000000';
      const testEmail = 'test-monitoring@example.com';
      
      // Check if test user already exists
      const existingUser = await User.findOne({ supabaseId: testUserId });
      
      if (existingUser) {
        console.log('✅ Test user already exists');
        return NextResponse.json({
          message: 'Test user already exists',
          user: existingUser
        });
      }

      // Create test user
      const testUser = await User.create({
        supabaseId: testUserId,
        email: testEmail,
        name: 'Test User for Monitoring',
        isActive: true,
      });

      console.log('✅ Test user created:', testUser);

      return NextResponse.json({
        message: 'Test user created successfully',
        user: testUser
      });
    }

    if (action === 'check-test-user') {
      const testUserId = '00000000-0000-0000-0000-000000000000';
      const user = await User.findOne({ supabaseId: testUserId });
      
      return NextResponse.json({
        message: 'Test user check',
        exists: !!user,
        user: user || null
      });
    }

    return NextResponse.json({ 
      error: 'Invalid action. Use: create-test-user, check-test-user' 
    }, { status: 400 });

  } catch (error) {
    console.error('Error in user test:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'User test endpoint',
    actions: [
      'POST with {"action": "create-test-user"} - Creates test user for monitoring',
      'POST with {"action": "check-test-user"} - Checks if test user exists'
    ]
  });
}