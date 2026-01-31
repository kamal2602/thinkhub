import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, FileText, Calendar, DollarSign, Package, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface ITADProject {
  id: string;
  project_number: string;
  project_name?: string;
  itad_customer_id: string;
  service_type: string;
  expected_quantity: number;
  actual_quantity: number;
  service_fee: number;
  service_fee_currency: string;
  revenue_share_percentage: number;
  revenue_share_threshold: number;
  data_sanitization_required: boolean;
  data_sanitization_standard: string;
  environmental_reporting_required: boolean;
  r2_certified_required: boolean;
  certificate_required: boolean;
  certificate_generated: boolean;
  certificate_generated_at?: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  internal_notes?: string;
  created_at: string;
  customers: {
    name: string;
  };
}

interface Customer {
  id: string;
  name: string;
  business_type: string;
}

const SERVICE_TYPES = [
  { value: 'full_itad', label: 'Full ITAD Service' },
  { value: 'data_destruction_only', label: 'Data Destruction Only' },
  { value: 'remarketing_only', label: 'Remarketing Only' },
  { value: 'recycling_only', label: 'Recycling Only' },
  { value: 'asset_recovery', label: 'Asset Recovery' }
];

const STATUSES = [
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'intake_scheduled', label: 'Intake Scheduled', color: 'blue' },
  { value: 'receiving', label: 'Receiving', color: 'yellow' },
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
  { value: 'sanitization', label: 'Sanitization', color: 'purple' },
  { value: 'testing', label: 'Testing', color: 'indigo' },
  { value: 'disposition', label: 'Disposition', color: 'orange' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' }
];

const SANITIZATION_STANDARDS = [
  'NIST-800-88',
  'DOD-5220.22-M',
  'HMG-IS5',
  'CESG-CPA',
  'ISOIEC-27040',
  'custom'
];

