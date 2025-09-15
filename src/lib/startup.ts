// This file ensures the cron scheduler is initialized when the server starts
import { getCronScheduler } from '@/lib/cron';

// Initialize the cron scheduler when this module is imported
let isInitialized = false;

export function initializeCronScheduler() {
  if (!isInitialized) {
    console.log('🏁 Initializing cron scheduler on server startup...');
    const scheduler = getCronScheduler();
    isInitialized = true;
    console.log('📡 Cron scheduler singleton created and auto-started');
    return scheduler;
  }
  return getCronScheduler();
}

// Auto-initialize when the module is loaded
initializeCronScheduler();