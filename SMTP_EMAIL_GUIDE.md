# SMTP Email Configuration Guide

This project includes a clean SMTP email utility that can send real emails for study block reminders.

## Email Modes

The system supports two email modes:

1. **Console Mode** (default): Logs email content to console for development/testing
2. **SMTP Mode**: Sends actual emails via SMTP server

## Configuration

### Step 1: Set Email Mode

Add this to your `.env.local` file:

```bash
# Use 'console' for development, 'smtp' for production
EMAIL_MODE=smtp
```

### Step 2: Configure SMTP Settings

Add SMTP configuration to your `.env.local` file:

```bash
# Gmail Configuration (recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Use App Password, not regular password
SMTP_FROM=your-email@gmail.com
```

### Step 3: Gmail App Password Setup

1. Go to [Google Account settings](https://myaccount.google.com/)
2. Enable 2-Factor Authentication
3. Go to "Security" → "App passwords"
4. Generate an app password for "Mail"
5. Use this app password in `SMTP_PASS`

## Supported SMTP Providers

### Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Yahoo
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Custom SMTP
```bash
SMTP_HOST=your-smtp-server.com
SMTP_PORT=465
SMTP_SECURE=true
```

## Testing

1. Set `EMAIL_MODE=smtp` in `.env.local`
2. Configure your SMTP settings
3. Start the application: `npm run dev`
4. Create a study block starting in 10 minutes
5. Check console logs for email delivery confirmation

## Fallback Behavior

- If `EMAIL_MODE=smtp` but SMTP configuration is incomplete, the system automatically falls back to console mode
- This ensures the application continues working even with configuration issues

## Email Template

The SMTP service sends beautifully formatted HTML emails with:
- Professional styling
- Study block details (title, time, duration)
- Responsive design
- Plain text fallback

## Security Notes

- Never commit `.env.local` to version control
- Use app passwords instead of regular passwords
- Keep SMTP credentials secure
- Consider using environment-specific configurations for production