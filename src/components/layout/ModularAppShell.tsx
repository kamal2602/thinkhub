import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { GlobalTopBar } from './GlobalTopBar';
import { DynamicSidebar } from './DynamicSidebar';
import { PageRouter } from './PageRouter';
import { useCompany } from '../../contexts/CompanyContext';
import { engineRegistryService } from '../../services/engineRegistryService';
import { EngineDrivenDashboard } from '../dashboard/EngineDrivenDashboard';
import { AppsInstaller } from '../apps/AppsInstaller';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';
import { Page_Audit_Trail } from '../system/Page_Audit_Trail';
import { Page_Payments } from '../finance/Page_Payments';
import { ModuleGate } from '../common/ModuleGate';
import { SystemConfig } from '../settings/SystemConfig';

interface ModularAppShellProps {
  children?: React.ReactNode;
}

export function ModularAppShell({ children }: ModularAppShellProps) {
  const { selectedCompany, refreshCompanies } = useCompany();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    checkOnboarding();
  }, [selectedCompany]);

  const checkOnboarding = () => {
    if (selectedCompany && !selectedCompany.onboarding_completed) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  };

  const handleOnboardingComplete = async () => {
    await refreshCompanies();
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <GlobalTopBar />
      <div className="flex-1 flex overflow-hidden">
        <DynamicSidebar currentPath={location.pathname} onNavigate={handleNavigate} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<EngineDrivenDashboard />} />
            <Route path="/dashboard" element={<EngineDrivenDashboard />} />
            <Route path="/apps" element={<AppsInstaller />} />
            <Route path="/settings" element={<SystemConfig />} />
            <Route path="/audit" element={<Page_Audit_Trail />} />
            <Route path="/system/audit" element={<Page_Audit_Trail />} />
            <Route path="/payments" element={<Page_Payments />} />
            <Route path="/accounting/payments" element={<Page_Payments />} />
            <Route path="/*" element={<DynamicEngineRoute />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function DynamicEngineRoute() {
  const location = useLocation();
  const { selectedCompany } = useCompany();
  const [engine, setEngine] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEngine();
  }, [location.pathname, selectedCompany]);

  const loadEngine = async () => {
    if (!selectedCompany) return;

    const pathParts = location.pathname.split('/').filter(Boolean);
    const engineKey = pathParts[0];

    if (!engineKey) {
      setLoading(false);
      return;
    }

    try {
      const foundEngine = await engineRegistryService.getEngine(selectedCompany.id, engineKey);
      setEngine(foundEngine);
    } catch (error) {
      console.error('Error loading engine:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!engine) {
    return <PageRouter path={location.pathname} fallback={<EngineDrivenDashboard />} />;
  }

  if (!engine.is_enabled) {
    return <ModuleGate engineTitle={engine.title} engineIcon={engine.icon} engineKey={engine.key} />;
  }

  return <PageRouter path={location.pathname} fallback={<EngineDrivenDashboard />} />;
}
