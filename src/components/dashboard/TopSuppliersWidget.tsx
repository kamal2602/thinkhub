import { TrendingUp, Package } from 'lucide-react';

interface TopSuppliersWidgetProps {
  suppliers: Array<{
    id: string;
    name: string;
    total_purchases: number;
    total_spent: number;
  }>;
  onViewSupplier?: (supplierId: string) => void;
}

export function TopSuppliersWidget({ suppliers, onViewSupplier }: TopSuppliersWidgetProps) {
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
        <h3 className="text-lg font-semibold text-gray-900">Top Suppliers</h3>
        <TrendingUp className="w-5 h-5 text-blue-600" />
      </div>

      {suppliers.length === 0 ? (
        <div className="text-center py-8">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No supplier data yet</p>
          <p className="text-sm text-gray-500 mt-1">Start creating purchase orders</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map((supplier, index) => (
            <div
              key={supplier.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onViewSupplier?.(supplier.id)}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-bold text-blue-700">#{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{supplier.name}</p>
                <p className="text-sm text-gray-600">
                  {supplier.total_purchases} {supplier.total_purchases === 1 ? 'order' : 'orders'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatCurrency(supplier.total_spent)}</p>
                <p className="text-xs text-gray-500">total spent</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {suppliers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Showing top {suppliers.length} suppliers by total spend
          </p>
        </div>
      )}
    </div>
  );
}
