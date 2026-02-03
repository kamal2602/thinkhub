import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { UserRole } from '../lib/database.types';

interface Company {
  id: string;
  name: string;
  description: string;
  role: UserRole;
  onboarding_completed?: boolean;
}

interface CompanyContextType {
  companies: Company[];
  selectedCompany: Company | null;
  currentCompany: Company | null; // Backward compatibility alias
  company: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  loading: boolean;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    if (!user) {
      setCompanies([]);
      setSelectedCompany(null);
      setLoading(false);
      return;
    }

    try {
      let companiesList: Company[] = [];

      if (isSuperAdmin) {
        const { data: allCompanies, error: companiesError } = await supabase
          .from('companies')
          .select('id, name, description, onboarding_completed')
          .order('name');

        if (companiesError) throw companiesError;

        companiesList = (allCompanies || []).map((company: any) => ({
          id: company.id,
          name: company.name,
          description: company.description || '',
          role: 'admin' as UserRole,
          onboarding_completed: company.onboarding_completed ?? false,
        }));
      } else {
        const { data: accessData, error: accessError } = await supabase
          .from('user_company_access')
          .select('company_id, role, companies(id, name, description, onboarding_completed)')
          .eq('user_id', user.id);

        if (accessError) throw accessError;

        companiesList = (accessData || []).map((access: any) => ({
          id: access.companies.id,
          name: access.companies.name,
          description: access.companies.description,
          role: access.role as UserRole,
          onboarding_completed: access.companies.onboarding_completed ?? false,
        }));
      }

      setCompanies(companiesList);

      if (companiesList.length > 0 && !selectedCompany) {
        const savedCompanyId = localStorage.getItem('selectedCompanyId');
        const company = savedCompanyId
          ? companiesList.find(c => c.id === savedCompanyId) || companiesList[0]
          : companiesList[0];
        setSelectedCompany(company);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (selectedCompany) {
      localStorage.setItem('selectedCompanyId', selectedCompany.id);
    }
  }, [selectedCompany]);

  const refreshCompanies = async () => {
    setLoading(true);
    await fetchCompanies();
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompany,
        currentCompany: selectedCompany, // Backward compatibility alias
        company: selectedCompany,
        setSelectedCompany,
        loading,
        refreshCompanies,
      }}
    >
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
