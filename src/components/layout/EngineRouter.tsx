import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ModuleGuard } from '../common/ModuleGuard';
import { DynamicEngineWorkspace } from './DynamicEngineWorkspace';

const ModuleVisibilityAuditor = lazy(() => import('../system/ModuleVisibilityAuditor').then(m => ({ default: m.ModuleVisibilityAuditor })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full min-h-screen">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

export function EngineRouter() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/module-auditor" element={<ModuleVisibilityAuditor />} />

        <Route path="/:engineKey/*" element={
          <ModuleGuard>
            <DynamicEngineWorkspace />
          </ModuleGuard>
        } />
      </Routes>
    </Suspense>
  );
}
