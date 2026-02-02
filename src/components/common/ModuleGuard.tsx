import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';

interface ModuleGuardProps {
  children: React.ReactNode;
}

export function ModuleGuard({ children }: ModuleGuardProps) {
  const { moduleKey } = useParams<{ moduleKey: string }>();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<Engine | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    checkModuleAccess();
  }, [moduleKey, selectedCompany]);

  const checkModuleAccess = async () => {
    if (!selectedCompany || !moduleKey) {
      setLoading(false);
      return;
    }

    try {
      const engine = await engineRegistryService.getModuleByKey(selectedCompany.id, moduleKey);

      if (!engine) {
        navigate('/');
        return;
      }

      setModule(engine);
      setIsEnabled(engine.is_installed && engine.is_enabled);
    } catch (error) {
      console.error('Error checking module access:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isEnabled && module) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl border-2 border-amber-200 p-8 text-center shadow-lg">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {module.title} is Disabled
            </h2>

            <p className="text-gray-600 mb-6">
              This module is currently disabled. Enable it in the Apps section to access its features.
            </p>

            {module.description && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">{module.description}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => navigate('/apps')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Go to Apps
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
