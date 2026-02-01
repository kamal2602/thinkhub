import { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { accountingService, ChartOfAccount } from '../../services/accountingService';

export function ChartOfAccounts() {
  const { selectedCompany } = useCompany();
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompany?.id) {
      loadAccounts();
    }
  }, [selectedCompany?.id]);

  const loadAccounts = async () => {
    if (!selectedCompany?.id) return;
    try {
      setLoading(true);
      const data = await accountingService.getChartOfAccounts(selectedCompany.id);
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      asset: 'bg-blue-100 text-blue-700',
      liability: 'bg-red-100 text-red-700',
      equity: 'bg-purple-100 text-purple-700',
      revenue: 'bg-green-100 text-green-700',
      expense: 'bg-orange-100 text-orange-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (!selectedCompany) {
    return <div className="p-6 text-gray-500">Please select a company first.</div>;
  }

  if (loading) {
    return <div className="p-6">Loading accounts...</div>;
  }

  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    acc[account.account_type].push(account);
    return acc;
  }, {} as Record<string, ChartOfAccount[]>);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Chart of Accounts</h1>

      <div className="space-y-6">
        {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
          <div key={type} className="bg-white rounded-lg border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 capitalize">{type}</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {typeAccounts.map(account => (
                <div key={account.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-slate-600 w-20">{account.account_code}</span>
                    <div>
                      <div className="font-medium text-slate-800">{account.account_name}</div>
                      {account.account_category && (
                        <div className="text-sm text-slate-500">{account.account_category}</div>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getAccountTypeColor(account.account_type)}`}>
                    {account.account_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">No accounts found. Contact your administrator to set up the chart of accounts.</p>
        </div>
      )}
    </div>
  );
}
