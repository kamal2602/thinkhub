import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, Filter, Download, User, Clock, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';

interface AuditEntry {
  id: string;
  timestamp: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: any;
  ip_address?: string;
}

export function Page_Audit_Trail() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const { selectedCompany } = useCompany();

  useEffect(() => {
    loadAuditEntries();
  }, [selectedCompany, selectedEntity, selectedAction]);

  const loadAuditEntries = async () => {
    if (!selectedCompany) return;

    try {
      const { data: historyData, error: historyError } = await supabase
        .from('asset_history')
        .select(`
          id,
          created_at,
          changed_by,
          change_type,
          changes,
          asset_id
        `)
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (historyError) throw historyError;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', [...new Set((historyData || []).map(h => h.changed_by))]);

      const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      const mappedEntries: AuditEntry[] = (historyData || []).map(entry => ({
        id: entry.id,
        timestamp: entry.created_at,
        user_email: profileMap.get(entry.changed_by) || 'Unknown',
        action: entry.change_type,
        entity_type: 'asset',
        entity_id: entry.asset_id,
        changes: entry.changes
      }));

      setEntries(mappedEntries);
    } catch (error) {
      console.error('Error loading audit entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch =
      entry.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.entity_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEntity = selectedEntity === 'all' || entry.entity_type === selectedEntity;
    const matchesAction = selectedAction === 'all' || entry.action === selectedAction;
    return matchesSearch && matchesEntity && matchesAction;
  });

  const entityTypes = ['all', 'asset', 'purchase_order', 'sales_invoice', 'customer', 'supplier'];
  const actionTypes = ['all', 'created', 'updated', 'deleted', 'status_change'];

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      created: 'bg-green-100 text-green-800',
      updated: 'bg-blue-100 text-blue-800',
      deleted: 'bg-red-100 text-red-800',
      status_change: 'bg-yellow-100 text-yellow-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading audit trail...</div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
              <p className="text-gray-600 mt-1">Complete activity and change history</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search audit entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {entityTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Entities' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>

              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {actionTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Actions' : type.replace('_', ' ').charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Changes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatTimestamp(entry.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{entry.user_email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionColor(entry.action)}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{entry.entity_type}</span>
                        <span className="text-xs text-gray-500">#{entry.entity_id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-md truncate">
                        {entry.changes ? JSON.stringify(entry.changes).slice(0, 100) : 'No changes'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredEntries.length === 0 && (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No audit entries found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
