import * as cron from 'node-cron';
import { addMinutes, isAfter, isBefore } from 'date-fns';
import connectDB from './db';
import { StudyBlock, JobLock, User, IStudyBlock } from './models';
import { getEmailService } from './email'
import { SupabaseStudyBlockService } from './supabase-admin';

interface PendingReminder {
  blockId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  blockTitle: string;
  startTime: Date;
  endTime: Date;
}

class CronScheduler {
  private isRunning = false;
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Run every minute: "* * * * *"
    // For testing, you can use "*/10 * * * * *" (every 10 seconds)
    this.cronJob = cron.schedule('* * * * *', async () => {
      if (this.isRunning) {
        console.log('⏳ Cron job already running, skipping this cycle...');
        return;
      }

      console.log('🔄 CRON JOB CYCLE STARTED - Checking for email triggers...');
      console.log(`⏰ Cycle started at: ${new Date().toISOString()}`);

      this.isRunning = true;
      try {
        await this.processReminders();
      } catch (error) {
        console.error('💥 CRON CYCLE ERROR:', error);
      } finally {
        this.isRunning = false;
        console.log('🔚 CRON JOB CYCLE COMPLETED');
        console.log(`⏰ Cycle ended at: ${new Date().toISOString()}`);
        console.log('─────────────────────────────────────────');
      }
    });
    
