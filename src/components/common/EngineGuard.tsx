import { ReactNode } from 'react';
import { Shield, Settings } from 'lucide-react';
import { useEngines } from '../../hooks/useEngines';
import { EngineToggles } from '../../services/engineService';
import { getEngineName } from '../../lib/engineHelpers';
import { CardGridSkeleton } from './LoadingSkeletons';

interface EngineGuardProps {
  engine: keyof EngineToggles;
  children: ReactNode;
  fallback?: ReactNode;
}

export function EngineGuard({ engine, children, fallback }: EngineGuardProps) {
  const { isEnabled, loading } = useEngines();

  if (loading) {
    return <CardGridSkeleton count={3} />;
  }

  if (!isEnabled(engine)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
            <Shield className="w-10 h-10 text-slate-400" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            Module Not Enabled
          </h2>

          <p className="text-slate-600 mb-6">
            The <strong>{getEngineName(engine)}</strong> module is not enabled for your company.
            Contact your administrator to enable this feature.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-left">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900 mb-1">
                  For Administrators
                </p>
                <p className="text-blue-700">
                  Enable this module in Settings → Engine Toggles to unlock these features.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
