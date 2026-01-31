import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Company {
  id: string;
  name: string;
  type: string;
}

interface CompanyContextType {
  companies: Company[];
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCompanies();
    } else {
      setCompanies([]);
      setSelectedCompany(null);
      setLoading(false);
    }
  }, [user]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('user_company_access')
        .select(`
          company_id,
          role,
          companies (
            id,
            name,
            type
          )
        `)
        .eq('user_id', user?.id);

      if (error) throw error;

      const companiesData = data?.map((access: any) => ({
        id: access.companies.id,
        name: access.companies.name,
        type: access.companies.type
      })) || [];

      setCompanies(companiesData);
      if (companiesData.length > 0 && !selectedCompany) {
        setSelectedCompany(companiesData[0]);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CompanyContext.Provider value={{ companies, selectedCompany, setSelectedCompany, loading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
