import { BaseService } from './baseService';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface Page {
  id: string;
  company_id: string;
  slug: string;
  title: string;
  content: any;
  meta_description?: string;
  status: 'draft' | 'published';
  published_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface NavigationMenu {
  id: string;
  company_id: string;
  name: string;
  location: 'header' | 'footer' | 'sidebar';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NavigationItem {
  id: string;
  menu_id: string;
  label: string;
  target_slug?: string;
  external_url?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface WebsiteSettings {
  id: string;
  company_id: string;
  site_name?: string;
  logo_url?: string;
  theme_color?: string;
  custom_css?: string;
  footer_text?: string;
  header_html?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePageInput {
  slug: string;
  title: string;
  content?: any;
  meta_description?: string;
  status?: 'draft' | 'published';
}

export interface UpdatePageInput {
  slug?: string;
  title?: string;
  content?: any;
  meta_description?: string;
  status?: 'draft' | 'published';
}

export interface CreateMenuInput {
  name: string;
  location?: 'header' | 'footer' | 'sidebar';
  is_active?: boolean;
}

export interface CreateNavItemInput {
  menu_id: string;
  label: string;
  target_slug?: string;
  external_url?: string;
  parent_id?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateWebsiteSettingsInput {
  site_name?: string;
  logo_url?: string;
  theme_color?: string;
  custom_css?: string;
  footer_text?: string;
  header_html?: string;
}

// =====================================================
// WEBSITE SERVICE
// =====================================================

class WebsiteService extends BaseService {

  // ===================================================
  // PAGES
  // ===================================================

  async getPages(companyId: string): Promise<Page[]> {
    try {
      const { data, error } = await this.supabase
        .from('pages')
        .select('*')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      return this.handleError(error, 'fetch pages');
    }
  }

  async getPage(companyId: string, id: string): Promise<Page | null> {
    try {
      const { data, error } = await this.supabase
        .from('pages')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'fetch page');
    }
  }

  async getPageBySlug(companyId: string, slug: string): Promise<Page | null> {
    try {
      const { data, error } = await this.supabase
        .from('pages')
        .select('*')
        .eq('company_id', companyId)
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'fetch page by slug');
    }
  }

  async createPage(companyId: string, userId: string, input: CreatePageInput): Promise<Page> {
    try {
      const pageData: any = {
        company_id: companyId,
        created_by: userId,
        slug: input.slug,
        title: input.title,
        content: input.content || [],
        meta_description: input.meta_description,
        status: input.status || 'draft',
      };

      if (input.status === 'published') {
        pageData.published_at = new Date().toISOString();
      }

      const { data, error } = await this.supabase
        .from('pages')
        .insert(pageData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'create page');
    }
  }

  async updatePage(companyId: string, id: string, input: UpdatePageInput): Promise<Page> {
    try {
      const updateData: any = { ...input };

      // Set published_at when publishing
      if (input.status === 'published') {
        const currentPage = await this.getPage(companyId, id);
        if (currentPage?.status !== 'published') {
          updateData.published_at = new Date().toISOString();
        }
      }

      const { data, error } = await this.supabase
        .from('pages')
        .update(updateData)
        .eq('company_id', companyId)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'update page');
    }
  }

  async publishPage(companyId: string, id: string): Promise<Page> {
    return this.updatePage(companyId, id, {
      status: 'published',
    });
  }

  async unpublishPage(companyId: string, id: string): Promise<Page> {
    return this.updatePage(companyId, id, {
      status: 'draft',
    });
  }

  async deletePage(companyId: string, id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('pages')
        .delete()
        .eq('company_id', companyId)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      return this.handleError(error, 'delete page');
    }
  }

  // ===================================================
  // PUBLIC PAGE ACCESS (No Auth Required)
  // ===================================================

  async getPublishedPage(companyId: string, slug: string): Promise<Page | null> {
    try {
      const { data, error } = await this.supabase
        .from('pages')
        .select('*')
        .eq('company_id', companyId)
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'fetch published page');
    }
  }

  // ===================================================
  // NAVIGATION MENUS
  // ===================================================

  async getMenus(companyId: string): Promise<NavigationMenu[]> {
    try {
      const { data, error } = await this.supabase
        .from('navigation_menus')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      return this.handleError(error, 'fetch menus');
    }
  }

  async getMenu(companyId: string, id: string): Promise<NavigationMenu | null> {
    try {
      const { data, error } = await this.supabase
        .from('navigation_menus')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'fetch menu');
    }
  }

  async createMenu(companyId: string, input: CreateMenuInput): Promise<NavigationMenu> {
    try {
      const { data, error } = await this.supabase
        .from('navigation_menus')
        .insert({
          company_id: companyId,
          name: input.name,
          location: input.location || 'header',
          is_active: input.is_active !== false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'create menu');
    }
  }

  async updateMenu(companyId: string, id: string, input: Partial<CreateMenuInput>): Promise<NavigationMenu> {
    try {
      const { data, error } = await this.supabase
        .from('navigation_menus')
        .update(input)
        .eq('company_id', companyId)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'update menu');
    }
  }

  async deleteMenu(companyId: string, id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('navigation_menus')
        .delete()
        .eq('company_id', companyId)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      return this.handleError(error, 'delete menu');
    }
  }

  // ===================================================
  // NAVIGATION ITEMS
  // ===================================================

  async getNavigationItems(menuId: string): Promise<NavigationItem[]> {
    try {
      const { data, error } = await this.supabase
        .from('navigation_items')
        .select('*')
        .eq('menu_id', menuId)
        .order('sort_order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      return this.handleError(error, 'fetch navigation items');
    }
  }

  async createNavigationItem(input: CreateNavItemInput): Promise<NavigationItem> {
    try {
      const { data, error } = await this.supabase
        .from('navigation_items')
        .insert({
          menu_id: input.menu_id,
          label: input.label,
          target_slug: input.target_slug,
          external_url: input.external_url,
          parent_id: input.parent_id,
          sort_order: input.sort_order || 0,
          is_active: input.is_active !== false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'create navigation item');
    }
  }

  async updateNavigationItem(id: string, input: Partial<CreateNavItemInput>): Promise<NavigationItem> {
    try {
      const { data, error } = await this.supabase
        .from('navigation_items')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'update navigation item');
    }
  }

  async deleteNavigationItem(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('navigation_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      return this.handleError(error, 'delete navigation item');
    }
  }

  async reorderNavigationItems(menuId: string, itemIds: string[]): Promise<void> {
    try {
      // Update sort_order for each item
      const updates = itemIds.map((id, index) =>
        this.supabase
          .from('navigation_items')
          .update({ sort_order: index })
          .eq('id', id)
      );

      await Promise.all(updates);
    } catch (error) {
      return this.handleError(error, 'reorder navigation items');
    }
  }

  // ===================================================
  // PUBLIC NAVIGATION ACCESS (No Auth Required)
  // ===================================================

  async getPublicMenus(companyId: string): Promise<NavigationMenu[]> {
    try {
      const { data, error } = await this.supabase
        .from('navigation_menus')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      return this.handleError(error, 'fetch public menus');
    }
  }

  async getPublicNavigationItems(menuId: string): Promise<NavigationItem[]> {
    try {
      const { data, error } = await this.supabase
        .from('navigation_items')
        .select('*')
        .eq('menu_id', menuId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      return this.handleError(error, 'fetch public navigation items');
    }
  }

  // ===================================================
  // WEBSITE SETTINGS
  // ===================================================

  async getWebsiteSettings(companyId: string): Promise<WebsiteSettings | null> {
    try {
      const { data, error } = await this.supabase
        .from('website_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'fetch website settings');
    }
  }

  async updateWebsiteSettings(
    companyId: string,
    input: UpdateWebsiteSettingsInput
  ): Promise<WebsiteSettings> {
    try {
      // Check if settings exist
      const existing = await this.getWebsiteSettings(companyId);

      if (existing) {
        // Update existing
        const { data, error } = await this.supabase
          .from('website_settings')
          .update(input)
          .eq('company_id', companyId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await this.supabase
          .from('website_settings')
          .insert({
            company_id: companyId,
            ...input,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      return this.handleError(error, 'update website settings');
    }
  }

  // ===================================================
  // PUBLIC SETTINGS ACCESS (No Auth Required)
  // ===================================================

  async getPublicWebsiteSettings(companyId: string): Promise<WebsiteSettings | null> {
    try {
      const { data, error } = await this.supabase
        .from('website_settings')
        .select('id, company_id, site_name, logo_url, theme_color, custom_css, footer_text, header_html')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'fetch public website settings');
    }
  }

  // ===================================================
  // UTILITY METHODS
  // ===================================================

  async getPageStats(companyId: string): Promise<{
    total: number;
    published: number;
    draft: number;
  }> {
    try {
      const pages = await this.getPages(companyId);

      return {
        total: pages.length,
        published: pages.filter(p => p.status === 'published').length,
        draft: pages.filter(p => p.status === 'draft').length,
      };
    } catch (error) {
      return this.handleError(error, 'fetch page stats');
    }
  }

  validateSlug(slug: string): boolean {
    // Slugs should be lowercase, alphanumeric with hyphens
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug);
  }

  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
  }
}

export const websiteService = new WebsiteService();
