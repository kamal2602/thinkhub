import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, Plus, Search, Filter } from 'lucide-react';
import { ModuleHomeTemplate } from '../modules/ModuleHomeTemplate';

interface Payment {
  id: string;
  type: 'receipt' | 'payout';
  amount: number;
  currency: string;
  party: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  method: string;
}

export function Page_Payments() {
  const [payments] = useState<Payment[]>([
    {
      id: '1',
      type: 'receipt',
      amount: 15000,
      currency: 'USD',
      party: 'Acme Corp',
      reference: 'INV-2024-001',
      status: 'completed',
      date: new Date().toISOString(),
      method: 'Bank Transfer'
    },
    {
      id: '2',
      type: 'payout',
      amount: 8500,
      currency: 'USD',
      party: 'Tech Supplies Inc',
      reference: 'PO-2024-045',
      status: 'pending',
      date: new Date().toISOString(),
      method: 'Check'
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const stats = [
    {
      label: 'Total Receipts',
      value: '$145,230',
      trend: { direction: 'up' as const, value: '+12%' },
      icon: ArrowDownCircle
    },
    {
      label: 'Total Payouts',
      value: '$87,450',
      trend: { direction: 'down' as const, value: '-5%' },
      icon: ArrowUpCircle
    },
    {
      label: 'Net Cash Flow',
      value: '$57,780',
      trend: { direction: 'up' as const, value: '+8%' },
      icon: TrendingUp
    },
    {
      label: 'Pending',
      value: '12',
      icon: DollarSign
    }
  ];

  const actions = [
    {
      label: 'Record Receipt',
      icon: ArrowDownCircle,
      onClick: () => console.log('Record receipt'),
      variant: 'primary' as const
    },
    {
      label: 'Record Payout',
      icon: ArrowUpCircle,
      onClick: () => console.log('Record payout'),
      variant: 'secondary' as const
    }
  ];

  const recentActivity = [
    {
      id: '1',
      title: 'Payment Received',
      description: '$15,000 from Acme Corp for INV-2024-001',
      timestamp: '2 hours ago',
      user: 'John Doe',
      type: 'success' as const
    },
    {
      id: '2',
      title: 'Payout Pending',
      description: '$8,500 to Tech Supplies Inc for PO-2024-045',
      timestamp: '5 hours ago',
      user: 'Jane Smith',
      type: 'warning' as const
    }
  ];

  const filteredPayments = payments.filter(payment => {
    const matchesSearch =
      payment.party.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.reference.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || payment.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || payment.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    return type === 'receipt' ? (
      <ArrowDownCircle className="w-4 h-4 text-green-600" />
    ) : (
      <ArrowUpCircle className="w-4 h-4 text-red-600" />
    );
  };

  return (
    <ModuleHomeTemplate
      title="Payments"
      description="Receipts and payouts management"
      icon={DollarSign}
      stats={stats}
      actions={actions}
      recentActivity={recentActivity}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Payment Transactions</h3>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="receipt">Receipts</option>
              <option value="payout">Payouts</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(payment.type)}
                      <span className="text-sm font-medium text-gray-900 capitalize">{payment.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{payment.party}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{payment.reference}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payment.currency} {payment.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{payment.method}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {new Date(payment.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPayments.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No payments found</p>
            </div>
          )}
        </div>
      </div>
    </ModuleHomeTemplate>
  );
}
