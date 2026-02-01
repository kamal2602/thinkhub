import { useState, useEffect } from 'react';
import { Users, TrendingUp, DollarSign, CheckCircle, Clock, Phone } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { crmService, PipelineStats } from '../../services/crmService';

interface CRMDashboardProps {
  onNavigate?: (page: string) => void;
}

export function CRMDashboard({ onNavigate }: CRMDashboardProps) {
  const { selectedCompany } = useCompany();
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [leadStats, setLeadStats] = useState({
    new: 0,
    contacted: 0,
    qualified: 0,
    total: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompany) {
      fetchDashboardData();
    }
  }, [selectedCompany]);

  const fetchDashboardData = async () => {
    try {
      const [pipelineStats, leads, activities] = await Promise.all([
        crmService.getPipelineStats(selectedCompany!.id),
        crmService.getLeads(selectedCompany!.id),
        crmService.getActivities(selectedCompany!.id, { completed: false }),
      ]);

      setStats(pipelineStats);

      setLeadStats({
        new: leads.filter((l) => l.status === 'new').length,
        contacted: leads.filter((l) => l.status === 'contacted').length,
        qualified: leads.filter((l) => l.status === 'qualified').length,
        total: leads.length,
      });

      setRecentActivities(activities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CRM Dashboard</h1>
        <p className="text-gray-600">Track your sales pipeline and customer interactions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <h3 className="text-sm font-medium text-gray-600">Total Leads</h3>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{leadStats.total}</p>
          <p className="text-sm text-gray-500 mt-1">
            {leadStats.new} new, {leadStats.qualified} qualified
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <h3 className="text-sm font-medium text-gray-600">Opportunities</h3>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.total_opportunities || 0}</p>
          <p className="text-sm text-gray-500 mt-1">
            In pipeline
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <h3 className="text-sm font-medium text-gray-600">Total Pipeline Value</h3>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(stats?.total_value || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Weighted: {formatCurrency(stats?.weighted_value || 0)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <h3 className="text-sm font-medium text-gray-600">Pending Activities</h3>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{recentActivities.length}</p>
          <p className="text-sm text-gray-500 mt-1">
            Require attention
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pipeline by Stage</h2>
          </div>
          <div className="p-6">
            {stats?.by_stage && stats.by_stage.length > 0 ? (
              <div className="space-y-4">
                {stats.by_stage.map((stage) => (
                  <div key={stage.stage}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {stage.stage.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-600">
                        {stage.count} opportunities
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(stage.value / (stats.total_value || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 min-w-[80px] text-right">
                        {formatCurrency(stage.value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No pipeline data available
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Activities</h2>
            {onNavigate && (
              <button
                onClick={() => onNavigate('crm-activities')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View all
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-200">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {activity.activity_type === 'call' && <Phone className="h-4 w-4 text-blue-500" />}
                      {activity.activity_type === 'email' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {activity.activity_type === 'meeting' && <Clock className="h-4 w-4 text-orange-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.subject}
                      </p>
                      {activity.party && (
                        <p className="text-sm text-gray-600">
                          {activity.party.name}
                        </p>
                      )}
                      {activity.due_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {new Date(activity.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                No upcoming activities
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {onNavigate && (
          <>
            <button
              onClick={() => onNavigate('crm-leads')}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 rounded-lg p-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Leads</h3>
              </div>
              <p className="text-sm text-gray-600">
                Track and qualify potential customers
              </p>
            </button>

            <button
              onClick={() => onNavigate('crm-opportunities')}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-orange-100 rounded-lg p-3">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Sales Pipeline</h3>
              </div>
              <p className="text-sm text-gray-600">
                Manage opportunities and close deals
              </p>
            </button>

            <button
              onClick={() => onNavigate('crm-activities')}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 rounded-lg p-3">
                  <Phone className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Activities</h3>
              </div>
              <p className="text-sm text-gray-600">
                Track calls, emails, and meetings
              </p>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
