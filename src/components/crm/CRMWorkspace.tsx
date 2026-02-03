import { useState, useEffect } from 'react';
import { Users, Target, TrendingUp, Calendar, Plus } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { supabase } from '../../lib/supabase';

interface Lead {
  id: string;
  title: string;
  contact_name: string;
  stage: string;
  expected_value: number;
  created_at: string;
}

const stages = [
  { id: 'new', label: 'New', color: 'bg-slate-100 border-slate-300' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-100 border-blue-300' },
  { id: 'qualified', label: 'Qualified', color: 'bg-purple-100 border-purple-300' },
  { id: 'proposal', label: 'Proposal', color: 'bg-amber-100 border-amber-300' },
  { id: 'won', label: 'Won', color: 'bg-green-100 border-green-300' },
];

export function CRMWorkspace() {
  const { selectedCompany } = useCompany();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);

  useEffect(() => {
    if (selectedCompany) {
      loadLeads();
    }
  }, [selectedCompany]);

  const loadLeads = async () => {
    if (!selectedCompany) return;

    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Failed to load leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const getLeadsByStage = (stage: string) => {
    return leads.filter(l => l.stage === stage);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CRM Pipeline</h1>
              <p className="text-sm text-gray-600 mt-1">Manage leads and opportunities</p>
            </div>
            <button
              onClick={() => setShowNewLeadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Lead
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
                  <p className="text-xs text-gray-600">Total Leads</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {getLeadsByStage('qualified').length}
                  </p>
                  <p className="text-xs text-gray-600">Qualified</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50 text-green-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {getLeadsByStage('won').length}
                  </p>
                  <p className="text-xs text-gray-600">Won</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {leads.filter(l => new Date(l.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                  </p>
                  <p className="text-xs text-gray-600">This Week</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-4 min-w-max">
            {stages.map(stage => {
              const stageLeads = getLeadsByStage(stage.id);
              return (
                <div key={stage.id} className="flex-shrink-0 w-80">
                  <div className={`rounded-lg border-2 ${stage.color} p-3 mb-3`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{stage.label}</h3>
                      <span className="text-sm text-gray-600">({stageLeads.length})</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {stageLeads.map(lead => (
                      <div
                        key={lead.id}
                        className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <h4 className="font-medium text-gray-900 mb-1">{lead.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{lead.contact_name}</p>
                        {lead.expected_value > 0 && (
                          <p className="text-sm font-medium text-green-600">
                            ${lead.expected_value.toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        No leads in this stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
