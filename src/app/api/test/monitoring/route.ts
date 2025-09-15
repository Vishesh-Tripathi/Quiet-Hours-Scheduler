import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'create-test-block') {
      console.log('🧪 Creating test study block for monitoring...');
      
      // Create a block that starts in 10 minutes to trigger email monitoring
      const startTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      const endTime = new Date(Date.now() + 70 * 60 * 1000); // 70 minutes from now (1 hour duration)
      
      console.log(`📅 Creating test block starting at: ${startTime.toISOString()}`);
      console.log(`⏰ Block will end at: ${endTime.toISOString()}`);
      
      // Use a test user ID - you might need to adjust this to match your actual user
      const testUserId = '00000000-0000-0000-0000-000000000000'; // Default test UUID
      
      const { data: result, error } = await supabaseAdmin
        .from('study_blocks')
        .insert({
          user_id: testUserId,
          mongodb_id: 'test-monitoring-' + Date.now(),
          title: 'Test Email Monitoring Block',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          reminder_sent: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating test block:', error);
        return NextResponse.json({ 
          error: 'Failed to create test block', 
          details: error 
        }, { status: 500 });
      }

      console.log('✅ Test block created successfully:', result);
      console.log('📧 Email monitoring should trigger in ~10 minutes');
      console.log('🔍 Watch the server logs for email notifications');

      return NextResponse.json({
        message: 'Test block created for email monitoring',
        block: result,
        expectedEmailTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        note: 'Watch server logs for email notification in ~10 minutes'
      });
    }

    if (action === 'create-immediate-test') {
      console.log('🧪 Creating immediate test block...');
      
      // Create a block that starts in 1 minute for immediate testing
      const startTime = new Date(Date.now() + 1 * 60 * 1000); // 1 minute from now
      const endTime = new Date(Date.now() + 61 * 60 * 1000); // 61 minutes from now
      
      console.log(`📅 Creating immediate test block starting at: ${startTime.toISOString()}`);
      
      const testUserId = '00000000-0000-0000-0000-000000000000';
      
      const { data: result, error } = await supabaseAdmin
        .from('study_blocks')
        .insert({
          user_id: testUserId,
          mongodb_id: 'immediate-test-' + Date.now(),
          title: 'Immediate Test Block',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          reminder_sent: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating immediate test block:', error);
        return NextResponse.json({ 
          error: 'Failed to create immediate test block', 
          details: error 
        }, { status: 500 });
      }

      console.log('✅ Immediate test block created:', result);
      return NextResponse.json({
        message: 'Immediate test block created',
        block: result,
        note: 'Will NOT trigger email (starts in 1 minute, not 10)'
      });
    }

    return NextResponse.json({ 
      error: 'Invalid action. Use: create-test-block, create-immediate-test' 
    }, { status: 400 });

  } catch (error) {
    console.error('Error in monitoring test:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Monitoring test endpoint',
    actions: [
      'POST with {"action": "create-test-block"} - Creates block starting in 10 minutes',
      'POST with {"action": "create-immediate-test"} - Creates block starting in 1 minute'
    ]
  });
}