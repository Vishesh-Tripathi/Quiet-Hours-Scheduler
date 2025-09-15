<<<<<<< HEAD
# Quiet Hours Scheduler

A comprehensive study block scheduling application with email reminders built with Next.js, MongoDB, Supabase, and automated CRON notifications.

## 🚀 Features

- **User Authentication**: Supabase Auth with email/password and OAuth
- **Study Block Management**: Create, edit, and delete time-based study sessions
- **Email Reminders**: Automated notifications 10 minutes before each session
- **Overlap Prevention**: Smart validation to prevent conflicting time blocks
- **CRON Scheduling**: Background job system with deduplication and locking
- **Responsive UI**: Modern design with Tailwind CSS

## 📋 Prerequisites

Before setting up the project, ensure you have:

- Node.js 18+ installed
- MongoDB Atlas account
- Supabase account
- Email service (Gmail SMTP recommended)

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

The dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 2. Environment Configuration

Update the `.env.local` file with your actual credentials:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/quiet-hours?retryWrites=true&w=majority

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Email Configuration (Gmail SMTP example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Application Configuration
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# CRON Job Configuration
CRON_SECRET=your-cron-secret-key
```

### 3. Database Setup

#### MongoDB Atlas
1. Create a new cluster at [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a database user
3. Get your connection string
4. Update `MONGODB_URI` in `.env.local`

#### Supabase
1. Create a new project at [Supabase](https://app.supabase.com/)
2. Go to Settings > API to get your keys
3. Update the Supabase variables in `.env.local`

### 4. Email Service Setup

#### Gmail SMTP
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password: Google Account > Security > App passwords
3. Use the app password in the `EMAIL_PASS` field

#### Other Email Services
Update the `EMAIL_HOST` and `EMAIL_PORT` for your provider:
- **Outlook**: smtp.office365.com, port 587
- **Yahoo**: smtp.mail.yahoo.com, port 587
- **SendGrid**: smtp.sendgrid.net, port 587

### 5. Start the Application

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

### 6. Start the CRON Scheduler

The CRON scheduler needs to be started manually. Use the API endpoint:

```bash
curl -X POST http://localhost:3000/api/cron \
  -H "Authorization: Bearer your-cron-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

Or using PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/cron" -Method POST -Headers @{"Authorization"="Bearer your-cron-secret-key"; "Content-Type"="application/json"} -Body '{"action": "start"}'
```

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── blocks/
│   │   │   ├── route.ts          # GET, POST study blocks
│   │   │   └── [id]/route.ts     # PUT, DELETE specific block
│   │   └── cron/
│   │       └── route.ts          # CRON management API
│   ├── layout.tsx
│   └── page.tsx                  # Main dashboard
├── components/
│   ├── AuthWrapper.tsx           # Authentication components
│   ├── BlockForm.tsx             # Study block creation/editing
│   └── BlockList.tsx             # Study block listing
└── lib/
    ├── auth.ts                   # User synchronization
    ├── cron.ts                   # CRON scheduler implementation
    ├── db.ts                     # MongoDB connection
    ├── email.ts                  # Email service
    ├── models.ts                 # Database schemas
    ├── supabase.ts               # Supabase client
    ├── supabase-client.ts        # Browser client
    └── supabase-server.ts        # Server client
```

## 🔧 API Endpoints

### Study Blocks
- `GET /api/blocks` - Get user's study blocks
- `POST /api/blocks` - Create new study block
- `PUT /api/blocks/[id]` - Update study block
- `DELETE /api/blocks/[id]` - Delete study block

### CRON Management
- `POST /api/cron` - Control scheduler (start, stop, trigger, status, cleanup)
- `GET /api/cron` - Get scheduler status

## 🕒 How It Works

1. **User Registration/Login**: Users authenticate via Supabase
2. **Block Creation**: Users create study blocks with title, start time, and end time
3. **Validation**: System prevents overlapping blocks and ensures future scheduling
4. **CRON Processing**: Background job runs every minute to check for upcoming blocks
5. **Email Dispatch**: 10 minutes before each block, users receive reminder emails
6. **Deduplication**: Job locking prevents duplicate notifications

## 🎨 Key Features

### Overlap Prevention
The system automatically detects and prevents overlapping study blocks for the same user.

### Email Reminders
Rich HTML email templates with preparation tips and study block details.

### Job Locking
MongoDB-based locking mechanism ensures no duplicate email notifications.

### Responsive Design
Mobile-friendly interface with modern UI components.

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Verify your connection string
   - Check network access settings in MongoDB Atlas
   - Ensure your IP is whitelisted

2. **Supabase Authentication Issues**
   - Verify your Supabase project URL and keys
   - Check if authentication is enabled in Supabase dashboard

3. **Email Not Sending**
   - Verify SMTP credentials
   - For Gmail, ensure you're using App Password, not regular password
   - Check email service logs in the console

4. **CRON Not Working**
   - Ensure the CRON scheduler is started via API
   - Check the CRON secret key matches your environment variable
   - Monitor console logs for CRON job execution

### Development Commands

```bash
# Check CRON status
curl -H "Authorization: Bearer your-cron-secret" http://localhost:3000/api/cron

# Manually trigger email check
curl -X POST -H "Authorization: Bearer your-cron-secret" -H "Content-Type: application/json" -d '{"action": "trigger"}' http://localhost:3000/api/cron

# Stop CRON scheduler
curl -X POST -H "Authorization: Bearer your-cron-secret" -H "Content-Type: application/json" -d '{"action": "stop"}' http://localhost:3000/api/cron
```

## 🚀 Deployment

For production deployment:

1. Update environment variables for production services
2. Configure MongoDB Atlas for production
3. Set up Supabase production project
4. Configure production email service
5. Set up a proper CRON service (not the built-in one for production)

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
=======
# Quiet-Hours-Scheduler
>>>>>>> f41bb1281ea2e7dd977596354b3f2096002d5e76
