import React, { useState, useEffect } from 'react';
import { Shield, Plus, CheckCircle, XCircle, Clock, FileText, Search, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface Asset {
  id: string;
  internal_id: string;
  serial_number: string;
  brand: string;
  model: string;
  product_type: string;
}

interface SanitizationRecord {
  id: string;
  asset_id: string;
  sanitization_method: string;
  software_used: string;
  wipe_passes: number;
  sanitization_date: string;
  verification_status: string;
  verification_date: string | null;
  performed_by: string;
  report_file_url: string | null;
  notes: string;
  created_at: string;
  assets: Asset;
  profiles: {
    email: string;
  };
}

const SANITIZATION_METHODS = [
  'DOD 5220.22-M',
  'NIST 800-88 Purge',
  'NIST 800-88 Clear',
  'Secure Erase',
  'Cryptographic Erase',
  'Physical Destruction',
  'Degaussing',
  'Other'
];

const SOFTWARE_OPTIONS = [
  'DBAN',
  'Blancco',
  'Secure Erase',
  'dd',
  'shred',
  'Parted Magic',
  'KillDisk',
  'CBL Data Shredder',
  'Other'
];

export function DataSanitization() {
  const { user, profile } = useAuth();
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [records, setRecords] = useState<SanitizationRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    asset_id: '',
    sanitization_method: 'NIST 800-88 Clear',
    software_used: 'DBAN',
    wipe_passes: 1,
    sanitization_date: new Date().toISOString().split('T')[0],
    verification_status: 'pending',
    verification_date: '',
    notes: ''
  });

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchRecords();
      fetchAssets();
    }
  }, [selectedCompany?.id]);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_data_sanitization')
        .select(`
          *,
          assets (
            id,
            internal_id,
            serial_number,
            brand,
            model,
            product_type
          ),
          profiles (
            email
          )
        `)
        .eq('company_id', selectedCompany?.id)
        .order('sanitization_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('id, internal_id, serial_number, brand, model, product_type')
        .eq('company_id', selectedCompany?.id)
        .order('internal_id', { ascending: true });

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('asset_data_sanitization')
        .insert({
          company_id: selectedCompany?.id,
          asset_id: formData.asset_id,
          sanitization_method: formData.sanitization_method,
          software_used: formData.software_used,
          wipe_passes: formData.wipe_passes,
          sanitization_date: formData.sanitization_date,
          verification_status: formData.verification_status,
          verification_date: formData.verification_date || null,
          performed_by: user?.id,
          notes: formData.notes
        });

      if (error) throw error;

      showToast('Data sanitization record added successfully', 'success');
      setShowAddModal(false);
      resetForm();
      fetchRecords();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const updateVerificationStatus = async (recordId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('asset_data_sanitization')
        .update({
          verification_status: status,
          verification_date: status === 'passed' || status === 'failed' ? new Date().toISOString() : null
        })
        .eq('id', recordId);

      if (error) throw error;

      showToast(`Verification status updated to ${status}`, 'success');
      fetchRecords();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      asset_id: '',
      sanitization_method: 'NIST 800-88 Clear',
      software_used: 'DBAN',
      wipe_passes: 1,
      sanitization_date: new Date().toISOString().split('T')[0],
      verification_status: 'pending',
      verification_date: '',
      notes: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      not_verified: 'bg-gray-100 text-gray-800'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch =
      record.assets.internal_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.assets.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.assets.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.assets.model?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || record.verification_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading sanitization records...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Sanitization Tracking</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track data wipe methods, verification, and compliance for ITAD requirements
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Sanitization Record
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by asset ID, serial, brand, or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
              <option value="not_verified">Not Verified</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Total Records</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{records.length}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Verified Passed</div>
            <div className="text-2xl font-bold text-green-900 mt-1">
              {records.filter(r => r.verification_status === 'passed').length}
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm text-yellow-600 font-medium">Pending</div>
            <div className="text-2xl font-bold text-yellow-900 mt-1">
              {records.filter(r => r.verification_status === 'pending').length}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-600 font-medium">Failed</div>
            <div className="text-2xl font-bold text-red-900 mt-1">
              {records.filter(r => r.verification_status === 'failed').length}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Software
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Passes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performed By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {record.assets.internal_id}
                    </div>
                    <div className="text-sm text-gray-500">
                      {record.assets.serial_number}
                    </div>
                    <div className="text-xs text-gray-400">
                      {record.assets.brand} {record.assets.model}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{record.sanitization_method}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{record.software_used}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{record.wipe_passes}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(record.sanitization_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(record.verification_status)}
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(record.verification_status)}`}>
                        {record.verification_status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{record.profiles?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {record.verification_status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateVerificationStatus(record.id, 'passed')}
                          className="text-green-600 hover:text-green-900"
                          title="Mark as Passed"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => updateVerificationStatus(record.id, 'failed')}
                          className="text-red-600 hover:text-red-900"
                          title="Mark as Failed"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No sanitization records found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Add Sanitization Record</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset *
                  </label>
                  <select
                    value={formData.asset_id}
                    onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Asset</option>
                    {assets.map(asset => (
                      <option key={asset.id} value={asset.id}>
                        {asset.internal_id} - {asset.serial_number} ({asset.brand} {asset.model})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sanitization Method *
                  </label>
                  <select
                    value={formData.sanitization_method}
                    onChange={(e) => setFormData({ ...formData, sanitization_method: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {SANITIZATION_METHODS.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Software Used
                  </label>
                  <select
                    value={formData.software_used}
                    onChange={(e) => setFormData({ ...formData, software_used: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Software</option>
                    {SOFTWARE_OPTIONS.map(software => (
                      <option key={software} value={software}>{software}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wipe Passes *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="35"
                    value={formData.wipe_passes}
                    onChange={(e) => setFormData({ ...formData, wipe_passes: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sanitization Date *
                  </label>
                  <input
                    type="date"
                    value={formData.sanitization_date}
                    onChange={(e) => setFormData({ ...formData, sanitization_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Verification Status *
                  </label>
                  <select
                    value={formData.verification_status}
                    onChange={(e) => setFormData({ ...formData, verification_status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="not_verified">Not Verified</option>
                  </select>
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
                    placeholder="Additional notes about the sanitization process..."
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
                    Add Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
