import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { GlobalTopBar } from './GlobalTopBar';
import { RegistryDrivenSidebar } from './RegistryDrivenSidebar';
import { EngineRouter } from './EngineRouter';
import { useCompany } from '../../contexts/CompanyContext';
import { supabase } from '../../lib/supabase';
import { ModernAppLauncher } from '../launchpad/ModernAppLauncher';
import { EngineDrivenDashboard } from '../dashboard/EngineDrivenDashboard';
import { CompanyOnboardingWizard } from '../onboarding/CompanyOnboardingWizard';
import { InitialSetup } from '../onboarding/InitialSetup';

interface ModularAppShellProps {
  children?: React.ReactNode;
}

export function ModularAppShell({ children }: ModularAppShellProps) {
  const { companies, selectedCompany, refreshCompanies, loading } = useCompany();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    checkOnboarding();
  }, [selectedCompany]);

  const checkOnboarding = async () => {
    if (!selectedCompany) return;

    try {
      const { data: status, error } = await supabase
        .from('onboarding_status')
        .select('is_completed')
        .eq('company_id', selectedCompany.id)
        .maybeSingle();

      if (error) throw error;

      setShowOnboarding(!status?.is_completed);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setShowOnboarding(false);
    }
  };

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    await refreshCompanies();
  };

  // Show loading while checking for companies
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show initial setup if user has no companies
  if (companies.length === 0) {
    return <InitialSetup onComplete={handleOnboardingComplete} />;
  }

  if (showOnboarding) {
    return <CompanyOnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <GlobalTopBar />
      <div className="flex-1 flex overflow-hidden">
        <RegistryDrivenSidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<ModernAppLauncher />} />
            <Route path="/dashboard" element={<EngineDrivenDashboard />} />
            <Route path="/*" element={<EngineRouter />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

