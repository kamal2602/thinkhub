import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, ArrowRight } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';
import { hasEngineComponent } from '../../config/engineComponentMap';

interface AuditResult {
  engineKey: string;
  title: string;
  registryExists: boolean;
  installed: boolean;
  enabled: boolean;
  hasWorkspaceRoute: boolean;
  workspaceRoute: string | null;
  routeMatchesKey: boolean;
  category: string;
  sortOrder: number;
  hasComponent: boolean;
  dependenciesMet: boolean;
  visibleInLauncher: boolean;
  visibleInSidebar: boolean;
  issues: string[];
  recommendations: string[];
  quickFix: string | null;
}

export function ModuleVisibilityAuditor() {
  const { selectedCompany } = useCompany();
  const { addToast } = useToast();
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runAudit();
  }, [selectedCompany]);

  const runAudit = async () => {
    if (!selectedCompany) return;

    try {
      const engines = await engineRegistryService.getEngines(selectedCompany.id);

      const results: AuditResult[] = await Promise.all(
        engines.map(async (engine) => {
          const issues: string[] = [];
          const recommendations: string[] = [];
          let quickFix: string | null = null;

          const expectedRoute = `/${engine.key}`;
          const routeMatchesKey = engine.workspace_route === expectedRoute;

          if (!hasEngineComponent(engine.key)) {
            issues.push('No component mapped - will show "Coming Soon" page');
            recommendations.push('Add component to ENGINE_COMPONENT_MAP');
            quickFix = `Add '${engine.key}': lazy(() => import('...')) to ENGINE_COMPONENT_MAP`;
          }

          if (!engine.workspace_route) {
            issues.push('No workspace route defined');
            recommendations.push('Set workspace_route in engines table');
          } else if (!routeMatchesKey) {
            issues.push(`Route mismatch: expected ${expectedRoute}, got ${engine.workspace_route}`);
            recommendations.push(`Update workspace_route to ${expectedRoute}`);
            if (!quickFix) {
              quickFix = `UPDATE engines SET workspace_route = '${expectedRoute}' WHERE key = '${engine.key}'`;
            }
          }

          let dependenciesMet = true;
          if (engine.depends_on && engine.depends_on.length > 0) {
            const missingDeps = await engineRegistryService.getMissingDependencies(
              selectedCompany.id,
              engine.key
            );
            if (missingDeps.length > 0) {
              dependenciesMet = false;
              issues.push(`Missing dependencies: ${missingDeps.map(d => d.title).join(', ')}`);
              recommendations.push('Enable required dependencies first');
            }
          }

          if (!engine.is_installed) {
            issues.push('Module not installed');
            recommendations.push('Install module from Apps page');
          }

          if (engine.is_installed && !engine.is_enabled) {
            issues.push('Module installed but disabled');
            recommendations.push('Enable module from Apps page');
            if (!quickFix) {
              quickFix = 'Click "Enable" button to activate this module';
            }
          }

          const visibleInLauncher = engine.is_installed && engine.is_enabled && dependenciesMet;
          const visibleInSidebar = visibleInLauncher;

          return {
            engineKey: engine.key,
            title: engine.title,
            registryExists: true,
            installed: engine.is_installed,
            enabled: engine.is_enabled,
            hasWorkspaceRoute: !!engine.workspace_route,
            workspaceRoute: engine.workspace_route || null,
            routeMatchesKey,
            category: engine.category || 'Other',
            sortOrder: engine.sort_order || 0,
            hasComponent: hasEngineComponent(engine.key),
            dependenciesMet,
            visibleInLauncher,
            visibleInSidebar,
            issues,
            recommendations,
            quickFix,
          };
        })
      );

      setAuditResults(results);
    } catch (error) {
      console.error('Audit failed:', error);
      addToast('Failed to run module audit', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (engineKey: string) => {
    if (!selectedCompany) return;

    try {
      await engineRegistryService.toggleEngine(selectedCompany.id, engineKey, true);
      addToast('Module enabled successfully', 'success');
      runAudit();
    } catch (error: any) {
      addToast(error.message || 'Failed to enable module', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Running audit...</p>
        </div>
      </div>
    );
  }

  const visibleCount = auditResults.filter(r => r.visibleInLauncher).length;
  const hiddenCount = auditResults.length - visibleCount;
  const issueCount = auditResults.filter(r => r.issues.length > 0).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Module Visibility Auditor</h1>
        <p className="text-gray-600">
          Diagnose why modules are not appearing in the UI and get recommendations to fix issues.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-900">Visible Modules</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{visibleCount}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-900">Hidden Modules</span>
          </div>
          <p className="text-3xl font-bold text-amber-600">{hiddenCount}</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-900">With Issues</span>
          </div>
          <p className="text-3xl font-bold text-red-600">{issueCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Module</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Route</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Route Valid</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Component</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Installed</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Enabled</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Deps OK</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Visible</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Issues & Quick Fix</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {auditResults.map((result) => (
              <tr key={result.engineKey} className={!result.visibleInLauncher ? 'bg-red-50' : ''}>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-gray-900">{result.title}</div>
                    <div className="text-xs text-gray-500 font-mono">{result.engineKey}</div>
                    <div className="text-xs text-gray-400">{result.category}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {result.workspaceRoute || 'none'}
                  </code>
                </td>
                <td className="px-4 py-3 text-center">
                  {result.routeMatchesKey ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mx-auto" title={`Expected: /${result.engineKey}`} />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {result.hasComponent ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto" title="Will show Coming Soon page" />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {result.installed ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {result.enabled ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {result.dependenciesMet ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {result.visibleInLauncher ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Visible
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Hidden
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {result.issues.length > 0 ? (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        {result.issues.map((issue, idx) => (
                          <div key={idx} className="flex items-start gap-1 text-xs text-red-600">
                            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{issue}</span>
                          </div>
                        ))}
                      </div>
                      {result.quickFix && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-2">
                          <div className="text-xs font-medium text-blue-900 mb-1">Quick Fix:</div>
                          <code className="text-xs text-blue-700 block break-all">{result.quickFix}</code>
                        </div>
                      )}
                      {!result.enabled && result.installed && (
                        <button
                          onClick={() => handleEnable(result.engineKey)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                        >
                          Enable Now
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      No issues
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {auditResults.filter(r => r.recommendations.length > 0).length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Recommendations
          </h3>
          <ul className="space-y-1 text-sm text-blue-800">
            {auditResults
              .filter(r => r.recommendations.length > 0)
              .map((result) =>
                result.recommendations.map((rec, idx) => (
                  <li key={`${result.engineKey}-${idx}`} className="flex items-start gap-2">
                    <span className="font-medium">{result.title}:</span>
                    <span>{rec}</span>
                  </li>
                ))
              )}
          </ul>
        </div>
      )}
    </div>
  );
}
