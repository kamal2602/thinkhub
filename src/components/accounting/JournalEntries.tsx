import { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { accountingService, JournalEntry } from '../../services/accountingService';

export function JournalEntries() {
  const { selectedCompany } = useCompany();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompany?.id) {
      loadEntries();
    }
  }, [selectedCompany?.id]);

  const loadEntries = async () => {
    if (!selectedCompany?.id) return;
    try {
      setLoading(true);
      const data = await accountingService.getJournalEntries(selectedCompany.id);
      setEntries(data);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      posted: 'bg-green-100 text-green-700',
      void: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (!selectedCompany) {
    return <div className="p-6 text-gray-500">Please select a company first.</div>;
  }

  if (loading) {
    return <div className="p-6">Loading journal entries...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Journal Entries</h1>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Entry #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-mono text-slate-800">{entry.entry_number}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(entry.entry_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-800">{entry.description}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {entry.reference_type ? entry.reference_type.replace('_', ' ') : 'Manual'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(entry.status)}`}>
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {entries.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center mt-6">
          <p className="text-slate-600">No journal entries found.</p>
          <p className="text-sm text-slate-500 mt-1">Journal entries will appear here as transactions are recorded.</p>
        </div>
      )}
    </div>
  );
}
