import { TrendingUp, Clock, DollarSign, AlertTriangle } from 'lucide-react';

interface ProcessingStats {
  received: number;
  testing: number;
  refurbishing: number;
  qc_grading: number;
  ready: number;
  totalValue: number;
  avgDays: number;
  staleCount: number;
  priorityCount: number;
}

interface ProcessingDashboardProps {
  stats: ProcessingStats;
}

export function ProcessingDashboard({ stats }: ProcessingDashboardProps) {
  const totalInProcess = stats.received + stats.testing + stats.refurbishing + stats.qc_grading;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Processing Pipeline Summary</h2>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-700">{stats.received}</div>
          <div className="text-xs text-gray-500 mt-1">Received</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.testing}</div>
          <div className="text-xs text-gray-500 mt-1">Testing</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.refurbishing}</div>
          <div className="text-xs text-gray-500 mt-1">Refurbishing</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.qc_grading}</div>
          <div className="text-xs text-gray-500 mt-1">QC/Grading</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
          <div className="text-xs text-gray-500 mt-1">Ready</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{totalInProcess}</div>
          <div className="text-xs text-gray-500 mt-1">In Pipeline</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              ${stats.totalValue.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Total Value</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {stats.avgDays.toFixed(1)} days
            </div>
            <div className="text-xs text-gray-500">Avg Time</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {stats.staleCount}
            </div>
            <div className="text-xs text-gray-500">Stale Items</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {stats.priorityCount}
            </div>
            <div className="text-xs text-gray-500">Priority Items</div>
          </div>
        </div>
      </div>
    </div>
  );
}
