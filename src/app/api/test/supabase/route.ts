import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { SupabaseStudyBlockService, supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await createClient(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Testing Supabase insertion for user:', user.id);

    // Test 1: Check if we can connect to Supabase
    const { data: connectionTest, error: connectionError } = await supabaseAdmin
      .from('study_blocks')
      .select('count(*)')
      .single();

    console.log('Connection test:', { connectionTest, connectionError });

    // Test 2: Try to insert a test record
    const testData = {
      title: 'Test Study Block',
      start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    };

    console.log('Attempting to create test block with data:', testData);
    console.log('User ID:', user.id);

    const result = await SupabaseStudyBlockService.create(
      user.id,
      'test-mongodb-id-' + Date.now(),
      testData
    );

    console.log('Supabase creation result:', result);

    // Test 3: Direct insertion to check if it's a service issue
    const { data: directResult, error: directError } = await supabaseAdmin
      .from('study_blocks')
      .insert({
        user_id: user.id,
        mongodb_id: 'direct-test-' + Date.now(),
        title: 'Direct Test Block',
        start_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    console.log('Direct insertion result:', { directResult, directError });

    // Test 4: Check all records in the table
    const { data: allRecords, error: fetchError } = await supabaseAdmin
      .from('study_blocks')
      .select('*');

    console.log('All records in study_blocks table:', { allRecords, fetchError });

    return NextResponse.json({
      message: 'Supabase test completed',
      userId: user.id,
      connectionTest,
      connectionError,
      serviceResult: result,
      directResult,
      directError,
      allRecords,
      fetchError,
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      }
    });

  } catch (error) {
    console.error('Error in Supabase test:', error);
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Supabase test endpoint - use POST to run tests',
    timestamp: new Date().toISOString(),
  });
}