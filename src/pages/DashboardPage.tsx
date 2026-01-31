import { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { Dashboard } from '../components/dashboard/Dashboard';
import { Processing } from '../components/processing/Processing';
import { DataSanitization } from '../components/itad/DataSanitization';
import { Certificates } from '../components/itad/Certificates';
import { DownstreamVendors } from '../components/itad/DownstreamVendors';
import { CompanyCertifications } from '../components/settings/CompanyCertifications';
import { ITADProjects } from '../components/itad/ITADProjects';
import { EnvironmentalCompliance } from '../components/itad/EnvironmentalCompliance';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, X, Home, Package, Shield, FileText, Award, Settings as SettingsIcon } from 'lucide-react';

export function DashboardPage() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { signOut } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'processing', label: 'Processing', icon: Package },
    { id: 'itad-projects', label: 'ITAD Projects', icon: Package },
    { id: 'data-sanitization', label: 'Data Sanitization', icon: Shield },
    { id: 'certificates', label: 'Certificates', icon: FileText },
    { id: 'downstream-vendors', label: 'Downstream Vendors', icon: Award },
    { id: 'environmental-compliance', label: 'Environmental', icon: Award },
    { id: 'company-certifications', label: 'Company Certifications', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold text-gray-900">Asset Manager</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'processing' && <Processing />}
        {currentPage === 'data-sanitization' && <DataSanitization />}
        {currentPage === 'certificates' && <Certificates />}
        {currentPage === 'downstream-vendors' && <DownstreamVendors />}
        {currentPage === 'company-certifications' && <CompanyCertifications />}
        {currentPage === 'itad-projects' && <ITADProjects />}
        {currentPage === 'environmental-compliance' && <EnvironmentalCompliance />}
      </main>
    </div>
  );
}