    // Auto-start the cron scheduler
    this.autoStart();
  }

  private async autoStart() {
    try {
      console.log('🚀 Auto-starting cron scheduler...');
      await this.testEmailConnection();
      this.cronJob?.start();
      console.log('✅ Cron scheduler auto-started successfully');
    } catch (error) {
      console.error('❌ Failed to auto-start cron scheduler:', error);
    }
  }

  async start() {
    console.log('Starting cron scheduler...');
    await this.testEmailConnection();
    this.cronJob?.start();
    console.log('Cron scheduler started');
  }

  stop() {
    console.log('Stopping cron scheduler...');
    this.cronJob?.stop();
    console.log('Cron scheduler stopped');
  }

  private async testEmailConnection() {
    try {
      const emailService = getEmailService();
      const isReady = await emailService.testConnection();
      if (!isReady) {
        console.warn('Email service is not properly configured');
      }
    } catch (error) {
      console.error('Email service initialization error:', error);
    }
  }

  private async processReminders() {
    try {
      await connectDB();

      const now = new Date();
      const nineMinutesFromNow = addMinutes(now, 9);
      const twelveMinutesFromNow = addMinutes(now, 12);

      console.log('🔍 EMAIL TRIGGER CHECKER - Starting scan...');
      console.log(`⏰ Current time: ${now.toISOString()}`);
      console.log(`📅 Looking for blocks starting between ${nineMinutesFromNow.toISOString()} and ${twelveMinutesFromNow.toISOString()}`);
      console.log(`⚡ Email will be triggered for blocks starting in 9-12 minutes (wider window)`);

      // Find blocks that start in 9-12 minutes (wider window for better reliability)
      const upcomingBlocks = await StudyBlock.find({
        startTime: {
          $gte: nineMinutesFromNow,
          $lt: twelveMinutesFromNow,
        },
        reminderSent: false,
        isActive: true,
      }) as IStudyBlock[];

      console.log(`📊 SCAN RESULT: Found ${upcomingBlocks.length} study blocks needing email reminders`);
      
      if (upcomingBlocks.length > 0) {
        console.log('📋 BLOCKS FOUND FOR EMAIL TRIGGER:');
        upcomingBlocks.forEach((block, index) => {
          const minutesUntilStart = Math.round((block.startTime.getTime() - now.getTime()) / (1000 * 60));
          console.log(`   ${index + 1}. "${block.title}" (ID: ${(block._id as any).toString()})`);
          console.log(`      🕒 Start: ${block.startTime.toISOString()} (in ${minutesUntilStart} minutes)`);
          console.log(`      👤 User ID: ${block.supabaseUserId}`);
          console.log(`      📧 Reminder Status: ${block.reminderSent ? 'Already sent' : 'Pending'}`);
        });
      } else {
        console.log('✅ No study blocks require email reminders at this time');
      }

      if (upcomingBlocks.length === 0) {
        return;
      }

      // Group by user to get user details
      const reminders: PendingReminder[] = [];
      
      for (const block of upcomingBlocks) {
        try {
          // Get user details
          const user = await User.findOne({ supabaseId: block.supabaseUserId });
          
          if (!user || !user.email) {
            console.warn(`User not found or missing email for block ${block._id}`);
            continue;
          }

          reminders.push({
            blockId: (block._id as any).toString(),
            userId: block.supabaseUserId,
            userEmail: user.email,
            userName: user.name,
            blockTitle: block.title,
            startTime: block.startTime,
            endTime: block.endTime,
          });
        } catch (error) {
          console.error(`Error processing block ${(block._id as any).toString()}:`, error);
        }
      }

      // Process reminders with job locking
      await this.sendReminders(reminders);

    } catch (error) {
      console.error('Error processing reminders:', error);
    }
  }

  private async sendReminders(reminders: PendingReminder[]) {
    const emailService = getEmailService();
    let successCount = 0;
    let errorCount = 0;

    for (const reminder of reminders) {
      try {
        console.log(`🔐 Acquiring job lock for block ${reminder.blockId}...`);

        const lockAcquired = await this.acquireLock('email_reminder', reminder.blockId, reminder.userId);
        
        if (!lockAcquired) {
          console.log(`⚠️  Job lock already exists for block ${reminder.blockId}, skipping email send...`);
          continue;
        }

        console.log('🎯 EMAIL TRIGGER INITIATED!');
        console.log(`📧 Sending 10-minute reminder email for study block:`);
        console.log(`   📝 Block: "${reminder.blockTitle}"`);
        console.log(`   👤 User: ${reminder.userName || 'Unknown'} (${reminder.userEmail})`);
        console.log(`   🕒 Start: ${reminder.startTime.toISOString()}`);
        console.log(`   ⏰ End: ${reminder.endTime.toISOString()}`);
        console.log(`   🆔 Block ID: ${reminder.blockId}`);
        console.log(`   📤 Email triggered at: ${new Date().toISOString()}`);

        // Send email
        const emailSent = await emailService.sendReminderEmail(
          reminder.userEmail,
          reminder.userName || '',
          reminder.blockTitle,
          reminder.startTime,
          reminder.endTime
        );

        if (emailSent) {
          // Mark reminder as sent in MongoDB
          await StudyBlock.findByIdAndUpdate(reminder.blockId, {
            reminderSent: true,
          });

          // Also mark as sent in Supabase
          try {
            await SupabaseStudyBlockService.markReminderSent(reminder.blockId);
          } catch (supabaseError) {
            console.error('❌ Error updating reminder status in Supabase:', supabaseError);
            // Continue - MongoDB update succeeded
          }

          successCount++;
          console.log('✅ EMAIL SUCCESSFULLY TRIGGERED AND SENT!');
          console.log(`   📧 Reminder sent for block "${reminder.blockTitle}"`);
          console.log(`   👤 Delivered to: ${reminder.userEmail}`);
          console.log(`   🆔 Block ID: ${reminder.blockId}`);
          console.log(`   📅 Sent at: ${new Date().toISOString()}`);
          console.log(`   ✅ Block marked as reminder sent in database`);
        } else {
          errorCount++;
          console.error('❌ EMAIL TRIGGER FAILED!');
          console.error(`   📧 Failed to send reminder for block "${reminder.blockTitle}"`);
          console.error(`   👤 Target email: ${reminder.userEmail}`);
          console.error(`   🆔 Block ID: ${reminder.blockId}`);
          console.error(`   ⏰ Failed at: ${new Date().toISOString()}`);
          
          // Release lock if email failed
          await this.releaseLock('email_reminder', reminder.blockId, reminder.userId);
        }

      } catch (error) {
        errorCount++;
        console.error('💥 CRITICAL ERROR IN EMAIL TRIGGER PROCESS!');
        console.error(`   📧 Error sending reminder for block "${reminder.blockTitle}"`);
        console.error(`   👤 Target email: ${reminder.userEmail}`);
        console.error(`   🆔 Block ID: ${reminder.blockId}`);
        console.error(`   ❌ Error details:`, error);
        console.error(`   ⏰ Error occurred at: ${new Date().toISOString()}`);
        
        // Try to release lock on error
        try {
          await this.releaseLock('email_reminder', reminder.blockId, reminder.userId);
          console.log(`🔓 Released job lock for failed block ${reminder.blockId}`);
        } catch (lockError) {
          console.error(`💥 CRITICAL: Error releasing lock for block ${reminder.blockId}:`, lockError);
        }
      }
    }

    if (successCount > 0 || errorCount > 0) {
      console.log('📊 EMAIL TRIGGER BATCH COMPLETE!');
      console.log(`   ✅ Successfully sent: ${successCount} emails`);
      console.log(`   ❌ Failed to send: ${errorCount} emails`);
      console.log(`   📅 Batch completed at: ${new Date().toISOString()}`);
      
      if (successCount > 0) {
        console.log(`🎉 ${successCount} study block reminder(s) successfully triggered!`);
      }
      if (errorCount > 0) {
        console.log(`⚠️  ${errorCount} email(s) failed to send - check logs above for details`);
      }
    }
  }

  private async acquireLock(
    jobType: string,
    blockId: string,
    userId: string,
    lockDurationMinutes = 15
  ): Promise<boolean> {
    try {
      const expiresAt = addMinutes(new Date(), lockDurationMinutes);

      await JobLock.create({
        jobType,
        blockId,
        userId,
        expiresAt,
      });

      return true;
    } catch (error) {
      // Lock already exists (duplicate key error)
      if ((error as any).code === 11000) {
        return false;
      }
      
      console.error('Error acquiring job lock:', error);
      return false;
    }
  }

  private async releaseLock(
    jobType: string,
    blockId: string,
    userId: string
  ): Promise<void> {
    try {
      await JobLock.deleteOne({
        jobType,
        blockId,
        userId,
      });
    } catch (error) {
      console.error('Error releasing job lock:', error);
    }
  }

  // Clean up expired locks (call this periodically or in a separate cron job)
  async cleanupExpiredLocks() {
    try {
      await connectDB();
      const result = await JobLock.deleteMany({
        expiresAt: { $lt: new Date() },
      });
      
      if (result.deletedCount > 0) {
        console.log(`Cleaned up ${result.deletedCount} expired job locks`);
      }
    } catch (error) {
      console.error('Error cleaning up expired locks:', error);
    }
  }

  // Manual trigger for testing
  async triggerManually() {
    console.log('🧪 MANUAL EMAIL TRIGGER TEST INITIATED');
    console.log(`⏰ Manual trigger started at: ${new Date().toISOString()}`);
    console.log('🔍 Manually checking for study blocks requiring email reminders...');
    
    await this.processReminders();
    
    console.log('✅ Manual trigger completed');
    console.log(`⏰ Manual trigger ended at: ${new Date().toISOString()}`);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: !!this.cronJob && typeof (this.cronJob as any).running === 'boolean' ? (this.cronJob as any).running : false,
    };
  }
}

// Singleton instance
let cronScheduler: CronScheduler | null = null;

export function getCronScheduler(): CronScheduler {
  if (!cronScheduler) {
    cronScheduler = new CronScheduler();
  }
  return cronScheduler;
}

export default CronScheduler;