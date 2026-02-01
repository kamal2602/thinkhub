import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, TrendingUp, DollarSign, Calendar, User } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { crmService, OpportunityWithParty, CreateOpportunityInput } from '../../services/crmService';
import { customerService } from '../../services/customerService';

export function Opportunities() {
  const { selectedCompany } = useCompany();
  const [opportunities, setOpportunities] = useState<OpportunityWithParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<OpportunityWithParty | null>(null);
  const [parties, setParties] = useState<any[]>([]);
  const [stages, setStages] = useState<string[]>(['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']);
  const [formData, setFormData] = useState({
    party_id: '',
    title: '',
    value_estimate: '',
    probability_percent: 50,
    stage: 'prospecting',
    expected_close_date: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const canEdit = selectedCompany?.role !== 'viewer';

  useEffect(() => {
    if (selectedCompany) {
      fetchOpportunities();
      fetchParties();
    }
  }, [selectedCompany]);

  const fetchOpportunities = async () => {
    try {
      const data = await crmService.getOpportunities(selectedCompany!.id);
      setOpportunities(data);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingOpportunity) {
        await crmService.updateOpportunity(editingOpportunity.id, selectedCompany!.id, {
          ...formData,
          value_estimate: formData.value_estimate ? parseFloat(formData.value_estimate) : undefined,
        });
      } else {
        await crmService.createOpportunity({
          company_id: selectedCompany!.id,
          ...formData,
          value_estimate: formData.value_estimate ? parseFloat(formData.value_estimate) : undefined,
        } as CreateOpportunityInput);
      }

      await fetchOpportunities();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this opportunity?')) return;

    try {
      await crmService.deleteOpportunity(id, selectedCompany!.id);
      await fetchOpportunities();
    } catch (error: any) {
      alert('Error deleting opportunity: ' + error.message);
    }
  };

  const handleStageChange = async (opportunityId: string, newStage: string) => {
    try {
      await crmService.updateOpportunity(opportunityId, selectedCompany!.id, { stage: newStage });
      await fetchOpportunities();
    } catch (error: any) {
      alert('Error updating stage: ' + error.message);
    }
  };

  const openModal = (opportunity?: OpportunityWithParty) => {
    if (opportunity) {
      setEditingOpportunity(opportunity);
      setFormData({
        party_id: opportunity.party_id || '',
        title: opportunity.title,
        value_estimate: opportunity.value_estimate?.toString() || '',
        probability_percent: opportunity.probability_percent || 50,
        stage: opportunity.stage,
        expected_close_date: opportunity.expected_close_date || '',
        notes: opportunity.notes || '',
      });
    } else {
      resetForm();
    }
    setShowModal(true);
    setError('');
  };

  const resetForm = () => {
    setEditingOpportunity(null);
    setFormData({
      party_id: '',
      title: '',
      value_estimate: '',
      probability_percent: 50,
      stage: 'prospecting',
      expected_close_date: '',
      notes: '',
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'prospecting':
        return 'bg-gray-100 border-gray-300';
      case 'qualification':
        return 'bg-blue-100 border-blue-300';
      case 'proposal':
        return 'bg-yellow-100 border-yellow-300';
      case 'negotiation':
        return 'bg-orange-100 border-orange-300';
      case 'closed_won':
        return 'bg-green-100 border-green-300';
      case 'closed_lost':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getStageBadge = (stage: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (stage) {
      case 'prospecting':
        return `${baseClasses} bg-gray-100 text-gray-700`;
      case 'qualification':
        return `${baseClasses} bg-blue-100 text-blue-700`;
      case 'proposal':
        return `${baseClasses} bg-yellow-100 text-yellow-700`;
      case 'negotiation':
        return `${baseClasses} bg-orange-100 text-orange-700`;
      case 'closed_won':
        return `${baseClasses} bg-green-100 text-green-700`;
      case 'closed_lost':
        return `${baseClasses} bg-red-100 text-red-700`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700`;
    }
  };

  const getTotalValue = (stage: string) => {
    return opportunities
      .filter((opp) => opp.stage === stage)
      .reduce((sum, opp) => sum + (opp.value_estimate || 0), 0);
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
          <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="text-gray-600">Track and manage your opportunities</p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 rounded ${viewMode === 'kanban' ? 'bg-white shadow' : ''}`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
            >
              List
            </button>
          </div>
          {canEdit && (
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Add Opportunity
            </button>
          )}
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageOpps = opportunities.filter((opp) => opp.stage === stage);
            const totalValue = getTotalValue(stage);

            return (
              <div key={stage} className={`flex-shrink-0 w-80 rounded-lg border-2 ${getStageColor(stage)}`}>
                <div className="p-4 bg-white rounded-t-lg border-b">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-900 capitalize">
                      {stage.replace('_', ' ')}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {stageOpps.length}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-600">
                    {formatCurrency(totalValue)}
                  </div>
                </div>

                <div className="p-2 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {stageOpps.map((opp) => (
                    <div
                      key={opp.id}
                      className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 text-sm">{opp.title}</h4>
                        {canEdit && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => openModal(opp)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(opp.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-gray-600">
                        {opp.party && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {opp.party.name}
                          </div>
                        )}
                        {opp.value_estimate && (
                          <div className="flex items-center gap-1 font-medium text-green-600">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(opp.value_estimate)}
                          </div>
                        )}
                        {opp.expected_close_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(opp.expected_close_date).toLocaleDateString()}
                          </div>
                        )}
                        {opp.probability_percent !== undefined && (
                          <div className="text-xs">
                            Probability: {opp.probability_percent}%
                          </div>
                        )}
                      </div>

                      {canEdit && stage !== 'closed_won' && stage !== 'closed_lost' && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <select
                            value={opp.stage}
                            onChange={(e) => handleStageChange(opp.id, e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            {stages.map((s) => (
                              <option key={s} value={s}>
                                {s.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}

                  {stageOpps.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No opportunities
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opportunity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Close Date
                </th>
                {canEdit && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {opportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{opp.title}</div>
                    <div className="text-sm text-gray-500">
                      {opp.probability_percent}% probability
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {opp.party?.name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={getStageBadge(opp.stage)}>
                      {opp.stage.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(opp.value_estimate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {opp.expected_close_date
                      ? new Date(opp.expected_close_date).toLocaleDateString()
                      : '-'}
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openModal(opp)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(opp.id)}
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

          {opportunities.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No opportunities</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new opportunity.
              </p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingOpportunity ? 'Edit Opportunity' : 'Add New Opportunity'}
              </h2>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>

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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Value
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.value_estimate}
                      onChange={(e) => setFormData({ ...formData, value_estimate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Probability (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability_percent}
                      onChange={(e) => setFormData({ ...formData, probability_percent: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stage
                    </label>
                    <select
                      value={formData.stage}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      {stages.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Close Date
                    </label>
                    <input
                      type="date"
                      value={formData.expected_close_date}
                      onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
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
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    {editingOpportunity ? 'Update' : 'Create'}
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
    </div>
  );
}
