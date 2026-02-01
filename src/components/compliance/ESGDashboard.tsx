import React, { useEffect, useState } from 'react';
import { Leaf, Download, TrendingUp, Package, Calendar } from 'lucide-react';
import { esgReportingService, ESGMetrics } from '../../services/esgReportingService';
import { useCompany } from '../../contexts/CompanyContext';

export function ESGDashboard() {
  const { company } = useCompany();
  const [metrics, setMetrics] = useState<ESGMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [exportType, setExportType] = useState<'GRI' | 'WEEE' | 'Circularity'>('GRI');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (company) {
      loadMetrics();
    }
  }, [company, dateRange]);

  const loadMetrics = async () => {
    if (!company) return;

    setLoading(true);
    try {
      const data = await esgReportingService.getESGMetrics(
        company.id,
        dateRange.start,
        dateRange.end
      );
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load ESG metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!company) return;

    setExporting(true);
    try {
      const exportData = await esgReportingService.generateComplianceExport(
        company.id,
        exportType,
        dateRange.start,
        dateRange.end,
        `${exportType} Export`
      );

      const blob = new Blob([JSON.stringify(exportData.file_data, null, 2)], {
        type: 'application/json'
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportType}_Export_${dateRange.start}_${dateRange.end}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert(`${exportType} export generated successfully!`);
    } catch (error) {
      console.error('Failed to generate export:', error);
      alert('Failed to generate export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading ESG data...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-8 text-center">
        <Leaf className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No ESG data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">ESG Reporting</h1>
            <p className="text-green-100">Environmental, Social & Governance Impact Tracking</p>
          </div>
          <Leaf className="w-16 h-16 opacity-50" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Date Range</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">From:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">To:</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <Package className="w-8 h-8 text-green-600" />
            <span className="text-sm text-gray-500">Total Weight</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {metrics.total_weight_kg.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 mt-1">kilograms processed</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <Leaf className="w-8 h-8 text-emerald-600" />
            <span className="text-sm text-gray-500">CO2 Saved</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {metrics.total_co2_saved_kg.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 mt-1">kg CO2e equivalent</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <span className="text-sm text-gray-500">Units Processed</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {metrics.total_units_processed.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 mt-1">individual items</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Event Type</h3>
          <div className="space-y-3">
            {Object.entries(metrics.by_event_type).map(([type, weight]) => {
              const percentage = metrics.total_weight_kg > 0
                ? (weight / metrics.total_weight_kg) * 100
                : 0;

              return (
                <div key={type}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 capitalize">{type.replace('_', ' ')}</span>
                    <span className="text-gray-900 font-medium">{weight.toFixed(1)} kg</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Exports</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Standard
              </label>
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="GRI">GRI Standards 2021</option>
                <option value="WEEE">WEEE Directive 2012/19/EU</option>
                <option value="Circularity">Circularity Index</option>
              </select>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Generate {exportType} Export</span>
                </>
              )}
            </button>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">What's included?</h4>
              <ul className="text-sm text-green-800 space-y-1">
                {exportType === 'GRI' && (
                  <>
                    <li>• GRI 306: Waste management</li>
                    <li>• GRI 305: GHG emissions reduction</li>
                    <li>• Full event breakdown</li>
                  </>
                )}
                {exportType === 'WEEE' && (
                  <>
                    <li>• WEEE categories breakdown</li>
                    <li>• Treatment methods</li>
                    <li>• Certification numbers</li>
                  </>
                )}
                {exportType === 'Circularity' && (
                  <>
                    <li>• Circularity index calculation</li>
                    <li>• Reuse and recycling rates</li>
                    <li>• Material flow analysis</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {metrics.trend_data.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend Analysis</h3>
          <div className="space-y-2">
            {metrics.trend_data.slice(-30).map((point) => (
              <div key={point.date} className="flex items-center space-x-4 text-sm">
                <span className="text-gray-600 w-24">{new Date(point.date).toLocaleDateString()}</span>
                <div className="flex-1 flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min((point.weight_kg / Math.max(...metrics.trend_data.map(p => p.weight_kg))) * 100, 100)}%`
                      }}
                    />
                  </div>
                  <span className="text-gray-700 w-20 text-right">{point.weight_kg.toFixed(1)} kg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
