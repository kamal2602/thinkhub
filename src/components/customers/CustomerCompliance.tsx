import { Shield, FileCheck, AlertCircle, CheckCircle } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Customer = Database['public']['Tables']['customers']['Row'];

interface CustomerComplianceProps {
  customer: Customer;
  canEdit: boolean;
}

export function CustomerCompliance({ customer }: CustomerComplianceProps) {
  const complianceItems = [
    {
      name: 'Tax ID Verification',
      status: customer.tax_id ? 'complete' : 'pending',
      description: customer.tax_id ? `Tax ID: ${customer.tax_id}` : 'Tax ID not provided',
    },
    {
      name: 'Business Registration',
      status: customer.registration_number ? 'complete' : 'pending',
      description: customer.registration_number
        ? `Registration: ${customer.registration_number}`
        : 'Registration number not provided',
    },
    {
      name: 'Legal Entity',
      status: customer.legal_name ? 'complete' : 'pending',
      description: customer.legal_name || 'Legal name not provided',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Compliance & Documentation</h3>
      </div>

      <div className="space-y-4">
        {complianceItems.map((item, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-4"
          >
            <div className="flex-shrink-0">
              {item.status === 'complete' ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{item.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            </div>
            <div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${
                  item.status === 'complete'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {item.status === 'complete' ? 'Complete' : 'Pending'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Compliance Summary</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <p>
                Entity Type: {customer.entity_type ? (
                  <span className="font-semibold capitalize">{customer.entity_type.replace('_', ' ')}</span>
                ) : (
                  <span className="text-blue-600">Not specified</span>
                )}
              </p>
              <p>
                Status: <span className="font-semibold capitalize">{customer.status || 'active'}</span>
              </p>
              {customer.industry && (
                <p>
                  Industry: <span className="font-semibold">{customer.industry}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Regulatory Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Registration Number
            </label>
            <p className="text-gray-900">{customer.registration_number || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Tax ID</label>
            <p className="text-gray-900">{customer.tax_id || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Legal Name</label>
            <p className="text-gray-900">{customer.legal_name || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Entity Type</label>
            <p className="text-gray-900 capitalize">
              {customer.entity_type?.replace('_', ' ') || '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900 mb-1">Note</h4>
            <p className="text-sm text-yellow-800">
              Ensure all compliance information is accurate and up to date. Update company details in
              the General tab to maintain compliance records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
