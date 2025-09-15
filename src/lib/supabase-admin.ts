import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export { supabaseAdmin, supabaseClient };

export interface SupabaseStudyBlock {
  id: string;
  user_id: string;
  mongodb_id?: string;
  title: string;
  start_time: string;
  end_time: string;
  reminder_sent: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class SupabaseStudyBlockService {
  
  static async create(
    userId: string,
    mongodbId: string,
    data: {
      title: string;
      start_time: string;
      end_time: string;
    }
  ): Promise<SupabaseStudyBlock | null> {
    try {
      console.log('SupabaseStudyBlockService.create called with:', {
        userId,
        mongodbId,
        data,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });

      // Validate input data
      if (!userId || !mongodbId || !data.title || !data.start_time || !data.end_time) {
        console.error('Invalid input data for Supabase study block creation');
        return null;
      }

      const sanitizedTitle = data.title.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();

      const insertData = {
        user_id: userId,
        mongodb_id: mongodbId,
        title: sanitizedTitle,
        start_time: data.start_time,
        end_time: data.end_time,
      };

      console.log('About to insert into Supabase:', insertData);

      const { data: result, error } = await supabaseAdmin
        .from('study_blocks')
        .insert(insertData)
        .select()
        .single();

      console.log('Supabase insert response:', { result, error });

      if (error) {
        console.error('Error creating Supabase study block:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          insertData
        });
        
        if (error.code === '22P02') {
          console.error('JSON parsing error detected - this may be a webhook trigger issue');
        } else if (error.code === '23505') {
          console.error('Duplicate key error - record may already exist');
        } else if (error.code === '23503') {
          console.error('Foreign key constraint violation - user may not exist');
        }
        
        return null;
      }

      console.log('Successfully created Supabase study block:', result);
      return result;
    } catch (error) {
      console.error('Error in SupabaseStudyBlockService.create:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        mongodbId,
        data
      });
      return null;
    }
  }

  static async update(
    mongodbId: string,
    data: Partial<{
      title: string;
      start_time: string;
      end_time: string;
      reminder_sent: boolean;
      is_active: boolean;
    }>
  ): Promise<SupabaseStudyBlock | null> {
    try {
      const { data: result, error } = await supabaseAdmin
        .from('study_blocks')
        .update(data)
        .eq('mongodb_id', mongodbId)
        .select()
        .single();

      if (error) {
        console.error('Error updating Supabase study block:', error);
        return null;
      }

      return result;
    } catch (error) {
      console.error('Error in SupabaseStudyBlockService.update:', error);
      return null;
    }
  }

  static async delete(mongodbId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('study_blocks')
        .delete()
        .eq('mongodb_id', mongodbId);

      if (error) {
        console.error('Error deleting Supabase study block:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in SupabaseStudyBlockService.delete:', error);
      return false;
    }
  }

  static async getByUser(userId: string): Promise<SupabaseStudyBlock[]> {
    try {
      const { data: result, error } = await supabaseClient
        .from('study_blocks')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('start_time');

      if (error) {
        console.error('Error fetching user study blocks:', error);
        return [];
      }

      return result || [];
    } catch (error) {
      console.error('Error in SupabaseStudyBlockService.getByUser:', error);
      return [];
    }
  }

  static async markReminderSent(mongodbId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('study_blocks')
        .update({ reminder_sent: true })
        .eq('mongodb_id', mongodbId);

      if (error) {
        console.error('Error marking reminder sent in Supabase:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in SupabaseStudyBlockService.markReminderSent:', error);
      return false;
    }
  }

  static async getBlocksNeedingReminders(
    startTime: Date,
    endTime: Date
  ): Promise<SupabaseStudyBlock[]> {
    try {
      const { data: result, error } = await supabaseAdmin
        .from('study_blocks')
        .select('*')
        .gte('start_time', startTime.toISOString())
        .lt('start_time', endTime.toISOString())
        .eq('reminder_sent', false)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching blocks needing reminders:', error);
        return [];
      }

      return result || [];
    } catch (error) {
      console.error('Error in SupabaseStudyBlockService.getBlocksNeedingReminders:', error);
      return [];
    }
  }
}