import { NextRequest, NextResponse } from 'next/server';
import { getCronScheduler } from '@/lib/cron';

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - you might want to add proper authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const scheduler = getCronScheduler();

    switch (action) {
      case 'start':
        await scheduler.start();
        return NextResponse.json({ message: 'Cron scheduler started' });

      case 'stop':
        scheduler.stop();
        return NextResponse.json({ message: 'Cron scheduler stopped' });

      case 'trigger':
        await scheduler.triggerManually();
        return NextResponse.json({ message: 'Manual trigger completed' });

      case 'status':
        const status = scheduler.getStatus();
        return NextResponse.json(status);

      case 'cleanup':
        await scheduler.cleanupExpiredLocks();
        return NextResponse.json({ message: 'Expired locks cleaned up' });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, trigger, status, cleanup' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in cron API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Simple auth check
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduler = getCronScheduler();
    const status = scheduler.getStatus();
    
    return NextResponse.json({
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting cron status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}