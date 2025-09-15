
import { getCronScheduler } from '@/lib/cron';


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


initializeCronScheduler();