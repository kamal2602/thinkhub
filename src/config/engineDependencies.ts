/**
 * @deprecated This file is LEGACY and uses the old EngineToggles pattern.
 * Dependencies are now managed in the engines table via depends_on array.
 * Use engineRegistryService.getMissingDependencies() instead.
 */

import { EngineToggles } from '../services/engineService';

export interface EngineDependency {
  requires: (keyof EngineToggles)[];
}

/**
 * @deprecated Dependencies are now in the database engines table
 */
export const ENGINE_DEPENDENCIES: Partial<Record<keyof EngineToggles, EngineDependency>> = {
  website_enabled: { requires: ['reseller_enabled'] },
  auction_enabled: { requires: ['reseller_enabled'] },
  consignment_enabled: { requires: ['reseller_enabled'] },
};

/**
 * @deprecated Use engineRegistryService methods instead
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  suggestedFix?: Partial<EngineToggles>;
}

export function validateEngineSelection(
  currentToggles: EngineToggles,
  nextToggles: Partial<EngineToggles>
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
  };

  const mergedToggles = { ...currentToggles, ...nextToggles };
  const errors: string[] = [];
  const suggestedFix: Partial<EngineToggles> = {};

  for (const [engineKey, config] of Object.entries(ENGINE_DEPENDENCIES)) {
    const engine = engineKey as keyof EngineToggles;

    if (mergedToggles[engine]) {
      for (const requiredEngine of config.requires) {
        if (!mergedToggles[requiredEngine]) {
          errors.push(
            `${getEngineName(engine)} requires ${getEngineName(requiredEngine)} to be enabled`
          );
          suggestedFix[requiredEngine] = true;
        }
      }
    }
  }

  for (const [engineKey, isEnabled] of Object.entries(nextToggles)) {
    const engine = engineKey as keyof EngineToggles;

    if (isEnabled === false) {
      const dependents = Object.entries(ENGINE_DEPENDENCIES)
        .filter(([_, config]) => config.requires.includes(engine))
        .map(([dep]) => dep as keyof EngineToggles)
        .filter((dep) => mergedToggles[dep]);

      if (dependents.length > 0) {
        errors.push(
          `${getEngineName(engine)} is required by ${dependents.map(getEngineName).join(', ')}`
        );
        dependents.forEach((dep) => {
          suggestedFix[dep] = false;
        });
      }
    }
  }

  if (errors.length > 0) {
    result.valid = false;
    result.errors = errors;
    result.suggestedFix = suggestedFix;
  }

  return result;
}

function getEngineName(engine: keyof EngineToggles): string {
  const names: Record<keyof EngineToggles, string> = {
    reseller_enabled: 'Reseller',
    itad_enabled: 'ITAD',
    recycling_enabled: 'Recycling',
    auction_enabled: 'Auction',
    website_enabled: 'Website',
    crm_enabled: 'CRM',
    consignment_enabled: 'Consignment',
  };
  return names[engine];
}

export interface DependencyInfo {
  engineBeingToggled: keyof EngineToggles;
  action: 'enable' | 'disable';
  dependenciesToEnable?: (keyof EngineToggles)[];
  dependentsToDisable?: (keyof EngineToggles)[];
}

export function getDependencyInfo(
  currentToggles: EngineToggles,
  engine: keyof EngineToggles,
  newValue: boolean
): DependencyInfo | null {
  const info: DependencyInfo = {
    engineBeingToggled: engine,
    action: newValue ? 'enable' : 'disable',
  };

  if (newValue) {
    const dependency = ENGINE_DEPENDENCIES[engine];
    if (dependency) {
      const missingDeps = dependency.requires.filter((req) => !currentToggles[req]);
      if (missingDeps.length > 0) {
        info.dependenciesToEnable = missingDeps;
        return info;
      }
    }
  } else {
    const dependents = Object.entries(ENGINE_DEPENDENCIES)
      .filter(([_, config]) => config.requires.includes(engine))
      .map(([dep]) => dep as keyof EngineToggles)
      .filter((dep) => currentToggles[dep]);

    if (dependents.length > 0) {
      info.dependentsToDisable = dependents;
      return info;
    }
  }

  return null;
}
