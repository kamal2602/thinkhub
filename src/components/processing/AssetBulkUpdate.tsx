import { useState, useEffect } from 'react';
import { Upload, X, FileSpreadsheet, Download, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { parseExcelFile, SheetInfo } from '../../lib/excelParser';
import { ExcelSheetSelector } from '../common/ExcelSheetSelector';

interface AssetBulkUpdateProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  rowNumber: number;
  serialNumber: string;
  productType?: string;
  brand?: string;
  model?: string;
  errors: string[];
}

export function AssetBulkUpdate({ onClose, onSuccess }: AssetBulkUpdateProps) {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<SheetInfo[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  useEffect(() => {
    fetchProductTypes();
  }, [selectedCompany]);

  const fetchProductTypes = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase
      .from('product_types')
      .select('id, name')
      .eq('company_id', selectedCompany.id)
      .order('name');
    setProductTypes(data || []);
  };

  const downloadTemplate = () => {
    const template = `Serial Number,Product Type,Brand,Model
5CG2343P5G,Laptop,HP,EliteBook 840 G8
5CG2161TKJ,Laptop,HP,EliteBook 840 G8`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_update_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = async (file: File, sheetName?: string) => {
    if (!selectedCompany) return;

    setParsing(true);
    try {
      const result = await parseExcelFile(file, sheetName);

      if (result.hasMultipleSheets && result.sheets) {
        setAvailableSheets(result.sheets);
        setCurrentFile(file);
        setShowSheetSelector(true);
        setParsing(false);
        return;
      }

      const jsonData: any[][] = [result.headers, ...result.rows];

      if (jsonData.length < 2) {
        showToast('File is empty or has no data rows', 'error');
        return;
      }

      const headers = jsonData[0].map((h: any) => String(h || '').trim().toLowerCase());
      const serialIndex = headers.findIndex(h =>
        h.includes('serial') || h === 'serial number' || h === 's/n'
      );
      const productTypeIndex = headers.findIndex(h =>
        h.includes('product type') || h === 'type' || h === 'product_type'
      );
      const brandIndex = headers.findIndex(h => h === 'brand' || h === 'manufacturer');
      const modelIndex = headers.findIndex(h => h === 'model');

      if (serialIndex === -1) {
        showToast('Could not find Serial Number column', 'error');
        return;
      }

      const rows: ParsedRow[] = [];

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const errors: string[] = [];

        const serialNumber = String(row[serialIndex] || '').trim();
        if (!serialNumber) {
          continue;
        }

        const productType = productTypeIndex >= 0 ? String(row[productTypeIndex] || '').trim() : '';
        const brand = brandIndex >= 0 ? String(row[brandIndex] || '').trim() : '';
        const model = modelIndex >= 0 ? String(row[modelIndex] || '').trim() : '';

        if (!productType && !brand && !model) {
          errors.push('No fields to update');
        }

        rows.push({
          rowNumber: i + 1,
          serialNumber,
          productType: productType || undefined,
          brand: brand || undefined,
          model: model || undefined,
          errors,
        });
      }

      setParsedData(rows);
      showToast(`Parsed ${rows.length} rows`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to parse file', 'error');
    } finally {
      setParsing(false);
    }
  };

  const handleSheetSelection = async (sheetName: string) => {
    if (!currentFile) return;

    setShowSheetSelector(false);
    setFile(currentFile);
    await parseFile(currentFile, sheetName);
  };

  const handleCancelSheetSelection = () => {
    setShowSheetSelector(false);
    setAvailableSheets([]);
    setCurrentFile(null);
  };

  const handleUpdate = async () => {
    if (!selectedCompany || parsedData.length === 0) return;

    setUpdating(true);

    try {
      let updatedCount = 0;
      let notFoundCount = 0;
      const errors: string[] = [];
      const warnings: string[] = [];

      // BATCH PROCESSING: Fetch all assets by serial numbers first
      const serialNumbers = parsedData
        .filter(row => row.errors.length === 0)
        .map(row => row.serialNumber);

      const { data: existingAssets } = await supabase
        .from('assets')
        .select('id, serial_number')
        .eq('company_id', selectedCompany.id)
        .in('serial_number', serialNumbers);

      const assetMap = new Map(existingAssets?.map(a => [a.serial_number, a]) || []);

      // Prepare batch updates
      const updateBatches: Array<{id: string, updates: any, rowNumber: number}> = [];

      for (const row of parsedData) {
        if (row.errors.length > 0) {
          warnings.push(`Row ${row.rowNumber}: ${row.errors.join(', ')}`);
          continue;
        }

        const existingAsset = assetMap.get(row.serialNumber);

        if (!existingAsset) {
          notFoundCount++;
          warnings.push(`Row ${row.rowNumber}: Serial ${row.serialNumber} not found`);
          continue;
        }

        const updates: any = {};

        if (row.productType) {
          const productType = productTypes.find(
            pt => pt.name.toLowerCase() === row.productType?.toLowerCase()
          );
          if (productType) {
            updates.product_type_id = productType.id;
          } else {
            warnings.push(`Row ${row.rowNumber}: Product type "${row.productType}" not found`);
          }
        }

        if (row.brand) {
          updates.brand = row.brand;
        }

        if (row.model) {
          updates.model = row.model;
        }

        if (Object.keys(updates).length === 0) {
          continue;
        }

        updateBatches.push({
          id: existingAsset.id,
          updates,
          rowNumber: row.rowNumber
        });
      }

      // BATCH PROCESSING: Process updates in batches
      const BATCH_SIZE = 50;
      for (let i = 0; i < updateBatches.length; i += BATCH_SIZE) {
        const batch = updateBatches.slice(i, i + BATCH_SIZE);

        // Process batch in parallel
        const results = await Promise.allSettled(
          batch.map(item =>
            supabase
              .from('assets')
              .update(item.updates)
              .eq('id', item.id)
          )
        );

        results.forEach((result, idx) => {
          if (result.status === 'fulfilled' && !result.value.error) {
            updatedCount++;
          } else {
            const rowNum = batch[idx].rowNumber;
            const error = result.status === 'fulfilled' ? result.value.error?.message : (result as PromiseRejectedResult).reason;
            errors.push(`Row ${rowNum}: ${error}`);
          }
        });
      }

      const summary = `Successfully updated ${updatedCount} of ${parsedData.length} items. Errors: ${errors.length}. Warnings: ${warnings.length}. Check console for details`;

      if (errors.length > 0) {
        console.error('Update errors:', errors);
      }
      if (warnings.length > 0) {
        console.warn('Update warnings:', warnings);
      }

      showToast(summary, updatedCount > 0 ? 'success' : 'warning');

      if (updatedCount > 0) {
        onSuccess();
      }
    } catch (error: any) {
      showToast(error.message || 'Update failed', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const validRows = parsedData.filter(r => r.errors.length === 0);
  const invalidRows = parsedData.filter(r => r.errors.length > 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Bulk Update Assets</h2>
              <p className="text-sm text-gray-600">Update product types and other fields for existing assets</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Instructions</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Download the template or prepare your own Excel/CSV file</li>
                <li>Include a "Serial Number" column (required to match assets)</li>
                <li>Add columns for fields to update: Product Type, Brand, Model</li>
                <li>Upload the file and review the preview</li>
                <li>Click "Update Assets" to apply changes</li>
              </ol>
            </div>

            <div>
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload File (Excel or CSV)
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer transition">
                  <FileSpreadsheet className="w-6 h-6 text-gray-400" />
                  <span className="text-gray-600">
                    {file ? file.name : 'Click to select file or drag and drop'}
                  </span>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {parsing && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {parsedData.length > 0 && !parsing && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Preview</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>{validRows.length} valid</span>
                    </div>
                    {invalidRows.length > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span>{invalidRows.length} with errors</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial Number</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {parsedData.map((row) => (
                          <tr key={row.rowNumber} className={row.errors.length > 0 ? 'bg-red-50' : ''}>
                            <td className="px-4 py-3 text-sm text-gray-900">{row.rowNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{row.serialNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{row.productType || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{row.brand || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{row.model || '-'}</td>
                            <td className="px-4 py-3 text-sm">
                              {row.errors.length > 0 ? (
                                <span className="text-red-600 text-xs">{row.errors.join(', ')}</span>
                              ) : (
                                <span className="text-green-600 text-xs">Ready</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {parsedData.length > 0 && (
          <div className="p-6 border-t border-gray-200 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={updating || validRows.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Updating...' : `Update ${validRows.length} Assets`}
            </button>
          </div>
        )}

        {showSheetSelector && (
          <ExcelSheetSelector
            sheets={availableSheets}
            onSelectSheet={handleSheetSelection}
            onCancel={handleCancelSheetSelection}
          />
        )}
      </div>
    </div>
  );
}
