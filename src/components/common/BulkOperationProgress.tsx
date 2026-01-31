import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface BulkOperationProgressProps {
  isOpen: boolean;
  progress: number;
  total: number;
  percentage: number;
  successCount: number;
  errors: Array<{ error: Error; index: number }>;
  title?: string;
  onClose?: () => void;
}

export function BulkOperationProgress({
  isOpen,
  progress,
  total,
  percentage,
  successCount,
  errors,
  title = 'Processing...',
  onClose
}: BulkOperationProgressProps) {
  if (!isOpen) return null;

  const isComplete = progress === total;
  const hasErrors = errors.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full m-4">
        <div className="flex items-center gap-3 mb-4">
          {isComplete ? (
            hasErrors ? (
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            )
          ) : (
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          )}
          <h3 className="text-lg font-semibold">
            {isComplete ? (hasErrors ? 'Completed with errors' : 'Completed successfully') : title}
          </h3>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-700">Progress</span>
            <span className="font-medium text-gray-900">
              {progress} / {total}
            </span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isComplete
                  ? hasErrors
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {Math.round(percentage)}% complete
          </div>
        </div>

        {isComplete && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Successful:</span>
              <span className="font-medium text-green-600">{successCount}</span>
            </div>
            {hasErrors && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Failed:</span>
                <span className="font-medium text-red-600">{errors.length}</span>
              </div>
            )}
          </div>
        )}

        {hasErrors && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200 max-h-40 overflow-y-auto">
            <p className="text-sm font-medium text-red-900 mb-2">Errors:</p>
            <ul className="text-sm text-red-700 space-y-1">
              {errors.slice(0, 5).map((error, idx) => (
                <li key={idx}>
                  Row {error.index + 1}: {error.error.message}
                </li>
              ))}
              {errors.length > 5 && (
                <li className="font-medium">... and {errors.length - 5} more</li>
              )}
            </ul>
          </div>
        )}

        {isComplete && onClose && (
          <button
            onClick={onClose}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
