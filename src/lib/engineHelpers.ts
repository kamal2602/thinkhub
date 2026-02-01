import { EngineToggles } from '../services/engineService';

export const ENGINE_NAMES: Record<keyof EngineToggles, string> = {
  reseller_enabled: 'IT Reseller',
  itad_enabled: 'ITAD Services',
  recycling_enabled: 'Recycling',
  auction_enabled: 'Auctions',
  website_enabled: 'eCommerce',
  crm_enabled: 'CRM',
  consignment_enabled: 'Consignment',
};

export const ENGINE_DESCRIPTIONS: Record<keyof EngineToggles, string> = {
  reseller_enabled: 'Buy, refurbish, and sell IT equipment',
  itad_enabled: 'IT Asset Disposition services for enterprise clients',
  recycling_enabled: 'Component harvesting and material recovery',
  auction_enabled: 'Bulk sales through auction channels',
  website_enabled: 'Public storefront for online sales',
  crm_enabled: 'Customer relationship management',
  consignment_enabled: 'Manage customer-owned inventory',
};

/**
 * Check if a specific engine is enabled
 */
export function requireEngine(
  engines: EngineToggles | null,
  engine: keyof EngineToggles
): boolean {
  if (!engines) return false;
  return engines[engine] ?? false;
}

/**
 * Get list of enabled engine keys
 */
export function getEnabledEngines(engines: EngineToggles | null): (keyof EngineToggles)[] {
  if (!engines) return ['reseller_enabled']; // Default
  return Object.entries(engines)
    .filter(([_, enabled]) => enabled)
    .map(([engine]) => engine as keyof EngineToggles);
}

/**
 * Check if any of the specified engines are enabled
 */
export function requireAnyEngine(
  engines: EngineToggles | null,
  requiredEngines: (keyof EngineToggles)[]
): boolean {
  if (!engines) return false;
  return requiredEngines.some(engine => engines[engine] ?? false);
}

/**
 * Check if all of the specified engines are enabled
 */
export function requireAllEngines(
  engines: EngineToggles | null,
  requiredEngines: (keyof EngineToggles)[]
): boolean {
  if (!engines) return false;
  return requiredEngines.every(engine => engines[engine] ?? false);
}

/**
 * Get human-readable name for an engine
 */
export function getEngineName(engine: keyof EngineToggles): string {
  return ENGINE_NAMES[engine];
}

/**
 * Get description for an engine
 */
export function getEngineDescription(engine: keyof EngineToggles): string {
  return ENGINE_DESCRIPTIONS[engine];
}
