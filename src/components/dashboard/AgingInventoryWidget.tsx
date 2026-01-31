import { AlertTriangle, TrendingUp } from 'lucide-react';

interface AgingInventoryWidgetProps {
  data: {
    over30Days: number;
    over60Days: number;
    over90Days: number;
  };
  onViewDetails?: (threshold: number) => void;
}

export function AgingInventoryWidget({ data, onViewDetails }: AgingInventoryWidgetProps) {
  const total = data.over30Days + data.over60Days + data.over90Days;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Aging Inventory</h3>
        <TrendingUp className="w-5 h-5 text-orange-600" />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer" onClick={() => onViewDetails?.(30)}>
          <div>
            <p className="text-sm text-gray-600">30+ days unsold</p>
            <p className="text-xs text-gray-500 mt-1">Items in ready/listed status</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-orange-600">{data.over30Days}</span>
          </div>
        </div>

        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer" onClick={() => onViewDetails?.(60)}>
          <div>
            <p className="text-sm text-gray-600">60+ days unsold</p>
            <p className="text-xs text-gray-500 mt-1">Consider price adjustment</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-red-600">{data.over60Days}</span>
          </div>
        </div>

        <div className="flex justify-between items-center p-3 bg-red-100 rounded-lg hover:bg-red-200 transition-colors cursor-pointer" onClick={() => onViewDetails?.(90)}>
          <div>
            <p className="text-sm text-gray-600">90+ days unsold</p>
            <p className="text-xs text-gray-500 mt-1">Critical: review pricing</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-red-800">{data.over90Days}</span>
          </div>
        </div>
      </div>

      {total > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertTriangle className="w-4 h-4" />
            <span>Total aging items: <strong>{total}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
