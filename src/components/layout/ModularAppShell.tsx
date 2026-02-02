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
import { EngineRepairPanel } from '../onboarding/EngineRepairPanel';

interface ModularAppShellProps {
  children?: React.ReactNode;
}

export function ModularAppShell({ children }: ModularAppShellProps) {
  const { companies, selectedCompany, refreshCompanies, loading } = useCompany();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEngineRepair, setShowEngineRepair] = useState(false);

  useEffect(() => {
    checkOnboarding();
    checkEngineHealth();
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

  const checkEngineHealth = async () => {
    if (!selectedCompany) return;

    try {
      const { count, error } = await supabase
        .from('engines')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', selectedCompany.id);

      if (error) throw error;

      if (count === 0) {
        console.warn('No engines found for company. Triggering repair.');
        setShowEngineRepair(true);
      }
    } catch (error) {
      console.error('Error checking engine health:', error);
    }
  };

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    await refreshCompanies();
  };

  const handleRepairComplete = async () => {
    setShowEngineRepair(false);
    await refreshCompanies();
    window.location.reload();
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

  // Show engine repair if company exists but has no engines
  if (showEngineRepair && selectedCompany) {
    return <EngineRepairPanel companyId={selectedCompany.id} onComplete={handleRepairComplete} />;
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

