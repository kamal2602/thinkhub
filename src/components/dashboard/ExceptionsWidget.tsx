import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

interface ExceptionsWidgetProps {
  exceptions: {
    duplicateSerials: number;
    stuckInProcessing: number;
    negativeStock: number;
    recentReturnsSpike: boolean;
  };
  onViewException?: (type: string) => void;
}

export function ExceptionsWidget({ exceptions, onViewException }: ExceptionsWidgetProps) {
  const alerts = [
    {
      label: 'Duplicate Serials',
      count: exceptions.duplicateSerials,
      severity: 'high' as const,
      type: 'duplicates',
      description: 'Assets with non-unique serial numbers'
    },
    {
      label: 'Stuck in Processing',
      count: exceptions.stuckInProcessing,
      severity: 'medium' as const,
      type: 'stuck',
      description: 'Assets in processing > 30 days'
    },
    {
      label: 'Negative Stock',
      count: exceptions.negativeStock,
      severity: 'high' as const,
      type: 'negative',
      description: 'Inventory items with negative quantities'
    }
  ];

  const totalIssues = alerts.reduce((sum, alert) => sum + alert.count, 0) + (exceptions.recentReturnsSpike ? 1 : 0);

  const getSeverityColor = (severity: 'high' | 'medium' | 'low', hasIssues: boolean) => {
    if (!hasIssues) return 'text-green-600';
    if (severity === 'high') return 'text-red-600';
    if (severity === 'medium') return 'text-orange-600';
    return 'text-yellow-600';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          {totalIssues > 0 ? (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
          Exceptions
        </h3>
        <span className={`text-2xl font-bold ${totalIssues > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {totalIssues}
        </span>
      </div>

      {totalIssues === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
          <p className="text-green-700 font-medium">All Clear!</p>
          <p className="text-sm text-gray-600 mt-1">No exceptions detected</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.type}
              className={`flex justify-between items-center p-3 rounded-lg border-2 transition-colors ${
                alert.count > 0
                  ? 'border-red-200 bg-red-50 hover:bg-red-100 cursor-pointer'
                  : 'border-gray-200 bg-gray-50'
              }`}
              onClick={() => alert.count > 0 && onViewException?.(alert.type)}
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{alert.label}</p>
                <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold ${getSeverityColor(alert.severity, alert.count > 0)}`}>
                  {alert.count}
                </span>
                {alert.count > 0 && (
                  <button className="p-1 hover:bg-red-200 rounded">
                    <ArrowRight className="w-4 h-4 text-red-700" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {exceptions.recentReturnsSpike && (
            <div
              className="flex justify-between items-center p-3 rounded-lg border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 cursor-pointer"
              onClick={() => onViewException?.('returns')}
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">Returns Spike</p>
                <p className="text-xs text-gray-600 mt-1">Unusual increase in returns this month</p>
              </div>
              <button className="p-1 hover:bg-orange-200 rounded">
                <ArrowRight className="w-4 h-4 text-orange-700" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