export function ITADProjects() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [projects, setProjects] = useState<ITADProject[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ITADProject | null>(null);

  const [formData, setFormData] = useState({
    project_name: '',
    itad_customer_id: '',
    service_type: 'full_itad',
    expected_quantity: 0,
    service_fee: 0,
    service_fee_currency: 'USD',
    revenue_share_percentage: 0,
    revenue_share_threshold: 0,
    data_sanitization_required: true,
    data_sanitization_standard: 'NIST-800-88',
    environmental_reporting_required: true,
    r2_certified_required: false,
    certificate_required: true,
    status: 'pending',
    notes: '',
    internal_notes: ''
  });

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchProjects();
      fetchCustomers();
    }
  }, [selectedCompany?.id]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('itad_projects')
        .select(`
          *,
          customers (name)
        `)
        .eq('company_id', selectedCompany?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
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
        .select('id, name, business_type')
        .eq('company_id', selectedCompany?.id)
        .eq('business_type', 'itad_service_customer')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const generateProjectNumber = async () => {
    try {
      const year = new Date().getFullYear();
      const { data: existing } = await supabase
        .from('itad_projects')
        .select('project_number')
        .eq('company_id', selectedCompany?.id)
        .like('project_number', `ITAD-${year}-%`)
        .order('project_number', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (existing && existing.length > 0) {
        const lastNum = parseInt(existing[0].project_number.split('-')[2]);
        nextNum = lastNum + 1;
      }

      return `ITAD-${year}-${String(nextNum).padStart(4, '0')}`;
    } catch (error: any) {
      showToast('Failed to generate project number', 'error');
      return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProject) {
        const { error } = await supabase
          .from('itad_projects')
          .update(formData)
          .eq('id', editingProject.id);

        if (error) throw error;
        showToast('Project updated successfully', 'success');
      } else {
        const projectNumber = await generateProjectNumber();
        if (!projectNumber) return;

        const { error } = await supabase
          .from('itad_projects')
          .insert({
            ...formData,
            company_id: selectedCompany?.id,
            project_number: projectNumber,
            created_by: user?.id
          });

        if (error) throw error;
        showToast('Project created successfully', 'success');
      }

      setShowModal(false);
      resetForm();
      fetchProjects();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleEdit = (project: ITADProject) => {
    setEditingProject(project);
    setFormData({
      project_name: project.project_name || '',
      itad_customer_id: project.itad_customer_id,
      service_type: project.service_type,
      expected_quantity: project.expected_quantity,
      service_fee: project.service_fee,
      service_fee_currency: project.service_fee_currency,
      revenue_share_percentage: project.revenue_share_percentage,
      revenue_share_threshold: project.revenue_share_threshold,
      data_sanitization_required: project.data_sanitization_required,
      data_sanitization_standard: project.data_sanitization_standard,
      environmental_reporting_required: project.environmental_reporting_required,
      r2_certified_required: project.r2_certified_required,
      certificate_required: project.certificate_required,
      status: project.status,
      notes: project.notes || '',
      internal_notes: project.internal_notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const { error } = await supabase
        .from('itad_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Project deleted successfully', 'success');
      fetchProjects();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      project_name: '',
      itad_customer_id: '',
      service_type: 'full_itad',
      expected_quantity: 0,
      service_fee: 0,
      service_fee_currency: 'USD',
      revenue_share_percentage: 0,
      revenue_share_threshold: 0,
      data_sanitization_required: true,
      data_sanitization_standard: 'NIST-800-88',
      environmental_reporting_required: true,
      r2_certified_required: false,
      certificate_required: true,
      status: 'pending',
      notes: '',
      internal_notes: ''
    });
    setEditingProject(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = STATUSES.find(s => s.value === status);
    const colorClasses = {
      gray: 'bg-gray-100 text-gray-800',
      blue: 'bg-blue-100 text-blue-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      purple: 'bg-purple-100 text-purple-800',
      indigo: 'bg-indigo-100 text-indigo-800',
      orange: 'bg-orange-100 text-orange-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800'
    };
    return {
      label: statusConfig?.label || status,
      className: colorClasses[statusConfig?.color as keyof typeof colorClasses] || colorClasses.gray
    };
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      project.project_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.customers.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: projects.length,
    active: projects.filter(p => ['receiving', 'in_progress', 'sanitization', 'testing', 'disposition'].includes(p.status)).length,
    completed: projects.filter(p => p.status === 'completed').length,
    pending: projects.filter(p => p.status === 'pending').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading ITAD projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ITAD Projects</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage ITAD service engagements and customer projects
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.active}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-600 mt-1">{stats.pending}</p>
            </div>
            <XCircle className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search projects..."
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                {STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProjects.map((project) => {
                const statusBadge = getStatusBadge(project.status);
                return (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {project.project_number}
                      </div>
                      {project.project_name && (
                        <div className="text-sm text-gray-500">{project.project_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{project.customers.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {SERVICE_TYPES.find(t => t.value === project.service_type)?.label}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {project.actual_quantity} / {project.expected_quantity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(project.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(project)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No ITAD projects found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingProject ? 'Edit ITAD Project' : 'Create ITAD Project'}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ITAD Customer *
                    </label>
                    <select
                      value={formData.itad_customer_id}
                      onChange={(e) => setFormData({ ...formData, itad_customer_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
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
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={formData.project_name}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Optional friendly name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Type *
                    </label>
                    <select
                      value={formData.service_type}
                      onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {SERVICE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.expected_quantity}
                      onChange={(e) => setFormData({ ...formData, expected_quantity: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Fee
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.service_fee}
                      onChange={(e) => setFormData({ ...formData, service_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Revenue Share %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.revenue_share_percentage}
                      onChange={(e) => setFormData({ ...formData, revenue_share_percentage: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Revenue Threshold
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.revenue_share_threshold}
                      onChange={(e) => setFormData({ ...formData, revenue_share_threshold: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requirements
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.data_sanitization_required}
                        onChange={(e) => setFormData({ ...formData, data_sanitization_required: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">Data Sanitization Required</span>
                    </label>

                    {formData.data_sanitization_required && (
                      <div className="ml-6">
                        <select
                          value={formData.data_sanitization_standard}
                          onChange={(e) => setFormData({ ...formData, data_sanitization_standard: e.target.value })}
                          className="w-64 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {SANITIZATION_STANDARDS.map(standard => (
                            <option key={standard} value={standard}>{standard}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.environmental_reporting_required}
                        onChange={(e) => setFormData({ ...formData, environmental_reporting_required: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">Environmental Reporting Required</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.r2_certified_required}
                        onChange={(e) => setFormData({ ...formData, r2_certified_required: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">R2 Certification Required</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.certificate_required}
                        onChange={(e) => setFormData({ ...formData, certificate_required: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">Certificate Required</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {STATUSES.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
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
                    placeholder="Notes visible to customer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal Notes
                  </label>
                  <textarea
                    value={formData.internal_notes}
                    onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Internal notes not visible to customer"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingProject ? 'Update Project' : 'Create Project'}
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
