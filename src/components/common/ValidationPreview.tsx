import { AlertTriangle, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export interface ValidationError {
  row: number;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  validRowCount: number;
  totalRowCount: number;
}

interface ValidationPreviewProps {
  result: ValidationResult;
  onContinue?: () => void;
  onCancel?: () => void;
  maxErrorsToShow?: number;
}

export function ValidationPreview({
  result,
  onContinue,
  onCancel,
  maxErrorsToShow = 20
}: ValidationPreviewProps) {
  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;

  const errorsByRow = result.errors.reduce((acc, error) => {
    if (!acc[error.row]) acc[error.row] = [];
    acc[error.row].push(error);
    return acc;
  }, {} as Record<number, ValidationError[]>);

  const warningsByRow = result.warnings.reduce((acc, warning) => {
    if (!acc[warning.row]) acc[warning.row] = [];
    acc[warning.row].push(warning);
    return acc;
  }, {} as Record<number, ValidationError[]>);

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border-2 p-6 ${
        hasErrors
          ? 'bg-red-50 border-red-200'
          : hasWarnings
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-start gap-4">
          {hasErrors ? (
            <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
          ) : hasWarnings ? (
            <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
          )}

          <div className="flex-1">
            <h3 className={`text-lg font-semibold mb-2 ${
              hasErrors ? 'text-red-900' : hasWarnings ? 'text-yellow-900' : 'text-green-900'
            }`}>
              {hasErrors
                ? 'Validation Errors Found'
                : hasWarnings
                ? 'Validation Warnings'
                : 'All Validations Passed'}
            </h3>

            <div className="space-y-2">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="font-medium">Total Rows:</span>{' '}
                  <span className="font-bold">{result.totalRowCount}</span>
                </div>
                <div>
                  <span className="font-medium">Valid:</span>{' '}
                  <span className="font-bold text-green-700">{result.validRowCount}</span>
                </div>
                {hasErrors && (
                  <div>
                    <span className="font-medium">Errors:</span>{' '}
                    <span className="font-bold text-red-700">{result.errors.length}</span>
                  </div>
                )}
                {hasWarnings && (
                  <div>
                    <span className="font-medium">Warnings:</span>{' '}
                    <span className="font-bold text-yellow-700">{result.warnings.length}</span>
                  </div>
                )}
              </div>

              {hasErrors && (
                <p className="text-sm text-red-700">
                  Please fix all errors before importing. Rows with errors will be skipped.
                </p>
              )}

              {!hasErrors && hasWarnings && (
                <p className="text-sm text-yellow-700">
                  You can continue with warnings, but you may want to review the flagged items.
                </p>
              )}

              {!hasErrors && !hasWarnings && (
                <p className="text-sm text-green-700">
                  All data has been validated successfully. Ready to import!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {hasErrors && (
        <div className="bg-white rounded-lg border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-red-900">
              Errors ({result.errors.length})
            </h4>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(errorsByRow).slice(0, maxErrorsToShow).map(([row, errors]) => (
              <div key={row} className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="font-medium text-sm text-red-900 mb-1">
                  Row {row}
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-700">
                      {error.field && <span className="font-medium">{error.field}:</span>} {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {Object.keys(errorsByRow).length > maxErrorsToShow && (
            <p className="text-sm text-red-600 mt-2">
              Showing {maxErrorsToShow} of {Object.keys(errorsByRow).length} rows with errors
            </p>
          )}
        </div>
      )}

      {hasWarnings && (
        <div className="bg-white rounded-lg border border-yellow-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <h4 className="font-semibold text-yellow-900">
              Warnings ({result.warnings.length})
            </h4>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(warningsByRow).slice(0, maxErrorsToShow).map(([row, warnings]) => (
              <div key={row} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="font-medium text-sm text-yellow-900 mb-1">
                  Row {row}
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm text-yellow-700">
                      {warning.field && <span className="font-medium">{warning.field}:</span>} {warning.message}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {Object.keys(warningsByRow).length > maxErrorsToShow && (
            <p className="text-sm text-yellow-600 mt-2">
              Showing {maxErrorsToShow} of {Object.keys(warningsByRow).length} rows with warnings
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
        {onContinue && (
          <button
            onClick={onContinue}
            disabled={hasErrors}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              hasErrors
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {hasErrors ? 'Fix Errors to Continue' : hasWarnings ? 'Continue with Warnings' : 'Continue'}
          </button>
        )}
      </div>
    </div>
  );
}
