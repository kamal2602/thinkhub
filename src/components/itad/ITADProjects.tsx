import { useState, useEffect } from 'react';
import { Plus, Building2, Edit2, Trash2, Calendar, DollarSign, FileText, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { Database } from '../../lib/database.types';

type ITADProject = Database['public']['Tables']['itad_projects']['Row'];
type ITADProjectInsert = Database['public']['Tables']['itad_projects']['Insert'];
type Customer = Database['public']['Tables']['customers']['Row'];

export function ITADProjects() {
  const { selectedCompany } = useCompany();
  const [projects, setProjects] = useState<ITADProject[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ITADProject | null>(null);
  const [formData, setFormData] = useState<Partial<ITADProjectInsert>>({
    project_name: '',
    itad_customer_id: '',
    service_type: 'full_itad',
    expected_quantity: 0,
    service_fee: 0,
    service_fee_currency: 'USD',
    revenue_share_percentage: 0,
    data_sanitization_required: true,
    data_sanitization_standard: 'NIST-800-88',
    environmental_reporting_required: true,
    r2_certified_required: false,
    certificate_required: true,
    status: 'pending',
    notes: '',
  });
  const [error, setError] = useState('');

  const canEdit = selectedCompany?.role !== 'viewer';

  useEffect(() => {
    if (selectedCompany) {
      fetchProjects();
      fetchITADCustomers();
    }
  }, [selectedCompany]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('itad_projects')
        .select(`
          *,
          customers:itad_customer_id (
            id,
            name,
            business_type
          )
        `)
        .eq('company_id', selectedCompany?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching ITAD projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchITADCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', selectedCompany?.id)
        .eq('business_type', 'itad_service_customer')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching ITAD customers:', error);
    }
  };

  const generateProjectNumber = async () => {
    const { data, error } = await supabase.rpc('generate_itad_project_number', {
      p_company_id: selectedCompany?.id,
    });

    if (error) {
      console.error('Error generating project number:', error);
      return `ITAD-${new Date().getFullYear()}-${String(projects.length + 1).padStart(4, '0')}`;
    }

    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingProject) {
        const { error } = await supabase
          .from('itad_projects')
          .update(formData)
          .eq('id', editingProject.id);

        if (error) throw error;
      } else {
        const projectNumber = await generateProjectNumber();

        const { error } = await supabase
          .from('itad_projects')
          .insert({
            company_id: selectedCompany?.id,
            project_number: projectNumber,
            ...formData,
          });

        if (error) throw error;
      }

      await fetchProjects();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ITAD project?')) return;

    try {
      const { error } = await supabase.from('itad_projects').delete().eq('id', id);
      if (error) throw error;
      await fetchProjects();
    } catch (error: any) {
      alert('Error deleting ITAD project: ' + error.message);
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
      data_sanitization_required: true,
      data_sanitization_standard: 'NIST-800-88',
      environmental_reporting_required: true,
      r2_certified_required: false,
      certificate_required: true,
      status: 'pending',
      notes: '',
    });
    setEditingProject(null);
  };

  const openModal = (project?: ITADProject) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        project_name: project.project_name,
        itad_customer_id: project.itad_customer_id,
        service_type: project.service_type,
        expected_quantity: project.expected_quantity,
        service_fee: Number(project.service_fee),
        service_fee_currency: project.service_fee_currency,
        revenue_share_percentage: Number(project.revenue_share_percentage),
        data_sanitization_required: project.data_sanitization_required,
        data_sanitization_standard: project.data_sanitization_standard,
        environmental_reporting_required: project.environmental_reporting_required,
        r2_certified_required: project.r2_certified_required,
        certificate_required: project.certificate_required,
        status: project.status,
        notes: project.notes,
      });
    } else {
      resetForm();
    }
    setShowModal(true);
    setError('');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700',
      intake_scheduled: 'bg-blue-100 text-blue-700',
      receiving: 'bg-cyan-100 text-cyan-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      sanitization: 'bg-orange-100 text-orange-700',
      testing: 'bg-purple-100 text-purple-700',
      disposition: 'bg-indigo-100 text-indigo-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
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

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ITAD Projects</h1>
          <p className="text-gray-600">Manage ITAD service projects for {selectedCompany.name}</p>
        </div>
        {canEdit && (
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Plus className="w-5 h-5" />
            New ITAD Project
          </button>
        )}
      </div>

      {customers.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800">
            You need to add ITAD Service Customers first. Go to Customers and create a customer with type "ITAD Service Customer".
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No ITAD projects yet</h3>
          <p className="text-gray-600 mb-6">Create your first ITAD service project</p>
          {canEdit && customers.length > 0 && (
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Plus className="w-5 h-5" />
              New ITAD Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((project: any) => (
            <div
              key={project.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-mono text-gray-600">{project.project_number}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{project.project_name || 'Unnamed Project'}</h3>
                  <p className="text-sm text-gray-600 mt-1">{project.customers?.name}</p>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(project)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(project.status)}`}>
                    {project.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">{project.service_type.replace('_', ' ')}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  Expected: {project.expected_quantity} units
                </div>

                {project.service_fee > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    Service Fee: {project.service_fee_currency} {Number(project.service_fee).toFixed(2)}
                  </div>
                )}

                {project.revenue_share_percentage > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    Revenue Share: {Number(project.revenue_share_percentage).toFixed(1)}%
                  </div>
                )}
              </div>

              <div className="border-t pt-3 flex items-center gap-2 flex-wrap">
                {project.data_sanitization_required && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs rounded">
                    <CheckCircle className="w-3 h-3" />
                    Data Sanitization
                  </span>
                )}
                {project.certificate_required && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                    <FileText className="w-3 h-3" />
                    Certificate
                  </span>
                )}
                {project.environmental_reporting_required && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                    <CheckCircle className="w-3 h-3" />
                    Environmental
                  </span>
                )}
              </div>

              {project.notes && (
                <p className="text-sm text-gray-500 mt-3 border-t pt-3 line-clamp-2">{project.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingProject ? 'Edit ITAD Project' : 'New ITAD Project'}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.project_name || ''}
                    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Microsoft Asset Disposal Q1 2026"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ITAD Customer *
                  </label>
                  <select
                    value={formData.itad_customer_id || ''}
                    onChange={(e) => setFormData({ ...formData, itad_customer_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select ITAD Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type *
                  </label>
                  <select
                    value={formData.service_type || 'full_itad'}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="full_itad">Full ITAD</option>
                    <option value="data_destruction_only">Data Destruction Only</option>
                    <option value="remarketing_only">Remarketing Only</option>
                    <option value="recycling_only">Recycling Only</option>
                    <option value="asset_recovery">Asset Recovery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.expected_quantity || 0}
                    onChange={(e) => setFormData({ ...formData, expected_quantity: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Fee
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.service_fee || 0}
                    onChange={(e) => setFormData({ ...formData, service_fee: parseFloat(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Revenue Share %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.revenue_share_percentage || 0}
                    onChange={(e) => setFormData({ ...formData, revenue_share_percentage: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status || 'pending'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="intake_scheduled">Intake Scheduled</option>
                    <option value="receiving">Receiving</option>
                    <option value="in_progress">In Progress</option>
                    <option value="sanitization">Sanitization</option>
                    <option value="testing">Testing</option>
                    <option value="disposition">Disposition</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.data_sanitization_required || false}
                      onChange={(e) => setFormData({ ...formData, data_sanitization_required: e.target.checked })}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Data Sanitization Required</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.certificate_required || false}
                      onChange={(e) => setFormData({ ...formData, certificate_required: e.target.checked })}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Certificate Required</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.environmental_reporting_required || false}
                      onChange={(e) => setFormData({ ...formData, environmental_reporting_required: e.target.checked })}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Environmental Reporting Required</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.r2_certified_required || false}
                      onChange={(e) => setFormData({ ...formData, r2_certified_required: e.target.checked })}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">R2 Certification Required</span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Project notes and special requirements"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  {editingProject ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
