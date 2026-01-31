import { DollarSign, Users } from 'lucide-react';

interface TopCustomersWidgetProps {
  customers: Array<{
    id: string;
    name: string;
    total_orders: number;
    total_revenue: number;
  }>;
  onViewCustomer?: (customerId: string) => void;
}

export function TopCustomersWidget({ customers, onViewCustomer }: TopCustomersWidgetProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
        <DollarSign className="w-5 h-5 text-green-600" />
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No customer data yet</p>
          <p className="text-sm text-gray-500 mt-1">Start creating sales invoices</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer, index) => (
            <div
              key={customer.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onViewCustomer?.(customer.id)}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-sm font-bold text-green-700">#{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                <p className="text-sm text-gray-600">
                  {customer.total_orders} {customer.total_orders === 1 ? 'order' : 'orders'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatCurrency(customer.total_revenue)}</p>
                <p className="text-xs text-gray-500">revenue</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {customers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Showing top {customers.length} customers by total revenue
          </p>
        </div>
      )}
    </div>
  );
}
