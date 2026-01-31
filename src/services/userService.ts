import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  company_id?: string;
  is_super_admin: boolean;
  is_active: boolean;
  phone?: string;
  avatar_url?: string;
  department?: string;
  job_title?: string;
  created_at: string;
  last_login?: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  full_name?: string;
  role: string;
  company_id?: string;
  phone?: string;
  department?: string;
  job_title?: string;
}

export interface UpdateUserInput {
  full_name?: string;
  role?: string;
  phone?: string;
  department?: string;
  job_title?: string;
  is_active?: boolean;
}

export interface UserActivity {
  user_id: string;
  activity_type: string;
  activity_description: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

export class UserService extends BaseService {
  async getUsers(companyId: string, filters?: {
    role?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<UserProfile[]> {
    return this.executeQuery(async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('company_id', companyId)
        .order('full_name');

      if (filters?.role) {
        query = query.eq('role', filters.role);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }, 'Failed to fetch users');
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to fetch user');
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    return this.executeQuery(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to fetch current user');
  }

  async createUser(input: CreateUserInput): Promise<UserProfile> {
    return this.executeQuery(async () => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            full_name: input.full_name,
            role: input.role,
            company_id: input.company_id
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const profile = await this.getUserById(authData.user.id);
      if (!profile) throw new Error('Profile not created');

      return profile;
    }, 'Failed to create user');
  }

  async updateUser(id: string, updates: UpdateUserInput): Promise<UserProfile> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to update user');
  }

  async deactivateUser(id: string): Promise<UserProfile> {
    return this.updateUser(id, { is_active: false });
  }

  async activateUser(id: string): Promise<UserProfile> {
    return this.updateUser(id, { is_active: true });
  }

  async deleteUser(id: string): Promise<void> {
    return this.executeQuery(async () => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }, 'Failed to delete user');
  }

  async changeUserRole(id: string, newRole: string): Promise<UserProfile> {
    return this.updateUser(id, { role: newRole });
  }

  async updateUserLastLogin(id: string): Promise<void> {
    return this.executeQuery(async () => {
      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', id);
    }, 'Failed to update last login');
  }

  async getUserActivity(userId: string, limit = 50): Promise<UserActivity[]> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch user activity');
  }

  async logActivity(
    userId: string,
    activityType: string,
    description: string,
    entityType?: string,
    entityId?: string
  ): Promise<void> {
    return this.executeQuery(async () => {
      await supabase.from('user_activity').insert({
        user_id: userId,
        activity_type: activityType,
        activity_description: description,
        entity_type: entityType,
        entity_id: entityId
      });
    }, 'Failed to log user activity');
  }

  async searchUsers(companyId: string, searchTerm: string): Promise<UserProfile[]> {
    return this.getUsers(companyId, { search: searchTerm, isActive: true });
  }

  async getUsersByRole(companyId: string, role: string): Promise<UserProfile[]> {
    return this.getUsers(companyId, { role, isActive: true });
  }

  async getUserStats(companyId: string): Promise<{
    total_users: number;
    active_users: number;
    by_role: Record<string, number>;
  }> {
    return this.executeQuery(async () => {
      const users = await this.getUsers(companyId);

      const stats = users.reduce((acc, user) => {
        acc.total_users++;
        if (user.is_active) acc.active_users++;
        acc.by_role[user.role] = (acc.by_role[user.role] || 0) + 1;
        return acc;
      }, {
        total_users: 0,
        active_users: 0,
        by_role: {} as Record<string, number>
      });

      return stats;
    }, 'Failed to fetch user stats');
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    return this.executeQuery(async () => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
    }, 'Failed to change password');
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    return this.executeQuery(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    }, 'Failed to send password reset email');
  }

  async inviteUser(email: string, role: string, companyId: string): Promise<void> {
    return this.executeQuery(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            role,
            company_id: companyId
          }
        }
      });

      if (error) throw error;
    }, 'Failed to invite user');
  }
}

export const userService = new UserService();
