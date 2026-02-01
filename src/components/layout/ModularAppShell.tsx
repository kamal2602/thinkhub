import React, { useState, useEffect } from 'react';
import { GlobalTopBar } from './GlobalTopBar';
import { DynamicSidebar } from './DynamicSidebar';
import { PageRouter } from './PageRouter';
import { useCompany } from '../../contexts/CompanyContext';
import { EngineDrivenDashboard } from '../dashboard/EngineDrivenDashboard';
import { AppsInstaller } from '../apps/AppsInstaller';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';
import { Page_Audit_Trail } from '../system/Page_Audit_Trail';
import { Page_Payments } from '../finance/Page_Payments';

interface ModularAppShellProps {
  children?: React.ReactNode;
}

export function ModularAppShell({ children }: ModularAppShellProps) {
  const { selectedCompany, refreshCompanies } = useCompany();
  const [currentPath, setCurrentPath] = useState('/');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    checkOnboarding();
  }, [selectedCompany]);

  useEffect(() => {
    const handleNavigateEvent = (e: any) => {
      setCurrentPath(e.detail);
    };
    window.addEventListener('navigate', handleNavigateEvent);
    return () => window.removeEventListener('navigate', handleNavigateEvent);
  }, []);

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
    setCurrentPath(path);
  };

  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  const renderContent = () => {
    if (currentPath === '/' || currentPath === '/dashboard') {
      return <EngineDrivenDashboard />;
    }

    if (currentPath === '/apps') {
      return <AppsInstaller />;
    }

    if (currentPath === '/audit' || currentPath === '/system/audit') {
      return <Page_Audit_Trail />;
    }

    if (currentPath === '/payments' || currentPath === '/accounting/payments') {
      return <Page_Payments />;
    }

    return <PageRouter path={currentPath} fallback={<EngineDrivenDashboard />} />;
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <GlobalTopBar />
      <div className="flex-1 flex overflow-hidden">
        <DynamicSidebar currentPath={currentPath} onNavigate={handleNavigate} />
        <main className="flex-1 overflow-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
