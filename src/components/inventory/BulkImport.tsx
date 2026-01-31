import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface BulkImportProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  rowNumber: number;
  serialNumber: string;
  brand: string;
  model: string;
  processor: string;
  ram: string;
  storage: string;
  screen?: string;
  graphics?: string;
  os?: string;
  cosmeticGrade: string;
  functionalStatus: string;
  purchasePrice: number;
  sellingPrice: number;
  location?: string;
  status: string;
  notes?: string;
  errors: string[];
}

export function BulkImport({ onClose, onSuccess }: BulkImportProps) {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const downloadTemplate = () => {
    const template = `Serial Number,Brand,Model,Processor,RAM,Storage,Screen,Graphics,OS,Cosmetic Grade,Functional Status,Purchase Price,Selling Price,Location,Status,Notes
ABC12345,Dell,Latitude 5420,Intel i5-11th Gen,16GB DDR4,512GB NVMe SSD,14" FHD,Intel Iris Xe,Windows 11 Pro,A,Fully Working,850,1200,Warehouse A,In Stock,
ABC12346,HP,EliteBook 840 G8,Intel i7-11th Gen,32GB DDR4,1TB NVMe SSD,14" FHD,Intel Iris Xe,Windows 11 Pro,B,Fully Working,1200,1800,Warehouse B,In Stock,Minor scratch`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        showToast('Please upload a CSV file', 'error');
        return;
      }
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = async (file: File) => {
    setParsing(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        showToast('File is empty or has no data rows', 'error');
        return;
      }

      // const headers = lines[0].split(',').map(h => h.trim());
      const rows: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const errors: string[] = [];

        const serialNumber = values[0] || '';
        const brand = values[1] || '';
        const model = values[2] || '';
        const processor = values[3] || '';
        const ram = values[4] || '';
        const storage = values[5] || '';
        const screen = values[6] || '';
        const graphics = values[7] || '';
        const os = values[8] || '';
        const cosmeticGrade = values[9] || 'B';
        const functionalStatus = values[10] || 'Fully Working';
        const purchasePrice = parseFloat(values[11]) || 0;
        const sellingPrice = parseFloat(values[12]) || 0;
        const location = values[13] || '';
        const status = values[14] || 'In Stock';
        const notes = values[15] || '';

        if (!serialNumber) errors.push('Serial number required');
        if (!brand) errors.push('Brand required');
        if (!model) errors.push('Model required');
        if (!processor) errors.push('Processor required');
        if (!ram) errors.push('RAM required');
        if (!storage) errors.push('Storage required');
        if (purchasePrice <= 0) errors.push('Valid purchase price required');
        if (sellingPrice <= 0) errors.push('Valid selling price required');

        rows.push({
          rowNumber: i + 1,
          serialNumber,
          brand,
          model,
          processor,
          ram,
          storage,
          screen,
          graphics,
          os,
          cosmeticGrade,
          functionalStatus,
          purchasePrice,
          sellingPrice,
          location,
          status,
          notes,
          errors,
        });
      }

      setParsedData(rows);
      showToast(`Parsed ${rows.length} rows`, 'success');
    } catch (error: any) {
      showToast('Error parsing file: ' + error.message, 'error');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedCompany || parsedData.length === 0) return;

    const validRows = parsedData.filter(row => row.errors.length === 0);
    if (validRows.length === 0) {
      showToast('No valid rows to import', 'error');
      return;
    }

    setImporting(true);
    setProgress({ current: 0, total: validRows.length });

    try {
      const { data: productType } = await supabase
        .from('product_types')
        .select('id')
        .eq('company_id', selectedCompany.id)
        .ilike('name', '%laptop%')
        .maybeSingle();

      const productTypeId = productType?.id;

      const groupedBySpecs = new Map<string, ParsedRow[]>();

      for (const row of validRows) {
        const specKey = `${row.brand}-${row.model}-${row.processor}-${row.ram}-${row.storage}`;
        if (!groupedBySpecs.has(specKey)) {
          groupedBySpecs.set(specKey, []);
        }
        groupedBySpecs.get(specKey)!.push(row);
      }

      let processedCount = 0;

      for (const [, rows] of groupedBySpecs) {
        const firstRow = rows[0];

        const avgPurchasePrice = rows.reduce((sum, r) => sum + r.purchasePrice, 0) / rows.length;
        const avgSellingPrice = rows.reduce((sum, r) => sum + r.sellingPrice, 0) / rows.length;

        const sku = `${firstRow.brand.toUpperCase()}-${firstRow.model.replace(/\s+/g, '')}-${Date.now()}`.substring(0, 50);

        const { data: inventoryItem, error: invError } = await supabase
          .from('inventory_items')
          .insert({
            company_id: selectedCompany.id,
            sku,
            name: `${firstRow.brand} ${firstRow.model}`,
            description: `${firstRow.processor}, ${firstRow.ram}, ${firstRow.storage}`,
            product_type_id: productTypeId,
            brand: firstRow.brand,
            model: firstRow.model,
            cost_price: avgPurchasePrice,
            selling_price: avgSellingPrice,
            specifications: {
              cpu: firstRow.processor,
              ram: firstRow.ram,
              storage: firstRow.storage,
              screen: firstRow.screen,
              graphics: firstRow.graphics,
              os: firstRow.os,
            },
          })
          .select()
          .single();

        if (invError) {
          console.error('Error creating inventory item:', invError);
          continue;
        }

        const locationPromises = rows.map(row =>
          supabase
            .from('locations')
            .select('id')
            .eq('company_id', selectedCompany.id)
            .ilike('name', row.location || '')
            .maybeSingle()
        );

        const locationResults = await Promise.all(locationPromises);

        const assetInserts = rows.map((row, idx) => ({
          company_id: selectedCompany.id,
          inventory_item_id: inventoryItem.id,
          product_type_id: productTypeId,
          serial_number: row.serialNumber,
          brand: row.brand,
          model: row.model,
          cpu: row.processor,
          ram: row.ram,
          storage: row.storage,
          screen_size: row.screen,
          cosmetic_grade: row.cosmeticGrade,
          functional_status: row.functionalStatus,
          purchase_price: row.purchasePrice,
          selling_price: row.sellingPrice,
          status: row.status,
          location_id: locationResults[idx].data?.id,
          notes: row.notes,
          other_specs: {
            graphics: row.graphics,
            os: row.os,
          },
        }));

        const BATCH_SIZE = 50;
        for (let i = 0; i < assetInserts.length; i += BATCH_SIZE) {
          const batch = assetInserts.slice(i, i + BATCH_SIZE);
          await supabase.from('assets').insert(batch);
          processedCount += batch.length;
          setProgress({ current: processedCount, total: validRows.length });
        }
      }

      showToast(`Successfully imported ${processedCount} assets`, 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast('Import error: ' + error.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const validRows = parsedData.filter(row => row.errors.length === 0);
  const invalidRows = parsedData.filter(row => row.errors.length > 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Bulk Import Assets</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Instructions</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Download the CSV template and fill in your laptop details</li>
              <li>Each row represents one physical laptop with a unique serial number</li>
              <li>System will auto-group similar specs into inventory items</li>
              <li>Upload the completed CSV file below</li>
            </ol>
            <button
              onClick={downloadTemplate}
              className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={parsing || importing}
              />
              <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block">
                {file ? 'Change File' : 'Select CSV File'}
              </span>
            </label>
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: <span className="font-medium">{file.name}</span>
              </p>
            )}
          </div>

          {parsing && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Parsing file...</p>
            </div>
          )}

          {parsedData.length > 0 && !parsing && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 mb-1">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Valid Rows</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{validRows.length}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-700 mb-1">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Invalid Rows</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">{invalidRows.length}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-700 mb-1">
                    <FileSpreadsheet className="w-5 h-5" />
                    <span className="font-medium">Total Rows</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{parsedData.length}</p>
                </div>
              </div>

              {invalidRows.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-900 mb-2">Errors Found</h3>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {invalidRows.map((row, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium text-red-700">Row {row.rowNumber}:</span>
                        <span className="text-red-600 ml-2">{row.errors.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-900">Importing...</span>
                    <span className="text-blue-700">{progress.current} / {progress.total}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={validRows.length === 0 || importing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : `Import ${validRows.length} Assets`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
