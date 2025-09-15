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
   
    this.cronJob = cron.schedule('* * * * *', async () => {
      if (this.isRunning) {
        return;
      }

      this.isRunning = true;
      try {
        await this.processReminders();
      } catch (error) {
        console.error('CRON ERROR:', error);
      } finally {
        this.isRunning = false;
      }
    });
    
    // Auto-start the cron scheduler
    this.autoStart();
  }

  private async autoStart() {
    try {
      await this.testEmailConnection();
      this.cronJob?.start();
    } catch (error) {
      console.error('Failed to auto-start cron scheduler:', error);
    }
  }

  async start() {
    await this.testEmailConnection();
    this.cronJob?.start();
  }

  stop() {
    this.cronJob?.stop();
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

      // Find blocks that start in 9-12 minutes (wider window for better reliability)
      const upcomingBlocks = await StudyBlock.find({
        startTime: {
          $gte: nineMinutesFromNow,
          $lt: twelveMinutesFromNow,
        },
        reminderSent: false,
        isActive: true,
      }) as IStudyBlock[];

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
        const lockAcquired = await this.acquireLock('email_reminder', reminder.blockId, reminder.userId);
        
        if (!lockAcquired) {
          continue;
        }

        console.log(`📧 Sending reminder to ${reminder.userEmail} for "${reminder.blockTitle}"`);

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
            console.error('Error updating reminder status in Supabase:', supabaseError);
            // Continue - MongoDB update succeeded
          }

          successCount++;
          console.log(`✅ Email sent to ${reminder.userEmail} for "${reminder.blockTitle}"`);
        } else {
          errorCount++;
          console.error(`❌ Failed to send email to ${reminder.userEmail} for "${reminder.blockTitle}"`);
          
          // Release lock if email failed
          await this.releaseLock('email_reminder', reminder.blockId, reminder.userId);
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ Error sending email to ${reminder.userEmail} for "${reminder.blockTitle}":`, error);
        
        // Try to release lock on error
        try {
          await this.releaseLock('email_reminder', reminder.blockId, reminder.userId);
        } catch (lockError) {
          console.error(`Error releasing lock for block ${reminder.blockId}:`, lockError);
        }
      }
    }

    if (successCount > 0 || errorCount > 0) {
      console.log(`📊 Email batch complete: ${successCount} sent, ${errorCount} failed`);
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
    await this.processReminders();
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