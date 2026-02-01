import { useState, useEffect } from 'react';
import { Plus, User, ArrowLeft, Building2, ShoppingBag, Recycle, Globe, Phone, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { CustomerGeneral } from './CustomerGeneral';
import { CustomerContacts } from './CustomerContacts';
import { CustomerAddresses } from './CustomerAddresses';
import { CustomerCommercial } from './CustomerCommercial';
import { CustomerCompliance } from './CustomerCompliance';
import type { Database } from '../../lib/database.types';

type Customer = Database['public']['Tables']['customers']['Row'];

export function CustomersEnhanced() {
  const { selectedCompany } = useCompany();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'contacts' | 'addresses' | 'commercial' | 'compliance'>('general');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  const canEdit = selectedCompany?.role !== 'viewer';

  useEffect(() => {
    if (selectedCompany) {
      fetchCustomers();
    }
  }, [selectedCompany]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', selectedCompany?.id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          company_id: selectedCompany?.id,
          name: newCustomerName,
          business_type: 'sales_customer',
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      await fetchCustomers();
      setShowCreateModal(false);
      setNewCustomerName('');
      setSelectedCustomer(data);
      setActiveTab('general');
    } catch (error: any) {
      alert('Error creating customer: ' + error.message);
    }
  };

  const handleUpdateCustomer = async (updates: Partial<Customer>) => {
    if (!selectedCustomer) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', selectedCustomer.id)
        .select()
        .single();

      if (error) throw error;
      setSelectedCustomer(data);
      await fetchCustomers();
    } catch (error: any) {
      alert('Error updating customer: ' + error.message);
    }
  };

  const getBusinessTypeIcon = (type: string) => {
    switch (type) {
      case 'sales_customer':
        return <ShoppingBag className="w-5 h-5 text-blue-600" />;
      case 'itad_service_customer':
        return <Building2 className="w-5 h-5 text-green-600" />;
      case 'recycling_vendor':
        return <Recycle className="w-5 h-5 text-orange-600" />;
      default:
        return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBusinessTypeLabel = (type: string) => {
    switch (type) {
      case 'sales_customer':
        return 'Sales Customer';
      case 'itad_service_customer':
        return 'ITAD Customer';
      case 'recycling_vendor':
        return 'Recycling Vendor';
      default:
        return 'Customer';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      case 'suspended':
        return 'bg-red-100 text-red-700';
      case 'prospect':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (!selectedCompany) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select a company first.</p>
        </div>
      </div>
    );
  }

  if (selectedCustomer) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <button
            onClick={() => {
              setSelectedCustomer(null);
              setActiveTab('general');
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Customers
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                {getBusinessTypeIcon(selectedCustomer.business_type || 'sales_customer')}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedCustomer.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-600">
                    {getBusinessTypeLabel(selectedCustomer.business_type || 'sales_customer')}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(selectedCustomer.status || 'active')}`}>
                    {selectedCustomer.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-1 mt-6 border-b border-gray-200">
            {[
              { id: 'general', label: 'General' },
              { id: 'contacts', label: 'Contacts' },
              { id: 'addresses', label: 'Addresses' },
              { id: 'commercial', label: 'Commercial' },
              { id: 'compliance', label: 'Compliance' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 font-medium text-sm transition ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {activeTab === 'general' && (
            <CustomerGeneral
              customer={selectedCustomer}
              onUpdate={handleUpdateCustomer}
              canEdit={canEdit}
            />
          )}
          {activeTab === 'contacts' && (
            <CustomerContacts customerId={selectedCustomer.id} canEdit={canEdit} />
          )}
          {activeTab === 'addresses' && (
            <CustomerAddresses customerId={selectedCustomer.id} canEdit={canEdit} />
          )}
          {activeTab === 'commercial' && (
            <CustomerCommercial
              customer={selectedCustomer}
              onUpdate={handleUpdateCustomer}
              canEdit={canEdit}
            />
          )}
          {activeTab === 'compliance' && (
            <CustomerCompliance customer={selectedCustomer} canEdit={canEdit} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage customer relationships and information</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Add Customer
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers yet</h3>
          <p className="text-gray-600 mb-6">Add your first customer to start managing relationships</p>
          {canEdit && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Add Customer
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <div
              key={customer.id}
              onClick={() => setSelectedCustomer(customer)}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  {getBusinessTypeIcon(customer.business_type || 'sales_customer')}
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(customer.status || 'active')}`}>
                  {customer.status || 'Active'}
                </span>
              </div>

              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{customer.name}</h3>
                {customer.legal_name && customer.legal_name !== customer.name && (
                  <p className="text-sm text-gray-500">{customer.legal_name}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {getBusinessTypeLabel(customer.business_type || 'sales_customer')}
                </p>
              </div>

              <div className="space-y-2">
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    {customer.phone}
                  </div>
                )}
                {customer.website && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{customer.website}</span>
                  </div>
                )}
              </div>

              {customer.industry && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Industry: {customer.industry}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Customer</h2>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter customer name"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can add more details after creating the customer
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCustomerName('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
