import { Suspense, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';
import { getEngineComponent, hasEngineComponent } from '../../config/engineComponentMap';

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full min-h-screen">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-sm text-gray-600">Loading workspace...</p>
    </div>
  </div>
);

function ComingSoonWorkspace({ engine }: { engine: Engine }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-full min-h-screen bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl border-2 border-blue-200 p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {engine.title} - Coming Soon
          </h2>

          <p className="text-gray-600 mb-6">
            This module is enabled but its workspace interface is under development.
            Check back soon for updates!
          </p>

          {engine.description && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">{engine.description}</p>
            </div>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function UnknownModulePage() {
  const navigate = useNavigate();
  const { engineKey } = useParams();

  return (
    <div className="flex items-center justify-center h-full min-h-screen bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl border-2 border-red-200 p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Module Not Found
          </h2>

          <p className="text-gray-600 mb-6">
            The module "{engineKey}" does not exist in this system.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/apps')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Browse Available Apps
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

export function DynamicEngineWorkspace() {
  const { engineKey } = useParams<{ engineKey: string }>();
  const { selectedCompany } = useCompany();
  const [engine, setEngine] = useState<Engine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadEngine();
  }, [engineKey, selectedCompany]);

  const loadEngine = async () => {
    if (!selectedCompany || !engineKey) {
      setLoading(false);
      setError(true);
      return;
    }

    try {
      const engineData = await engineRegistryService.getEngine(
        selectedCompany.id,
        engineKey
      );

      if (!engineData) {
        setError(true);
      } else {
        setEngine(engineData);
      }
    } catch (err) {
      console.error('Error loading engine:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingFallback />;
  }

  if (error || !engine) {
    return <UnknownModulePage />;
  }

  const WorkspaceComponent = getEngineComponent(engineKey!);

  if (!WorkspaceComponent) {
    return <ComingSoonWorkspace engine={engine} />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <WorkspaceComponent />
    </Suspense>
  );
}
