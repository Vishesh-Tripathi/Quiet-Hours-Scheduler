// API endpoint to manually trigger cron job for testing
import { NextRequest, NextResponse } from 'next/server';
import { getCronScheduler } from '@/lib/cron';

export async function POST(request: NextRequest) {
  try {
    const { action, testEmail } = await request.json();
    
    const scheduler = getCronScheduler();

    switch (action) {
      case 'test-email-system':
        console.log('🧪 Testing email system through cron...');
        
        // Get scheduler status first
        const status = scheduler.getStatus();
        console.log('Cron scheduler status:', status);

        // Manually trigger the reminder process
        await scheduler.triggerManually();
        
        return NextResponse.json({
          message: 'Email system test triggered',
          cronStatus: status,
          note: 'Check server logs for email sending attempts'
        });

      case 'start':
        await scheduler.start();
        return NextResponse.json({ message: 'Cron scheduler started' });

      case 'stop':
        scheduler.stop();
        return NextResponse.json({ message: 'Cron scheduler stopped' });

      case 'status':
        const currentStatus = scheduler.getStatus();
        return NextResponse.json(currentStatus);

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: test-email-system, start, stop, status' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in cron test API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}