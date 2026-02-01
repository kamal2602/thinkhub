import { supabase } from '../lib/supabase';

export interface Engine {
  id: string;
  company_id: string;
  key: string;
  title: string;
  description: string | null;
  icon: string;
  category: 'operations' | 'sales' | 'business' | 'system' | 'admin';
  is_core: boolean;
  is_installed: boolean;
  is_enabled: boolean;
  depends_on: string[];
  workspace_route: string | null;
  settings_route: string | null;
  version: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export class EngineRegistryService {
  async getEngines(companyId: string): Promise<Engine[]> {
    const { data, error } = await supabase
      .from('engines')
      .select('*')
      .eq('company_id', companyId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getEnabledEngines(companyId: string): Promise<Engine[]> {
    const { data, error } = await supabase
      .from('engines')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_installed', true)
      .eq('is_enabled', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getEnginesByCategory(companyId: string, category: string): Promise<Engine[]> {
    const { data, error } = await supabase
      .from('engines')
      .select('*')
      .eq('company_id', companyId)
      .eq('category', category)
      .eq('is_installed', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getEngine(companyId: string, key: string): Promise<Engine | null> {
    const { data, error } = await supabase
      .from('engines')
      .select('*')
      .eq('company_id', companyId)
      .eq('key', key)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async toggleEngine(companyId: string, key: string, enabled: boolean): Promise<void> {
    const engine = await this.getEngine(companyId, key);
    if (!engine) throw new Error('Engine not found');

    if (engine.is_core && !enabled) {
      throw new Error('Core engines cannot be disabled');
    }

    if (enabled) {
      await this.checkDependencies(companyId, engine);
    }

    const { error } = await supabase
      .from('engines')
      .update({
        is_enabled: enabled,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('key', key);

    if (error) throw error;
  }

  async installEngine(companyId: string, key: string): Promise<void> {
    const engine = await this.getEngine(companyId, key);
    if (!engine) throw new Error('Engine not found');

    await this.checkDependencies(companyId, engine);

    const { error } = await supabase
      .from('engines')
      .update({
        is_installed: true,
        is_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('key', key);

    if (error) throw error;
  }

  async uninstallEngine(companyId: string, key: string): Promise<void> {
    const engine = await this.getEngine(companyId, key);
    if (!engine) throw new Error('Engine not found');

    if (engine.is_core) {
      throw new Error('Core engines cannot be uninstalled');
    }

    const allEngines = await this.getEngines(companyId);
    const dependents = allEngines.filter(e =>
      e.is_enabled &&
      e.depends_on.includes(key)
    );

    if (dependents.length > 0) {
      throw new Error(
        `Cannot uninstall ${engine.title}. The following engines depend on it: ${
          dependents.map(e => e.title).join(', ')
        }`
      );
    }

    const { error } = await supabase
      .from('engines')
      .update({
        is_installed: false,
        is_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('key', key);

    if (error) throw error;
  }

  private async checkDependencies(companyId: string, engine: Engine): Promise<void> {
    if (!engine.depends_on || engine.depends_on.length === 0) {
      return;
    }

    const allEngines = await this.getEngines(companyId);
    const missingDeps = engine.depends_on.filter(depKey => {
      const dep = allEngines.find(e => e.key === depKey);
      return !dep || !dep.is_installed || !dep.is_enabled;
    });

    if (missingDeps.length > 0) {
      const depEngines = allEngines.filter(e => missingDeps.includes(e.key));
      throw new Error(
        `Cannot enable ${engine.title}. Missing dependencies: ${
          depEngines.map(e => e.title).join(', ')
        }`
      );
    }
  }

  async getEngineGroups(companyId: string): Promise<Record<string, Engine[]>> {
    const engines = await this.getEngines(companyId);

    return {
      operations: engines.filter(e => e.category === 'operations' && e.is_installed).sort((a, b) => a.title.localeCompare(b.title)),
      sales: engines.filter(e => e.category === 'sales' && e.is_installed).sort((a, b) => a.title.localeCompare(b.title)),
      business: engines.filter(e => e.category === 'business' && e.is_installed).sort((a, b) => a.title.localeCompare(b.title)),
      system: engines.filter(e => e.category === 'system' && e.is_installed).sort((a, b) => a.title.localeCompare(b.title)),
      admin: engines.filter(e => e.category === 'admin' && e.is_installed).sort((a, b) => a.title.localeCompare(b.title))
    };
  }

  async getEnabledEngineGroups(companyId: string): Promise<Record<string, Engine[]>> {
    const engines = await this.getEnabledEngines(companyId);

    return {
      operations: engines.filter(e => e.category === 'operations').sort((a, b) => a.title.localeCompare(b.title)),
      sales: engines.filter(e => e.category === 'sales').sort((a, b) => a.title.localeCompare(b.title)),
      business: engines.filter(e => e.category === 'business').sort((a, b) => a.title.localeCompare(b.title)),
      system: engines.filter(e => e.category === 'system').sort((a, b) => a.title.localeCompare(b.title)),
      admin: engines.filter(e => e.category === 'admin').sort((a, b) => a.title.localeCompare(b.title))
    };
  }

  async getMissingDependencies(companyId: string, engineKey: string): Promise<Engine[]> {
    const engine = await this.getEngine(companyId, engineKey);
    if (!engine || !engine.depends_on || engine.depends_on.length === 0) {
      return [];
    }

    const allEngines = await this.getEngines(companyId);
    const missingDeps = engine.depends_on.filter(depKey => {
      const dep = allEngines.find(e => e.key === depKey);
      return !dep || !dep.is_installed || !dep.is_enabled;
    });

    return allEngines.filter(e => missingDeps.includes(e.key));
  }

  async enableWithDependencies(companyId: string, engineKey: string): Promise<void> {
    const engine = await this.getEngine(companyId, engineKey);
    if (!engine) throw new Error('Engine not found');

    const missingDeps = await this.getMissingDependencies(companyId, engineKey);

    for (const dep of missingDeps) {
      await this.toggleEngine(companyId, dep.key, true);
    }

    await this.toggleEngine(companyId, engineKey, true);
  }
}

export const engineRegistryService = new EngineRegistryService();
