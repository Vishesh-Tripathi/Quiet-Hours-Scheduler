import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    console.log('Debug endpoint called');
    
    // Check environment variables
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:', { hasUrl, hasServiceKey });
    
    if (!hasUrl || !hasServiceKey) {
      return NextResponse.json({
        error: 'Missing environment variables',
        hasUrl,
        hasServiceKey,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
      });
    }

    // Test basic Supabase connection
    const { data, error } = await supabaseAdmin
      .from('study_blocks')
      .select('count(*)', { count: 'exact' });

    console.log('Supabase connection test:', { data, error });

    // Test if we can read the table structure
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .from('study_blocks')
      .select('*')
      .limit(0);

    console.log('Table structure test:', { tableInfo, tableError });

    return NextResponse.json({
      message: 'Debug completed',
      timestamp: new Date().toISOString(),
      environment: {
        hasUrl,
        hasServiceKey,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + '...',
      },
      connectionTest: { data, error },
      tableTest: { tableInfo, tableError },
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed', 
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}