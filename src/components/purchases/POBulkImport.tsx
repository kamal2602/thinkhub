import { useState } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface POBulkImportProps {
  onClose: () => void;
  onImport: (items: POLineItem[]) => void;
}

interface POLineItem {
  line_number: number;
  brand: string;
  model: string;
  description: string;
  quantity_ordered: number;
  unit_cost: number;
  expected_condition: string;
  supplier_sku: string;
  specifications: {
    cpu?: string;
    ram?: string;
    storage?: string;
    screen_size?: string;
    graphics?: string;
    os?: string;
  };
  notes: string;
}

export function POBulkImport({ onClose, onImport }: POBulkImportProps) {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<POLineItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(csv|xlsx|xls)$/i)) {
      showToast('Please upload a CSV or Excel file', 'error');
      return;
    }

    setFile(selectedFile);
    await parseFile(selectedFile);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseFile = async (file: File) => {
    setParsing(true);
    setErrors([]);
    const newErrors: string[] = [];
    const items: POLineItem[] = [];

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim());

      if (lines.length < 2) {
        showToast('File is empty or has no data rows', 'error');
        setParsing(false);
        return;
      }

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);

        if (values.length < 4) {
          newErrors.push(`Row ${i + 1}: Not enough columns (found ${values.length}, need at least 4)`);
          continue;
        }

        const brand = values[0]?.trim() || '';
        const model = values[1]?.trim() || '';
        const quantityStr = values[2]?.trim() || '';
        const unitCostStr = values[3]?.trim() || '';

        if (!brand || !model) {
          newErrors.push(`Row ${i + 1}: Brand and Model are required`);
          continue;
        }

        const quantity = parseInt(quantityStr);
        if (isNaN(quantity) || quantity <= 0) {
          newErrors.push(`Row ${i + 1}: Invalid quantity "${quantityStr}" - must be a positive number`);
          continue;
        }

        const unitCost = parseFloat(unitCostStr);
        if (isNaN(unitCost) || unitCost <= 0) {
          newErrors.push(`Row ${i + 1}: Invalid unit cost "${unitCostStr}" - must be a positive number`);
          continue;
        }

        items.push({
          line_number: i,
          brand,
          model,
          description: values[4]?.trim() || '',
          quantity_ordered: quantity,
          unit_cost: unitCost,
          expected_condition: values[5]?.trim() || 'B',
          supplier_sku: values[6]?.trim() || '',
          specifications: {
            cpu: values[7]?.trim() || '',
            ram: values[8]?.trim() || '',
            storage: values[9]?.trim() || '',
            screen_size: values[10]?.trim() || '',
            graphics: values[11]?.trim() || '',
            os: values[12]?.trim() || '',
          },
          notes: values[13]?.trim() || '',
        });
      }

      setParsedItems(items);
      setErrors(newErrors);

      if (items.length === 0) {
        showToast('No valid items found in file', 'error');
      } else {
        showToast(`Successfully parsed ${items.length} items`, 'success');
      }
    } catch (error: any) {
      showToast(`Error parsing file: ${error.message}`, 'error');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = () => {
    if (parsedItems.length === 0) {
      showToast('No items to import', 'error');
      return;
    }
    onImport(parsedItems);
    onClose();
  };

  const downloadTemplate = () => {
    const template = `Brand,Model,Quantity,Unit Cost,Description,Expected Condition,Supplier SKU,CPU,RAM,Storage,Screen Size,Graphics,OS,Notes
Dell,Latitude 5420,10,850,14 inch Business Laptop,A,DL5420-001,Intel i5-11th Gen,16GB DDR4,512GB NVMe SSD,14 inch FHD,Intel Iris Xe,Windows 11 Pro,Bulk order
HP,EliteBook 840 G8,5,1200,Premium laptop,B,HP840-G8,Intel i7-11th Gen,32GB DDR4,1TB NVMe SSD,14 inch FHD Touch,Intel Iris Xe,Windows 11 Pro,Executive grade
Lenovo,ThinkPad X1,15,950,Carbon Gen 9,A,LEN-X1-C9,Intel i7-11th Gen,16GB,512GB SSD,14 inch,Intel Iris Xe,Windows 11 Pro,New stock
Apple,MacBook Pro,3,1800,M1 Pro 16 inch,A,MBP-M1-16,Apple M1 Pro,16GB,512GB SSD,16 inch,M1 GPU,macOS,Premium line`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'po_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Import Purchase Order Lines</h2>
              <p className="text-sm text-gray-600">Upload CSV/Excel file with line items</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900 mb-2">CSV File Format Required</h3>
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Required columns (first 4):</strong> Brand, Model, Quantity, Unit Cost
                </p>
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Optional columns:</strong> Description, Expected Condition, Supplier SKU, CPU, RAM, Storage, Screen Size, Graphics, OS, Notes
                </p>
                <p className="text-sm text-blue-700 mb-3">
                  💡 Tip: Download the template below and replace the sample data with your items
                </p>
                <button
                  onClick={downloadTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Download Template CSV
                </button>
              </div>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <div className="text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-800 font-medium">
                  Choose file
                </span>
                <span className="text-gray-600"> or drag and drop</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">CSV or Excel files up to 10MB</p>
              {file && (
                <p className="text-sm text-gray-900 mt-3 font-medium">
                  Selected: {file.name}
                </p>
              )}
            </div>
          </div>

          {parsing && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Parsing file...</p>
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-900 mb-2">
                    Errors Found ({errors.length})
                  </h3>
                  <ul className="text-sm text-red-800 space-y-1 max-h-40 overflow-y-auto">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {parsedItems.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-green-900 mb-2">
                    Ready to Import
                  </h3>
                  <p className="text-sm text-green-800">
                    {parsedItems.length} line items parsed successfully
                  </p>
                  <div className="mt-3 max-h-60 overflow-y-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-green-100">
                        <tr>
                          <th className="px-3 py-2 text-left">Brand</th>
                          <th className="px-3 py-2 text-left">Model</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Unit Cost</th>
                          <th className="px-3 py-2 text-left">Condition</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {parsedItems.map((item, index) => (
                          <tr key={index} className="border-b border-green-100">
                            <td className="px-3 py-2">{item.brand}</td>
                            <td className="px-3 py-2">{item.model}</td>
                            <td className="px-3 py-2 text-right">{item.quantity_ordered}</td>
                            <td className="px-3 py-2 text-right">${item.unit_cost}</td>
                            <td className="px-3 py-2">{item.expected_condition}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={parsedItems.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import {parsedItems.length} Line Items
          </button>
        </div>
      </div>
    </div>
  );
}
