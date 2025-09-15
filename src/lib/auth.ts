import { User } from '@supabase/supabase-js';
import connectDB from './db';
import { User as UserModel } from './models';

export async function syncUser(supabaseUser: User) {
  try {
    await connectDB();

    const existingUser = await UserModel.findOne({
      supabaseId: supabaseUser.id,
    });

    if (!existingUser) {
      // Create new user in MongoDB
      await UserModel.create({
        supabaseId: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name,
      });
    } else {
      // Update existing user if needed
      const updateData: any = {};
      
      if (existingUser.email !== supabaseUser.email) {
        updateData.email = supabaseUser.email;
      }
      
      const newName = supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name;
      if (newName && existingUser.name !== newName) {
        updateData.name = newName;
      }

      if (Object.keys(updateData).length > 0) {
        await UserModel.findByIdAndUpdate(existingUser._id, updateData);
      }
    }

    return true;
  } catch (error) {
    console.error('Error syncing user:', error);
    return false;
  }
}

export async function getUserBySupabaseId(supabaseId: string) {
  try {
    await connectDB();
    return await UserModel.findOne({ supabaseId });
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}