import { useState } from 'react';
import { Search, HardDrive, AlertTriangle, CheckCircle } from 'lucide-react';

export function Inspection() {
  const [hddDetected, setHddDetected] = useState(false);
  const [contaminationFound, setContaminationFound] = useState(false);

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Search className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Inspection Station</h2>
              <p className="text-sm text-gray-600">Check for HDDs, contamination, and quality</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">HDD Detection</span>
                </div>
                <button
                  onClick={() => setHddDetected(!hddDetected)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    hddDetected
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {hddDetected ? 'HDDs Detected' : 'No HDDs'}
                </button>
              </div>
              {hddDetected && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <strong>Data Wiping Required:</strong> HDDs detected. These items must be wiped
                    or physically destroyed before final disposal.
                  </div>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Contamination Check</span>
                </div>
                <button
                  onClick={() => setContaminationFound(!contaminationFound)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    contaminationFound
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {contaminationFound ? 'Contamination Found' : 'Clean'}
                </button>
              </div>
              {contaminationFound && (
                <div className="mt-3">
                  <textarea
                    placeholder="Describe contamination found..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block font-medium text-gray-900 mb-3">
                Inspection Notes
              </label>
              <textarea
                placeholder="Additional inspection notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
              />
            </div>

            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <CheckCircle className="w-4 h-4" />
              Complete Inspection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
