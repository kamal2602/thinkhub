import { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { esgService } from '../../services/esgService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BarChart3, Leaf, Recycle, TrendingDown, Download, Calendar } from 'lucide-react';
import type { ESGReport, GRIReport, WEEEReport } from '../../services/esgService';

export function ESGDashboard() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ESGReport | null>(null);
  const [griReport, setGRIReport] = useState<GRIReport | null>(null);
  const [weeeReport, setWEEEReport] = useState<WEEEReport | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [reportType, setReportType] = useState<'summary' | 'gri' | 'weee'>('summary');

  useEffect(() => {
    if (currentCompany?.id) {
      loadReports();
    }
  }, [currentCompany, dateRange]);

  const loadReports = async () => {
    if (!currentCompany?.id) return;

    try {
      setLoading(true);
      const [summaryData, griData, weeeData] = await Promise.all([
        esgService.generateESGReport(currentCompany.id, dateRange.from, dateRange.to),
        esgService.generateGRIReport(currentCompany.id, dateRange.from, dateRange.to),
        esgService.generateWEEEReport(currentCompany.id, dateRange.from, dateRange.to),
      ]);

      setReport(summaryData);
      setGRIReport(griData);
      setWEEEReport(weeeData);
    } catch (error) {
      console.error('Failed to load ESG reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format: 'csv' | 'pdf') => {
    console.log(`Exporting ${reportType} report as ${format}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading ESG data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ESG & Environmental Impact</h1>
          <p className="text-gray-600">Track your circular economy performance and compliance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportReport('csv')} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => exportReport('pdf')} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setReportType('summary')}
          className={`px-4 py-2 font-medium ${
            reportType === 'summary'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setReportType('gri')}
          className={`px-4 py-2 font-medium ${
            reportType === 'gri'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          GRI Report
        </button>
        <button
          onClick={() => setReportType('weee')}
          className={`px-4 py-2 font-medium ${
            reportType === 'weee'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          EU WEEE Report
        </button>
      </div>

      {reportType === 'summary' && report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Recycle className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Total Weight Processed</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {report.summary.total_weight_kg.toFixed(1)} kg
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Carbon Impact</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {report.summary.total_carbon_kg.toFixed(1)} kg CO₂e
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Leaf className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Circularity Score</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {report.summary.avg_circularity_score.toFixed(1)}%
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Total Events</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {report.summary.total_events}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Materials Processed</h3>
              <div className="space-y-3">
                {report.by_material.slice(0, 5).map((material) => (
                  <div key={material.material_category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{material.material_category}</span>
                      <span className="font-medium">{material.weight_kg.toFixed(1)} kg</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${(material.weight_kg / report.summary.total_weight_kg) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recovery Methods</h3>
              <div className="space-y-3">
                {report.by_recovery_method.slice(0, 5).map((method) => (
                  <div key={method.recovery_method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{method.recovery_method}</span>
                      <span className="font-medium">{method.event_count} events</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(method.event_count / report.summary.total_events) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {report.compliance_frameworks.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Compliance Frameworks</h3>
              <div className="flex flex-wrap gap-2">
                {report.compliance_frameworks.map((framework) => (
                  <span
                    key={framework}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                  >
                    {framework}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {reportType === 'gri' && griReport && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">GRI 306:2020 - Waste Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Waste Generated</div>
                <div className="text-2xl font-bold">{griReport.waste_generated.total_kg.toFixed(1)} kg</div>
                <div className="text-xs text-gray-500 mt-1">
                  Hazardous: {griReport.waste_generated.hazardous_kg.toFixed(1)} kg
                </div>
                <div className="text-xs text-gray-500">
                  Non-Hazardous: {griReport.waste_generated.non_hazardous_kg.toFixed(1)} kg
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">Waste Diverted from Disposal</div>
                <div className="text-2xl font-bold text-green-600">
                  {(griReport.waste_diverted.reuse_kg + griReport.waste_diverted.recycling_kg + griReport.waste_diverted.recovery_kg).toFixed(1)} kg
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Reuse: {griReport.waste_diverted.reuse_kg.toFixed(1)} kg
                </div>
                <div className="text-xs text-gray-500">
                  Recycling: {griReport.waste_diverted.recycling_kg.toFixed(1)} kg
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">Waste Disposed</div>
                <div className="text-2xl font-bold text-red-600">
                  {(griReport.waste_disposed.landfill_kg + griReport.waste_disposed.incineration_kg).toFixed(1)} kg
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Landfill: {griReport.waste_disposed.landfill_kg.toFixed(1)} kg
                </div>
                <div className="text-xs text-gray-500">
                  Incineration: {griReport.waste_disposed.incineration_kg.toFixed(1)} kg
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Carbon Footprint (Scope 3)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Emissions</div>
                <div className="text-2xl font-bold">{griReport.carbon_footprint.total_kg_co2e.toFixed(1)} kg CO₂e</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Upstream (30%)</div>
                <div className="text-xl font-medium">{griReport.carbon_footprint.scope_3_upstream.toFixed(1)} kg CO₂e</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Downstream (70%)</div>
                <div className="text-xl font-medium">{griReport.carbon_footprint.scope_3_downstream.toFixed(1)} kg CO₂e</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {reportType === 'weee' && weeeReport && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">EU WEEE Directive Compliance</h3>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Overall Recovery Rate</span>
                <span className="text-2xl font-bold">
                  {weeeReport.total_recovery_rate_pct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full ${
                    weeeReport.compliant ? 'bg-green-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${Math.min(100, weeeReport.total_recovery_rate_pct)}%` }}
                />
              </div>
              <div className="mt-2 text-sm">
                {weeeReport.compliant ? (
                  <span className="text-green-600 font-medium">✓ Compliant (≥65% required)</span>
                ) : (
                  <span className="text-red-600 font-medium">✗ Non-compliant (≥65% required)</span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">By WEEE Category</h4>
              {weeeReport.categories.map((category) => (
                <div key={category.category_code} className="border-l-4 border-blue-600 pl-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">Category {category.category_code}</div>
                      <div className="text-sm text-gray-600">
                        Collected: {category.weight_collected_kg.toFixed(1)} kg
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{category.recovery_rate_pct.toFixed(1)}%</div>
                      <div className="text-xs text-gray-500">recovery rate</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    Reused: {category.weight_reused_kg.toFixed(1)} kg |
                    Recycled: {category.weight_recycled_kg.toFixed(1)} kg
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
