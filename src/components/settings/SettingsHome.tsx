import { useState } from 'react';
import {
  Settings,
  Building2,
  Package,
  Recycle,
  Users,
  Globe,
  Leaf,
  Shield
} from 'lucide-react';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: any;
  engine?: string;
}

export function SettingsHome() {
  const [selectedSection, setSelectedSection] = useState<string>('core');

  const sections: SettingsSection[] = [
    {
      id: 'core',
      title: 'Core Settings',
      description: 'Company profile, users, and general configuration',
      icon: Settings,
    },
    {
      id: 'itad',
      title: 'ITAD Settings',
      description: 'Data wiping providers, compliance rules',
      icon: Shield,
      engine: 'itad',
    },
    {
      id: 'recycling',
      title: 'Recycling Settings',
      description: 'Material categories, disposal methods',
      icon: Recycle,
      engine: 'recycling',
    },
    {
      id: 'resale',
      title: 'Resale Settings',
      description: 'Pricing rules, grading standards',
      icon: Package,
      engine: 'reseller',
    },
    {
      id: 'crm',
      title: 'CRM Settings',
      description: 'Pipeline stages, lead sources',
      icon: Users,
      engine: 'crm',
    },
    {
      id: 'portal',
      title: 'Client Portal',
      description: 'Portal access, branding',
      icon: Globe,
    },
    {
      id: 'esg',
      title: 'ESG Reporting',
      description: 'Impact calculation, report templates',
      icon: Leaf,
      engine: 'esg',
    },
    {
      id: 'company',
      title: 'Company Settings',
      description: 'Locations, certifications, business info',
      icon: Building2,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Configure your system preferences and module settings</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
              className={`p-6 rounded-lg border-2 text-left transition-all ${
                selectedSection === section.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  selectedSection === section.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{section.title}</h3>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12 text-gray-500">
          <Settings className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {sections.find(s => s.id === selectedSection)?.title}
          </h3>
          <p className="text-gray-600">
            Settings for this module are available within the module workspace
          </p>
        </div>
      </div>
    </div>
  );
}
