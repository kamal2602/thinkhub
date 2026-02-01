import { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { auditExportService } from '../../services/auditExportService';
import type { ExportRequest } from '../../services/auditExportService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FileText, Download, Shield, CheckCircle, Clock } from 'lucide-react';

export function AuditExports() {
  const { currentCompany } = useCompany();
  const [exports, setExports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState<Partial<ExportRequest>>({
    export_type: 'regulator',
    export_format: 'csv',
    from_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    purpose: '',
    tables_to_include: [],
  });

  const availableTables = [
    { value: 'esg_events', label: 'ESG Events' },
    { value: 'assets', label: 'Assets' },
    { value: 'sales_invoices', label: 'Sales Invoices' },
    { value: 'purchase_orders', label: 'Purchase Orders' },
    { value: 'itad_projects', label: 'ITAD Projects' },
    { value: 'recycling_certificates', label: 'Recycling Certificates' },
    { value: 'data_destruction_certificates', label: 'Data Destruction Certificates' },
  ];

  const complianceFrameworks = [
    'GRI',
    'EU WEEE',
    'EPR',
    'ISO 14001',
    'SOC 2',
    'GDPR',
  ];

  useEffect(() => {
    if (currentCompany?.id) {
      loadExports();
    }
  }, [currentCompany]);

  const loadExports = async () => {
    if (!currentCompany?.id) return;

    try {
      setLoading(true);
      const data = await auditExportService.getExports(currentCompany.id);
      setExports(data);
    } catch (error) {
      console.error('Failed to load exports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!currentCompany?.id || !formData.purpose || !formData.tables_to_include?.length) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      await auditExportService.createExport(currentCompany.id, formData as ExportRequest);
      setShowCreateForm(false);
      loadExports();
    } catch (error) {
      console.error('Failed to create export:', error);
      alert('Failed to create export. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (exportId: string) => {
    try {
      const { url } = await auditExportService.downloadExport(exportId);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to download export:', error);
      alert('Failed to download export.');
    }
  };

  const toggleTable = (table: string) => {
    const current = formData.tables_to_include || [];
    const updated = current.includes(table)
      ? current.filter(t => t !== table)
      : [...current, table];
    setFormData({ ...formData, tables_to_include: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Exports</h1>
          <p className="text-gray-600">Generate immutable, cryptographically signed audit exports</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <FileText className="w-4 h-4 mr-2" />
          Create Export
        </Button>
      </div>

      {showCreateForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Audit Export</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Export Type*
                </label>
                <select
                  value={formData.export_type}
                  onChange={(e) => setFormData({ ...formData, export_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="regulator">Regulator</option>
                  <option value="client">Client</option>
                  <option value="certifier">Certifier</option>
                  <option value="internal">Internal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Export Format*
                </label>
                <select
                  value={formData.export_format}
                  onChange={(e) => setFormData({ ...formData, export_format: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="csv">CSV</option>
                  <option value="xml">XML</option>
                  <option value="xbrl">XBRL</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date*</label>
                <input
                  type="date"
                  value={formData.from_date}
                  onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date*</label>
                <input
                  type="date"
                  value={formData.to_date}
                  onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose*</label>
              <textarea
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={2}
                placeholder="e.g., Annual regulatory submission to EPA"
              />
            </div>

            {formData.export_type === 'regulator' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Regulator Name
                </label>
                <input
                  type="text"
                  value={formData.regulator_name || ''}
                  onChange={(e) => setFormData({ ...formData, regulator_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., EPA, EU Commission"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tables to Include*
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableTables.map(table => (
                  <label key={table.value} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.tables_to_include?.includes(table.value)}
                      onChange={() => toggleTable(table.value)}
                      className="rounded"
                    />
                    <span className="text-sm">{table.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Export'}
              </Button>
              <Button onClick={() => setShowCreateForm(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading exports...</div>
        ) : exports.length === 0 ? (
          <Card className="p-12 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audit exports yet</h3>
            <p className="text-gray-600 mb-4">Create your first export to get started</p>
          </Card>
        ) : (
          exports.map((exp) => (
            <Card key={exp.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-semibold text-gray-900">
                        {exp.export_type.charAt(0).toUpperCase() + exp.export_type.slice(1)} Export
                      </div>
                      <div className="text-sm text-gray-600">{exp.purpose}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <div className="text-gray-600">Format</div>
                      <div className="font-medium uppercase">{exp.export_format}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Period</div>
                      <div className="font-medium">
                        {new Date(exp.from_date).toLocaleDateString()} - {new Date(exp.to_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Sequence</div>
                      <div className="font-medium">#{exp.export_sequence_number}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Created</div>
                      <div className="font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(exp.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {exp.compliance_frameworks && exp.compliance_frameworks.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {exp.compliance_frameworks.map((fw: string) => (
                        <span
                          key={fw}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                        >
                          {fw}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Hash: {exp.file_hash.substring(0, 16)}...</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleDownload(exp.id)}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
