import { useState, useEffect } from 'react';
import { Building2, Globe, Hash, FileText, ShoppingBag, Recycle } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Customer = Database['public']['Tables']['customers']['Row'];

interface CustomerGeneralProps {
  customer: Customer;
  onUpdate: (updates: Partial<Customer>) => Promise<void>;
  canEdit: boolean;
}

export function CustomerGeneral({ customer, onUpdate, canEdit }: CustomerGeneralProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: customer.name || '',
    legal_name: customer.legal_name || '',
    trade_name: customer.trade_name || '',
    entity_type: customer.entity_type || '',
    registration_number: customer.registration_number || '',
    tax_id: customer.tax_id || '',
    industry: customer.industry || '',
    website: customer.website || '',
    status: customer.status || 'active',
    business_type: customer.business_type || 'sales_customer',
    email: customer.email || '',
    phone: customer.phone || '',
  });

  useEffect(() => {
    setFormData({
      name: customer.name || '',
      legal_name: customer.legal_name || '',
      trade_name: customer.trade_name || '',
      entity_type: customer.entity_type || '',
      registration_number: customer.registration_number || '',
      tax_id: customer.tax_id || '',
      industry: customer.industry || '',
      website: customer.website || '',
      status: customer.status || 'active',
      business_type: customer.business_type || 'sales_customer',
      email: customer.email || '',
      phone: customer.phone || '',
    });
  }, [customer]);

  const handleSave = async () => {
    await onUpdate(formData);
    setIsEditing(false);
  };

  const entityTypes = [
    { value: 'corporation', label: 'Corporation' },
    { value: 'llc', label: 'Limited Liability Company (LLC)' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
    { value: 'nonprofit', label: 'Nonprofit Organization' },
    { value: 'government', label: 'Government Entity' },
    { value: 'other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'inactive', label: 'Inactive', color: 'gray' },
    { value: 'suspended', label: 'Suspended', color: 'red' },
    { value: 'prospect', label: 'Prospect', color: 'blue' },
  ];

  const getStatusColor = (status: string) => {
    const option = statusOptions.find(s => s.value === status);
    return option?.color || 'gray';
  };

  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">General Information</h3>
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Display Name</label>
            <p className="text-gray-900">{customer.name || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
            <span className={`inline-block px-2 py-1 text-xs font-medium rounded bg-${getStatusColor(customer.status || 'active')}-100 text-${getStatusColor(customer.status || 'active')}-700`}>
              {statusOptions.find(s => s.value === customer.status)?.label || customer.status || 'Active'}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Legal Name</label>
            <p className="text-gray-900">{customer.legal_name || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Trade Name (DBA)</label>
            <p className="text-gray-900">{customer.trade_name || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Entity Type</label>
            <p className="text-gray-900">{entityTypes.find(e => e.value === customer.entity_type)?.label || customer.entity_type || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Business Type</label>
            <div className="flex items-center gap-2">
              {customer.business_type === 'sales_customer' && (
                <>
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-900">Sales Customer</span>
                </>
              )}
              {customer.business_type === 'itad_service_customer' && (
                <>
                  <Building2 className="w-4 h-4 text-green-600" />
                  <span className="text-gray-900">ITAD Service Customer</span>
                </>
              )}
              {customer.business_type === 'recycling_vendor' && (
                <>
                  <Recycle className="w-4 h-4 text-orange-600" />
                  <span className="text-gray-900">Recycling Vendor</span>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Registration Number</label>
            <p className="text-gray-900">{customer.registration_number || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Tax ID</label>
            <p className="text-gray-900">{customer.tax_id || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Industry</label>
            <p className="text-gray-900">{customer.industry || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Website</label>
            {customer.website ? (
              <a
                href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <Globe className="w-4 h-4" />
                {customer.website}
              </a>
            ) : (
              <p className="text-gray-900">-</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
            <p className="text-gray-900">{customer.email || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
            <p className="text-gray-900">{customer.phone || '-'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Edit General Information</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Display Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Legal Name</label>
          <input
            type="text"
            value={formData.legal_name}
            onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Official registered business name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Trade Name (DBA)</label>
          <input
            type="text"
            value={formData.trade_name}
            onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Doing business as"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
          <select
            value={formData.entity_type}
            onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select entity type</option>
            {entityTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Business Type *</label>
          <select
            value={formData.business_type}
            onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="sales_customer">Sales Customer</option>
            <option value="itad_service_customer">ITAD Service Customer</option>
            <option value="recycling_vendor">Recycling Vendor</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number</label>
          <input
            type="text"
            value={formData.registration_number}
            onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Business registration number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID</label>
          <input
            type="text"
            value={formData.tax_id}
            onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="EIN, VAT, or other tax ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
          <input
            type="text"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Technology, Healthcare, Finance"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
          <input
            type="text"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="www.example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="contact@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+1 (555) 000-0000"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={() => setIsEditing(false)}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
