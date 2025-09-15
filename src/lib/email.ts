import nodemailer from 'nodemailer';

// Email Service Interface
export interface EmailService {
  testConnection(): Promise<boolean>;
  sendReminderEmail(
    to: string,
    userName: string,
    blockTitle: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean>;
}

// SMTP Configuration Interface
interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

// SMTP Email Service Implementation
class SMTPEmailService implements EmailService {
  private transporter: nodemailer.Transporter;
  private config: SMTPConfig;

  constructor(config: SMTPConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('📧 SMTP EMAIL SERVICE: Testing connection...');
      await this.transporter.verify();
      console.log('✅ SMTP EMAIL SERVICE: Connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ SMTP EMAIL SERVICE: Connection failed', error);
      return false;
    }
  }

  async sendReminderEmail(
    to: string,
    userName: string,
    blockTitle: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    try {
      console.log('\n🎯 ===== SMTP EMAIL TRIGGERED =====');
      console.log(`📧 Sending email to: ${to}`);
      
      const now = new Date();
      const minutesUntilStart = Math.round((startTime.getTime() - now.getTime()) / (1000 * 60));
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      const subject = `Study Block Reminder - "${blockTitle}"`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
            📚 Study Block Reminder
          </h2>
          
          <p>Hi ${userName || 'there'},</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">⏰ Your study block is starting soon!</h3>
            <p><strong>📝 Block:</strong> ${blockTitle}</p>
            <p><strong>🕒 Starting in:</strong> ${minutesUntilStart} minutes</p>
            <p><strong>📅 Start Time:</strong> ${startTime.toLocaleString()}</p>
            <p><strong>⏰ End Time:</strong> ${endTime.toLocaleString()}</p>
            <p><strong>⏱️ Duration:</strong> ${duration} minutes</p>
          </div>
          
          <p>🎯 Good luck with your study session!</p>
          <p>📚 Remember: consistency is key to success.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Best regards,<br>
            Your Study Block Reminder System
          </p>
        </div>
      `;

      const textContent = `
Hi ${userName || 'there'},

⏰ Your study block "${blockTitle}" is starting in ${minutesUntilStart} minutes!

📅 Start: ${startTime.toLocaleString()}
⏰ End: ${endTime.toLocaleString()}
⏱️ Duration: ${duration} minutes

🎯 Good luck with your study session!
📚 Remember: consistency is key to success.

Best regards,
Your Study Block Reminder System
      `;

      const mailOptions = {
        from: this.config.from,
        to: to,
        subject: subject,
        text: textContent,
        html: htmlContent,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ SMTP EMAIL SENT SUCCESSFULLY');
      console.log(`📧 Message ID: ${info.messageId}`);
      console.log(`👤 Delivered to: ${to}`);
      console.log(`📝 Subject: ${subject}`);
      console.log('🎯 ===== SMTP EMAIL COMPLETE =====\n');
      
      return true;
    } catch (error) {
      console.error('\n❌ ===== SMTP EMAIL FAILED =====');
      console.error('💥 ERROR: Failed to send SMTP email');
      console.error('📧 Target Email:', to);
      console.error('📝 Block Title:', blockTitle);
      console.error('❌ Error Details:', error);
      console.error('🎯 ===== SMTP EMAIL ERROR END =====\n');
      return false;
    }
  }
}

// Console Email Service Implementation (existing)
class ConsoleEmailService implements EmailService {
  async testConnection(): Promise<boolean> {
    console.log('📧 EMAIL SERVICE: Console Email Service initialized (mock mode)');
    console.log('✅ EMAIL SERVICE: Ready to log email notifications to console');
    return true;
  }

  async sendReminderEmail(
    to: string,
    userName: string,
    blockTitle: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    try {
      console.log('\n🎯 ===== EMAIL TRIGGERED =====');
      console.log('📧 EMAIL NOTIFICATION (Console Mode)');
      console.log('─'.repeat(50));
      console.log(`📬 To: ${to}`);
      console.log(`👤 User: ${userName || 'Unknown User'}`);
      console.log(`📝 Subject: Study Block Reminder - "${blockTitle}"`);
      console.log(`🕒 Start Time: ${startTime.toISOString()}`);
      console.log(`⏰ End Time: ${endTime.toISOString()}`);
      console.log(`⏱️ Duration: ${Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))} minutes`);
      console.log(`📅 Reminder Sent At: ${new Date().toISOString()}`);
      console.log('─'.repeat(50));
      
      // Calculate time until start
      const now = new Date();
      const minutesUntilStart = Math.round((startTime.getTime() - now.getTime()) / (1000 * 60));
      
      console.log('📋 EMAIL CONTENT:');
      console.log(`   Hi ${userName || 'there'},`);
      console.log(`   `);
      console.log(`   ⏰ Your study block "${blockTitle}" is starting in ${minutesUntilStart} minutes!`);
      console.log(`   `);
      console.log(`   📅 Start: ${startTime.toLocaleString()}`);
      console.log(`   ⏰ End: ${endTime.toLocaleString()}`);
      console.log(`   ⏱️ Duration: ${Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))} minutes`);
      console.log(`   `);
      console.log(`   🎯 Good luck with your study session!`);
      console.log(`   📚 Remember: consistency is key to success.`);
      console.log(`   `);
      console.log(`   Best regards,`);
      console.log(`   Your Study Block Reminder System`);
      
      console.log('─'.repeat(50));
      console.log('✅ EMAIL SENT SUCCESSFULLY (Console Mode)');
      console.log('🎯 ===== EMAIL COMPLETE =====\n');
      
      return true;
    } catch (error) {
      console.error('\n❌ ===== EMAIL FAILED =====');
      console.error('💥 ERROR: Failed to send email notification');
      console.error('📧 Target Email:', to);
      console.error('📝 Block Title:', blockTitle);
      console.error('❌ Error Details:', error);
      console.error('🎯 ===== EMAIL ERROR END =====\n');
      return false;
    }
  }
}

// Email service factory
export function getEmailService(): EmailService {
  const emailMode = process.env.EMAIL_MODE || 'console';
  
  if (emailMode === 'smtp') {
    console.log('📧 EMAIL SERVICE: Using SMTP mode');
    
    // Get SMTP configuration from environment variables
    const smtpConfig: SMTPConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    };

    // Validate SMTP configuration
    if (!smtpConfig.auth.user || !smtpConfig.auth.pass || !smtpConfig.from) {
      console.warn('⚠️ EMAIL SERVICE: Incomplete SMTP configuration, falling back to console mode');
      console.warn('   Required env vars: SMTP_USER, SMTP_PASS, SMTP_FROM (or SMTP_USER as from)');
      return new ConsoleEmailService();
    }

    return new SMTPEmailService(smtpConfig);
  }
  
  console.log('📧 EMAIL SERVICE: Using console mode');
  return new ConsoleEmailService();
}

export default ConsoleEmailService;