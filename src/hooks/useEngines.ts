import { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { engineService, EngineToggles } from '../services/engineService';

export function useEngines() {
  const { selectedCompany } = useCompany();
  const [engines, setEngines] = useState<EngineToggles | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompany?.id) {
      loadEngines();
    } else {
      setEngines(null);
      setLoading(false);
    }
  }, [selectedCompany?.id]);

  const loadEngines = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      const toggles = await engineService.getEngineToggles(selectedCompany.id);
      setEngines(toggles);
    } catch (error) {
      console.error('Failed to load engine toggles:', error);
      // SAFE DEFAULT: All engines disabled if loading fails
      // Admin can refresh or check settings
      setEngines({
        reseller_enabled: false,
        itad_enabled: false,
        recycling_enabled: false,
        auction_enabled: false,
        website_enabled: false,
        crm_enabled: false,
        consignment_enabled: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const isEnabled = (engine: keyof EngineToggles): boolean => {
    return engines?.[engine] ?? false;
  };

  return {
    engines,
    loading,
    isEnabled,
    refresh: loadEngines,
  };
}
