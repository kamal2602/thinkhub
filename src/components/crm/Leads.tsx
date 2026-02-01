import { useState, useEffect } from 'react';
import { Plus, User, Edit2, Trash2, CheckCircle, Clock, XCircle, TrendingUp, Users } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { crmService, LeadWithParty, CreateLeadInput } from '../../services/crmService';
import { customerService } from '../../services/customerService';

export function Leads() {
  const { selectedCompany } = useCompany();
  const [leads, setLeads] = useState<LeadWithParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithParty | null>(null);
  const [convertingLead, setConvertingLead] = useState<LeadWithParty | null>(null);
  const [parties, setParties] = useState<any[]>([]);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    party_id: '',
    status: 'new',
    lead_source: '',
    qualification_score: 50,
    notes: '',
  });
  const [convertData, setConvertData] = useState({
    title: '',
    value_estimate: '',
    stage: 'prospecting',
    expected_close_date: '',
  });
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const canEdit = selectedCompany?.role !== 'viewer';

  useEffect(() => {
    if (selectedCompany) {
      fetchLeads();
      fetchParties();
      fetchLeadSources();
    }
  }, [selectedCompany, statusFilter]);

  const fetchLeads = async () => {
    try {
      const data = await crmService.getLeads(selectedCompany!.id, {
        status: statusFilter || undefined,
      });
      setLeads(data);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParties = async () => {
    try {
      const customers = await customerService.getCustomers(selectedCompany!.id);
      setParties(customers);
    } catch (error) {
      console.error('Error fetching parties:', error);
    }
  };

  const fetchLeadSources = async () => {
    try {
      const sources = await crmService.getLeadSources(selectedCompany!.id);
      setLeadSources(sources);
    } catch (error) {
      console.error('Error fetching lead sources:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingLead) {
        await crmService.updateLead(editingLead.id, selectedCompany!.id, formData);
      } else {
        await crmService.createLead({
          company_id: selectedCompany!.id,
          ...formData,
        } as CreateLeadInput);
      }

      await fetchLeads();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingLead) return;

    setError('');

    try {
      await crmService.convertLeadToOpportunity(
        convertingLead.id,
        selectedCompany!.id,
        {
          title: convertData.title,
          value_estimate: convertData.value_estimate ? parseFloat(convertData.value_estimate) : undefined,
          stage: convertData.stage,
          expected_close_date: convertData.expected_close_date || undefined,
        }
      );

      await fetchLeads();
      setShowConvertModal(false);
      setConvertingLead(null);
      setConvertData({
        title: '',
        value_estimate: '',
        stage: 'prospecting',
        expected_close_date: '',
      });
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      await crmService.deleteLead(id, selectedCompany!.id);
      await fetchLeads();
    } catch (error: any) {
      alert('Error deleting lead: ' + error.message);
    }
  };

  const openModal = (lead?: LeadWithParty) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        party_id: lead.party_id || '',
        status: lead.status,
        lead_source: lead.lead_source || '',
        qualification_score: lead.qualification_score || 50,
        notes: lead.notes || '',
      });
    } else {
      resetForm();
    }
    setShowModal(true);
    setError('');
  };

  const openConvertModal = (lead: LeadWithParty) => {
    setConvertingLead(lead);
    setConvertData({
      title: `${lead.party?.name || 'Untitled'} Opportunity`,
      value_estimate: '',
      stage: 'prospecting',
      expected_close_date: '',
    });
    setShowConvertModal(true);
    setError('');
  };

  const resetForm = () => {
    setEditingLead(null);
    setFormData({
      party_id: '',
      status: 'new',
      lead_source: '',
      qualification_score: 50,
      notes: '',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'contacted':
        return <User className="h-4 w-4 text-yellow-500" />;
      case 'qualified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'converted':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'lost':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (status) {
      case 'new':
        return `${baseClasses} bg-blue-100 text-blue-700`;
      case 'contacted':
        return `${baseClasses} bg-yellow-100 text-yellow-700`;
      case 'qualified':
        return `${baseClasses} bg-green-100 text-green-700`;
      case 'converted':
        return `${baseClasses} bg-green-200 text-green-800`;
      case 'lost':
        return `${baseClasses} bg-red-100 text-red-700`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700`;
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">Manage your sales leads</p>
        </div>
        {canEdit && (
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Add Lead
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-4 py-2 rounded-lg ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter('new')}
          className={`px-4 py-2 rounded-lg ${statusFilter === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          New
        </button>
        <button
          onClick={() => setStatusFilter('contacted')}
          className={`px-4 py-2 rounded-lg ${statusFilter === 'contacted' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Contacted
        </button>
        <button
          onClick={() => setStatusFilter('qualified')}
          className={`px-4 py-2 rounded-lg ${statusFilter === 'qualified' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Qualified
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              {canEdit && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <Users className="h-10 w-10 text-gray-400" />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.party?.name || 'Unknown Contact'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {lead.party?.email || ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={getStatusBadge(lead.status)}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {lead.lead_source || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {lead.qualification_score || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(lead.created_at).toLocaleDateString()}
                </td>
                {canEdit && (
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {lead.status === 'qualified' && (
                        <button
                          onClick={() => openConvertModal(lead)}
                          className="text-green-600 hover:text-green-900"
                          title="Convert to Opportunity"
                        >
                          <TrendingUp className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => openModal(lead)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {leads.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leads</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new lead.
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingLead ? 'Edit Lead' : 'Add New Lead'}
              </h2>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact *
                  </label>
                  <select
                    value={formData.party_id}
                    onChange={(e) => setFormData({ ...formData, party_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  >
                    <option value="">Select a contact...</option>
                    {parties.map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.name} {party.email ? `(${party.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lead Source
                  </label>
                  <select
                    value={formData.lead_source}
                    onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="">Select source...</option>
                    {leadSources.map((source) => (
                      <option key={source.id} value={source.name}>
                        {source.name}
                      </option>
                    ))}
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="Trade Show">Trade Show</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qualification Score (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.qualification_score}
                    onChange={(e) => setFormData({ ...formData, qualification_score: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    {editingLead ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showConvertModal && convertingLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                Convert Lead to Opportunity
              </h2>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <form onSubmit={handleConvert} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opportunity Title *
                  </label>
                  <input
                    type="text"
                    value={convertData.title}
                    onChange={(e) => setConvertData({ ...convertData, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Value
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={convertData.value_estimate}
                    onChange={(e) => setConvertData({ ...convertData, value_estimate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Close Date
                  </label>
                  <input
                    type="date"
                    value={convertData.expected_close_date}
                    onChange={(e) => setConvertData({ ...convertData, expected_close_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                  >
                    Convert to Opportunity
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConvertModal(false);
                      setConvertingLead(null);
                    }}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
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
