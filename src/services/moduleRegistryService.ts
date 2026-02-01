import { supabase } from '../lib/supabase';

export interface ModuleCategory {
  id: string;
  code: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
}

export interface Module {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  category: string;
  icon: string;
  route: string | null;
  color: string | null;
  is_core: boolean;
  is_enabled: boolean;
  depends_on: string[];
  sort_order: number;
  version: string;
}

export interface CompanyModule {
  id: string;
  company_id: string;
  module_name: string;
  is_enabled: boolean;
  settings: Record<string, any>;
  enabled_at: string | null;
}

export interface OnboardingStatus {
  id: string;
  company_id: string;
  is_completed: boolean;
  current_step: string;
  completed_steps: string[];
  modules_selected: string[];
  completed_at: string | null;
}

class ModuleRegistryService {
  async getModuleCategories(): Promise<ModuleCategory[]> {
    const { data, error } = await supabase
      .from('module_categories')
      .select('*')
      .order('sort_order');

    if (error) throw error;
    return data || [];
  }

  async getAllModules(): Promise<Module[]> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('sort_order');

    if (error) throw error;
    return data || [];
  }

  async getModulesByCategory(category: string): Promise<Module[]> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('category', category)
      .order('sort_order');

    if (error) throw error;
    return data || [];
  }

  async getEnabledModules(companyId: string): Promise<Module[]> {
    const { data: companyModules, error: cmError } = await supabase
      .from('company_modules')
      .select('module_name')
      .eq('company_id', companyId)
      .eq('is_enabled', true);

    if (cmError) throw cmError;

    const { data: allModules, error: mError } = await supabase
      .from('modules')
      .select('*')
      .order('sort_order');

    if (mError) throw mError;

    const enabledModuleNames = new Set(companyModules?.map(cm => cm.module_name) || []);

    return (allModules || []).filter(m => enabledModuleNames.has(m.name));
  }

  async getModulesGroupedByCategory(companyId: string): Promise<Record<string, Module[]>> {
    const [modules, categories] = await Promise.all([
      this.getEnabledModules(companyId),
      this.getModuleCategories()
    ]);

    const grouped: Record<string, Module[]> = {};

    categories.forEach(category => {
      grouped[category.code] = modules.filter(m => m.category === category.code);
    });

    return grouped;
  }

  async isModuleEnabled(companyId: string, moduleName: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('company_modules')
      .select('is_enabled')
      .eq('company_id', companyId)
      .eq('module_name', moduleName)
      .maybeSingle();

    if (error) throw error;
    return data?.is_enabled ?? false;
  }

  async enableModule(companyId: string, moduleName: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('company_modules')
      .upsert({
        company_id: companyId,
        module_name: moduleName,
        is_enabled: true,
        enabled_at: new Date().toISOString(),
        enabled_by: userId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_id,module_name'
      });

    if (error) throw error;
  }

  async disableModule(companyId: string, moduleName: string): Promise<void> {
    const { error } = await supabase
      .from('company_modules')
      .update({
        is_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('module_name', moduleName);

    if (error) throw error;
  }

  async updateModuleSettings(
    companyId: string,
    moduleName: string,
    settings: Record<string, any>
  ): Promise<void> {
    const { error } = await supabase
      .from('company_modules')
      .update({
        settings,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('module_name', moduleName);

    if (error) throw error;
  }

  async getModuleSettings(companyId: string, moduleName: string): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('company_modules')
      .select('settings')
      .eq('company_id', companyId)
      .eq('module_name', moduleName)
      .maybeSingle();

    if (error) throw error;
    return data?.settings ?? {};
  }

  async getOnboardingStatus(companyId: string): Promise<OnboardingStatus | null> {
    const { data, error } = await supabase
      .from('onboarding_status')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async updateOnboardingStatus(
    companyId: string,
    updates: Partial<OnboardingStatus>
  ): Promise<void> {
    const { error } = await supabase
      .from('onboarding_status')
      .upsert({
        company_id: companyId,
        ...updates,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_id'
      });

    if (error) throw error;
  }

  async completeOnboarding(companyId: string): Promise<void> {
    await this.updateOnboardingStatus(companyId, {
      is_completed: true,
      completed_at: new Date().toISOString()
    });
  }

  async checkModuleDependencies(moduleName: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('modules')
      .select('depends_on')
      .eq('name', moduleName)
      .maybeSingle();

    if (error) throw error;
    return data?.depends_on ?? [];
  }

  async getModuleDependencyTree(moduleName: string): Promise<Set<string>> {
    const dependencies = new Set<string>();
    const toCheck = [moduleName];
    const checked = new Set<string>();

    while (toCheck.length > 0) {
      const current = toCheck.pop()!;
      if (checked.has(current)) continue;
      checked.add(current);

      const deps = await this.checkModuleDependencies(current);
      deps.forEach(dep => {
        dependencies.add(dep);
        if (!checked.has(dep)) {
          toCheck.push(dep);
        }
      });
    }

    return dependencies;
  }

  async canEnableModule(companyId: string, moduleName: string): Promise<{
    can: boolean;
    missingDependencies: string[];
  }> {
    const dependencies = await this.checkModuleDependencies(moduleName);
    const missingDependencies: string[] = [];

    for (const dep of dependencies) {
      const isEnabled = await this.isModuleEnabled(companyId, dep);
      if (!isEnabled) {
        missingDependencies.push(dep);
      }
    }

    return {
      can: missingDependencies.length === 0,
      missingDependencies
    };
  }
}

export const moduleRegistryService = new ModuleRegistryService();
