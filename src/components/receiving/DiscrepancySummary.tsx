import { AlertTriangle, Download } from 'lucide-react';

interface Discrepancy {
  type: 'shortage' | 'overage' | 'mismatch';
  serialNumber: string;
  expected?: string;
  actual?: string;
}

interface Props {
  discrepancies: Discrepancy[];
  onExport: () => void;
}

export function DiscrepancySummary({ discrepancies, onExport }: Props) {
  const shortages = discrepancies.filter(d => d.type === 'shortage');
  const overages = discrepancies.filter(d => d.type === 'overage');
  const mismatches = discrepancies.filter(d => d.type === 'mismatch');

  const hasDiscrepancies = discrepancies.length > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Discrepancy Summary
        </h3>
        {hasDiscrepancies && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        )}
      </div>

      {!hasDiscrepancies ? (
        <div className="text-center py-8 text-gray-500">
          No discrepancies detected
        </div>
      ) : (
        <div className="space-y-4">
          {shortages.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="font-medium text-red-900 mb-2">
                Shortage ({shortages.length})
              </div>
              <div className="text-sm text-red-800 space-y-1">
                {shortages.slice(0, 3).map((d, i) => (
                  <div key={i}>{d.serialNumber}</div>
                ))}
                {shortages.length > 3 && (
                  <div className="text-red-600">+ {shortages.length - 3} more</div>
                )}
              </div>
            </div>
          )}

          {overages.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="font-medium text-amber-900 mb-2">
                Overage ({overages.length})
              </div>
              <div className="text-sm text-amber-800 space-y-1">
                {overages.slice(0, 3).map((d, i) => (
                  <div key={i}>{d.serialNumber}</div>
                ))}
                {overages.length > 3 && (
                  <div className="text-amber-600">+ {overages.length - 3} more</div>
                )}
              </div>
            </div>
          )}

          {mismatches.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="font-medium text-yellow-900 mb-2">
                Mismatch ({mismatches.length})
              </div>
              <div className="text-sm text-yellow-800 space-y-1">
                {mismatches.slice(0, 3).map((d, i) => (
                  <div key={i}>
                    {d.serialNumber}: Expected {d.expected}, Got {d.actual}
                  </div>
                ))}
                {mismatches.length > 3 && (
                  <div className="text-yellow-600">+ {mismatches.length - 3} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
