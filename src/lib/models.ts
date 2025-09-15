import mongoose, { Document, Schema } from 'mongoose';

// User interface
export interface IUser extends Document {
  supabaseId: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

// User schema
const UserSchema = new Schema<IUser>(
  {
    supabaseId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Study block interface
export interface IStudyBlock extends Document {
  userId: string;
  supabaseUserId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  reminderSent: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Study block schema
const StudyBlockSchema = new Schema<IStudyBlock>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    supabaseUserId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (this: IStudyBlock, endTime: Date) {
          return endTime > this.startTime;
        },
        message: 'End time must be after start time',
      },
    },
    reminderSent: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add compound index to prevent overlapping blocks for the same user
StudyBlockSchema.index(
  {
    supabaseUserId: 1,
    startTime: 1,
    endTime: 1,
  },
  {
    unique: false, // We'll handle overlap validation in application logic
  }
);

// Add index for cron job queries
StudyBlockSchema.index({
  startTime: 1,
  reminderSent: 1,
  isActive: 1,
});

// Static method to check for overlapping blocks
StudyBlockSchema.statics.hasOverlap = async function (
  supabaseUserId: string,
  startTime: Date,
  endTime: Date,
  excludeId?: string
) {
  const query: {
    supabaseUserId: string;
    isActive: boolean;
    $or: Array<{
      startTime?: { $lte?: Date; $gte?: Date; $lt?: Date };
      endTime?: { $gt?: Date; $gte?: Date; $lte?: Date };
    }>;
    _id?: { $ne: string };
  } = {
    supabaseUserId,
    isActive: true,
    $or: [
      // New block starts during existing block
      {
        startTime: { $lte: startTime },
        endTime: { $gt: startTime },
      },
      // New block ends during existing block
      {
        startTime: { $lt: endTime },
        endTime: { $gte: endTime },
      },
      // New block completely contains existing block
      {
        startTime: { $gte: startTime },
        endTime: { $lte: endTime },
      },
      // Existing block completely contains new block
      {
        startTime: { $lte: startTime },
        endTime: { $gte: endTime },
      },
    ],
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const overlapping = await this.findOne(query);
  return !!overlapping;
};

// Interface for static methods
interface IStudyBlockModel extends mongoose.Model<IStudyBlock> {
  hasOverlap(
    supabaseUserId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<boolean>;
}

// Job lock interface for preventing duplicate cron jobs
export interface IJobLock extends Document {
  jobType: string;
  blockId: string;
  userId: string;
  lockedAt: Date;
  expiresAt: Date;
}

// Job lock schema
const JobLockSchema = new Schema<IJobLock>({
  jobType: {
    type: String,
    required: true,
    enum: ['email_reminder'],
  },
  blockId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  lockedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // MongoDB TTL index
  },
});

// Compound unique index for job locks
JobLockSchema.index(
  {
    jobType: 1,
    blockId: 1,
    userId: 1,
  },
  { unique: true }
);

// Export models
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const StudyBlock = (mongoose.models.StudyBlock || mongoose.model<IStudyBlock>('StudyBlock', StudyBlockSchema)) as IStudyBlockModel;
export const JobLock = mongoose.models.JobLock || mongoose.model<IJobLock>('JobLock', JobLockSchema);