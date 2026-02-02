import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  default_landing_route?: string;
}

export class UserLandingService {
  async getUserLandingRoute(userId: string): Promise<string> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, default_landing_route')
      .eq('id', userId)
      .maybeSingle();

    if (error || !profile) {
      return '/';
    }

    if (profile.default_landing_route) {
      return profile.default_landing_route;
    }

    return this.inferLandingRouteFromRole(profile.role);
  }

  private inferLandingRouteFromRole(role: string): string {
    const roleMap: Record<string, string> = {
      technician: '/processing',
      warehouse: '/receiving',
      compliance: '/itad',
      admin: '/',
      manager: '/',
      sales: '/resale',
      accountant: '/accounting'
    };

    return roleMap[role.toLowerCase()] || '/';
  }

  async setUserLandingRoute(userId: string, route: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ default_landing_route: route })
      .eq('id', userId);

    if (error) throw error;
  }
}

export const userLandingService = new UserLandingService();
