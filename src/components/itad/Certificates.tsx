import React, { useState, useEffect } from 'react';
import { FileText, Plus, Printer, Download, Search, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface Certificate {
  id: string;
  certificate_number: string;
  certificate_date: string;
  customer_name: string;
  total_assets_count?: number;
  total_weight_kg?: number;
  authorized_signature: string;
  signature_title: string;
  created_at: string;
  issued_by: string;
  profiles: {
    email: string;
  };
}

interface Asset {
  id: string;
  internal_id: string;
  serial_number: string;
  brand: string;
  model: string;
  weight_kg?: number;
  disposal_method?: string;
}

interface Customer {
  id: string;
  name: string;
}

export function Certificates() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'destruction' | 'recycling'>('destruction');
  const [destructionCerts, setDestructionCerts] = useState<Certificate[]>([]);
  const [recyclingCerts, setRecyclingCerts] = useState<Certificate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    asset_ids: [] as string[],
    destruction_method: 'NIST 800-88 Clear',
    compliance_standards: ['NIST 800-88', 'R2'],
    downstream_vendor_name: '',
    downstream_vendor_certification: '',
    authorized_signature: '',
    signature_title: '',
    notes: ''
  });

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchCertificates();
      fetchCustomers();
      fetchAssets();
    }
  }, [selectedCompany?.id, activeTab]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      if (activeTab === 'destruction') {
        const { data, error } = await supabase
          .from('data_destruction_certificates')
          .select(`
            *,
            profiles (email)
          `)
          .eq('company_id', selectedCompany?.id)
          .order('certificate_date', { ascending: false });

        if (error) throw error;
        setDestructionCerts(data || []);
      } else {
        const { data, error } = await supabase
          .from('recycling_certificates')
          .select(`
            *,
            profiles (email)
          `)
          .eq('company_id', selectedCompany?.id)
          .order('certificate_date', { ascending: false });

        if (error) throw error;
        setRecyclingCerts(data || []);
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('company_id', selectedCompany?.id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('id, internal_asset_id, serial_number, brand, model, weight_kg, disposal_method')
        .eq('company_id', selectedCompany?.id)
        .order('internal_asset_id');

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const generateCertificateNumber = async (type: 'destruction' | 'recycling') => {
    try {
      const { data, error } = await supabase.rpc('generate_certificate_number', {
        cert_type: type,
        company_id: selectedCompany?.id
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      showToast('Failed to generate certificate number', 'error');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.asset_ids.length === 0) {
      showToast('Please select at least one asset', 'error');
      return;
    }

    try {
      const certNumber = await generateCertificateNumber(activeTab);
      if (!certNumber) return;

      const selectedAssets = assets.filter(a => formData.asset_ids.includes(a.id));
      const totalWeight = selectedAssets.reduce((sum, a) => sum + (a.weight_kg || 0), 0);

      if (activeTab === 'destruction') {
        const { error } = await supabase
          .from('data_destruction_certificates')
          .insert({
            company_id: selectedCompany?.id,
            certificate_number: certNumber,
            customer_id: formData.customer_id || null,
            customer_name: formData.customer_name,
            asset_ids: formData.asset_ids,
            total_assets_count: formData.asset_ids.length,
            destruction_method: formData.destruction_method,
            compliance_standards: formData.compliance_standards,
            authorized_signature: formData.authorized_signature,
            signature_title: formData.signature_title,
            notes: formData.notes,
            issued_by: user?.id
          });

        if (error) throw error;
      } else {
        const recycledWeight = selectedAssets.filter(a => a.disposal_method === 'recycle').reduce((sum, a) => sum + (a.weight_kg || 0), 0);
        const resoldWeight = selectedAssets.filter(a => a.disposal_method === 'resale').reduce((sum, a) => sum + (a.weight_kg || 0), 0);
        const scrappedWeight = selectedAssets.filter(a => a.disposal_method === 'scrap').reduce((sum, a) => sum + (a.weight_kg || 0), 0);
        const landfillWeight = selectedAssets.filter(a => a.disposal_method === 'landfill').reduce((sum, a) => sum + (a.weight_kg || 0), 0);
        const recyclingPercentage = totalWeight > 0 ? ((recycledWeight + resoldWeight) / totalWeight) * 100 : 0;

        const { error } = await supabase
          .from('recycling_certificates')
          .insert({
            company_id: selectedCompany?.id,
            certificate_number: certNumber,
            customer_id: formData.customer_id || null,
            customer_name: formData.customer_name,
            asset_ids: formData.asset_ids,
            total_weight_kg: totalWeight,
            recycled_weight_kg: recycledWeight,
            resold_weight_kg: resoldWeight,
            scrapped_weight_kg: scrappedWeight,
            landfill_weight_kg: landfillWeight,
            recycling_percentage: recyclingPercentage,
            downstream_vendor_name: formData.downstream_vendor_name,
            downstream_vendor_certification: formData.downstream_vendor_certification,
            compliance_standards: formData.compliance_standards,
            authorized_signature: formData.authorized_signature,
            signature_title: formData.signature_title,
            notes: formData.notes,
            issued_by: user?.id
          });

        if (error) throw error;
      }

      showToast('Certificate created successfully', 'success');
      setShowAddModal(false);
      resetForm();
      fetchCertificates();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      customer_name: '',
      asset_ids: [],
      destruction_method: 'NIST 800-88 Clear',
      compliance_standards: ['NIST 800-88', 'R2'],
      downstream_vendor_name: '',
      downstream_vendor_certification: '',
      authorized_signature: '',
      signature_title: '',
      notes: ''
    });
  };

  const handlePrint = (cert: any) => {
    setSelectedCert(cert);
    setShowPrintModal(true);
  };

  const printCertificate = () => {
    window.print();
  };

  const filteredCerts = (activeTab === 'destruction' ? destructionCerts : recyclingCerts).filter(cert =>
    cert.certificate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading certificates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ITAD Certificates</h2>
          <p className="mt-1 text-sm text-gray-500">
            Generate and manage data destruction and recycling certificates
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Create Certificate
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('destruction')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'destruction'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Data Destruction Certificates
            </button>
            <button
              onClick={() => setActiveTab('recycling')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'recycling'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Recycling Certificates
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by certificate number or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Certificate #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issued By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {cert.certificate_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(cert.certificate_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cert.customer_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cert.total_assets_count || 0} assets
                      </div>
                      {cert.total_weight_kg && (
                        <div className="text-xs text-gray-500">
                          {cert.total_weight_kg.toFixed(2)} kg
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cert.profiles?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handlePrint(cert)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCerts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>No certificates found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Create {activeTab === 'destruction' ? 'Data Destruction' : 'Recycling'} Certificate
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer
                    </label>
                    <select
                      value={formData.customer_id}
                      onChange={(e) => {
                        const customer = customers.find(c => c.id === e.target.value);
                        setFormData({
                          ...formData,
                          customer_id: e.target.value,
                          customer_name: customer?.name || ''
                        });
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Customer</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Or Enter Customer Name
                    </label>
                    <input
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value, customer_id: '' })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Customer name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Assets *
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {assets.map(asset => (
                      <label key={asset.id} className="flex items-center gap-2 py-2 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.asset_ids.includes(asset.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, asset_ids: [...formData.asset_ids, asset.id] });
                            } else {
                              setFormData({ ...formData, asset_ids: formData.asset_ids.filter(id => id !== asset.id) });
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">
                          {asset.internal_asset_id} - {asset.serial_number} ({asset.brand} {asset.model})
                          {asset.weight_kg && ` - ${asset.weight_kg}kg`}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {activeTab === 'destruction' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Destruction Method *
                    </label>
                    <input
                      type="text"
                      value={formData.destruction_method}
                      onChange={(e) => setFormData({ ...formData, destruction_method: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                )}

                {activeTab === 'recycling' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Downstream Vendor Name
                      </label>
                      <input
                        type="text"
                        value={formData.downstream_vendor_name}
                        onChange={(e) => setFormData({ ...formData, downstream_vendor_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Recycling facility name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Downstream Vendor Certification
                      </label>
                      <input
                        type="text"
                        value={formData.downstream_vendor_certification}
                        onChange={(e) => setFormData({ ...formData, downstream_vendor_certification: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="R2, e-Stewards, ISO 14001, etc."
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Authorized Signature *
                    </label>
                    <input
                      type="text"
                      value={formData.authorized_signature}
                      onChange={(e) => setFormData({ ...formData, authorized_signature: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Signature Title *
                    </label>
                    <input
                      type="text"
                      value={formData.signature_title}
                      onChange={(e) => setFormData({ ...formData, signature_title: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Operations Manager"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Certificate
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showPrintModal && selectedCert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 print:p-12">
              <div className="flex justify-end mb-4 print:hidden">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-gray-400 hover:text-gray-600 mr-4"
                >
                  Close
                </button>
                <button
                  onClick={printCertificate}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4" />
                  Print Certificate
                </button>
              </div>

              <div className="border-4 border-blue-600 p-12">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {activeTab === 'destruction' ? 'Certificate of Data Destruction' : 'Certificate of Recycling'}
                  </h1>
                  <p className="text-lg text-gray-600">
                    Certificate Number: {selectedCert.certificate_number}
                  </p>
                </div>

                <div className="space-y-6 text-gray-800">
                  <p>
                    This is to certify that the following IT assets have been processed in accordance with
                    industry standards and environmental regulations:
                  </p>

                  <div className="bg-gray-50 p-4 rounded">
                    <p><strong>Customer:</strong> {selectedCert.customer_name || 'N/A'}</p>
                    <p><strong>Date:</strong> {new Date(selectedCert.certificate_date).toLocaleDateString()}</p>
                    <p><strong>Total Assets:</strong> {selectedCert.total_assets_count || selectedCert.asset_ids?.length || 0}</p>
                    {selectedCert.total_weight_kg && (
                      <p><strong>Total Weight:</strong> {selectedCert.total_weight_kg.toFixed(2)} kg</p>
                    )}
                  </div>

                  {activeTab === 'destruction' && (
                    <div>
                      <p><strong>Destruction Method:</strong> {selectedCert.destruction_method}</p>
                      <p><strong>Compliance Standards:</strong> {selectedCert.compliance_standards?.join(', ')}</p>
                    </div>
                  )}

                  {activeTab === 'recycling' && (
                    <div>
                      <p><strong>Recycling Percentage:</strong> {selectedCert.recycling_percentage?.toFixed(2)}%</p>
                      {selectedCert.downstream_vendor_name && (
                        <p><strong>Recycling Facility:</strong> {selectedCert.downstream_vendor_name}</p>
                      )}
                      {selectedCert.downstream_vendor_certification && (
                        <p><strong>Vendor Certification:</strong> {selectedCert.downstream_vendor_certification}</p>
                      )}
                    </div>
                  )}

                  {selectedCert.notes && (
                    <div>
                      <p><strong>Notes:</strong></p>
                      <p className="text-gray-700">{selectedCert.notes}</p>
                    </div>
                  )}

                  <div className="mt-12 pt-8 border-t border-gray-300">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <div className="border-t-2 border-gray-400 pt-2 mt-12">
                          <p className="font-semibold">{selectedCert.authorized_signature}</p>
                          <p className="text-sm text-gray-600">{selectedCert.signature_title}</p>
                        </div>
                      </div>
                      <div>
                        <div className="border-t-2 border-gray-400 pt-2 mt-12">
                          <p className="text-sm text-gray-600">Date</p>
                          <p>{new Date(selectedCert.certificate_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
