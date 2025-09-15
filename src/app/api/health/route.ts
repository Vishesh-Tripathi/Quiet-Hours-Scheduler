import { NextRequest, NextResponse } from 'next/server';
import { initializeCronScheduler } from '@/lib/startup';

export async function GET(request: NextRequest) {
  try {
    const scheduler = initializeCronScheduler();
    const status = scheduler.getStatus();
    
    return NextResponse.json({
      message: 'Server initialized successfully',
      cronStatus: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error during server initialization:', error);
    return NextResponse.json(
      { error: 'Server initialization failed', details: error },
      { status: 500 }
    );
  }
}


export async function POST(request: NextRequest) {
  return GET(request);
}