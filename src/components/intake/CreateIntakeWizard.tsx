import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Upload, FileSpreadsheet } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

interface WizardProps {
  onClose: () => void;
  onComplete?: () => void;
}

type IntakeType = 'purchase' | 'itad' | 'recycling';
type CommercialModel = 'we_buy' | 'client_pays' | 'hybrid';
type ProcessingIntent = 'resale' | 'recycle_only';
type LineType = 'serial' | 'category_weight';

interface ManifestLine {
  lineType: LineType;
  serialNumber?: string;
  brand?: string;
  model?: string;
  category?: string;
  materialCategory?: string;
  expectedWeight?: number;
  expectedQty?: number;
}

export function CreateIntakeWizard({ onClose, onComplete }: WizardProps) {
  const { selectedCompany } = useCompany();
  const { addToast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [intakeType, setIntakeType] = useState<IntakeType>('purchase');
  const [commercialModel, setCommercialModel] = useState<CommercialModel>('we_buy');
  const [processingIntent, setProcessingIntent] = useState<ProcessingIntent>('resale');
  const [contactId, setContactId] = useState('');
  const [manifestLines, setManifestLines] = useState<ManifestLine[]>([]);
  const [fileUploaded, setFileUploaded] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const lines: ManifestLine[] = jsonData.map((row: any) => {
        if (row['Serial Number'] || row['serial_number'] || row['Serial']) {
          return {
            lineType: 'serial',
            serialNumber: row['Serial Number'] || row['serial_number'] || row['Serial'] || '',
            brand: row['Brand'] || row['brand'] || '',
            model: row['Model'] || row['model'] || '',
          };
        } else {
          return {
            lineType: 'category_weight',
            category: row['Category'] || row['category'] || '',
            materialCategory: row['Material'] || row['material_category'] || '',
            expectedWeight: parseFloat(row['Weight'] || row['weight'] || '0'),
            expectedQty: parseInt(row['Quantity'] || row['qty'] || '1'),
          };
        }
      });

      setManifestLines(lines);
      setFileUploaded(true);
      addToast(`Loaded ${lines.length} items from manifest`, 'success');
    } catch (error) {
      console.error('Failed to parse file:', error);
      addToast('Failed to parse manifest file', 'error');
    }
  };

  const handleCreate = async () => {
    if (!selectedCompany) return;

    setLoading(true);
    try {
      let sourceId: string;
      let sourceType: string;

      if (intakeType === 'purchase') {
        const poNumber = `PO-${Date.now()}`;
        const { data: po, error: poError } = await supabase
          .from('purchase_orders')
          .insert({
            company_id: selectedCompany.id,
            po_number: poNumber,
            supplier_id: contactId || null,
            order_date: new Date().toISOString().split('T')[0],
            status: 'draft',
          })
          .select()
          .single();

        if (poError) throw poError;
        sourceId = po.id;
        sourceType = 'purchase_order';
      } else if (intakeType === 'itad') {
        const projectNumber = `ITAD-${Date.now()}`;
        const { data: project, error: projectError } = await supabase
          .from('itad_projects')
          .insert({
            company_id: selectedCompany.id,
            project_number: projectNumber,
            contact_id: contactId || null,
            project_date: new Date().toISOString().split('T')[0],
            status: 'pending',
          })
          .select()
          .single();

        if (projectError) throw projectError;
        sourceId = project.id;
        sourceType = 'itad_project';
      } else {
        const orderNumber = `RCY-${Date.now()}`;
        const { data: order, error: orderError } = await supabase
          .from('recycling_orders')
          .insert({
            company_id: selectedCompany.id,
            order_number: orderNumber,
            contact_id: contactId || null,
            order_date: new Date().toISOString().split('T')[0],
            processing_intent: processingIntent === 'resale' ? 'hybrid_resale' : 'recycle_only',
            status: 'pending',
          })
          .select()
          .single();

        if (orderError) throw orderError;
        sourceId = order.id;
        sourceType = 'recycling_order';
      }

      const batchId = crypto.randomUUID();

      const expectedItems = manifestLines.map(line => {
        const base = {
          company_id: selectedCompany.id,
          receiving_batch_id: batchId,
          line_type: line.lineType,
        };

        if (line.lineType === 'serial') {
          return {
            ...base,
            serial_number: line.serialNumber,
            brand: line.brand,
            model: line.model,
          };
        } else {
          return {
            ...base,
            material_category: line.materialCategory,
            expected_weight: line.expectedWeight,
            expected_qty: line.expectedQty,
          };
        }
      });

      if (expectedItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('expected_receiving_items')
          .insert(expectedItems);

        if (itemsError) throw itemsError;
      }

      addToast(`${intakeType.toUpperCase()} created successfully with ${manifestLines.length} expected items`, 'success');
      onComplete?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to create intake:', error);
      addToast(error.message || 'Failed to create intake', 'error');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return intakeType !== null;
    if (step === 2) return commercialModel !== null;
    if (step === 3) return processingIntent !== null;
    if (step === 4) return manifestLines.length > 0;
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Create Intake</h2>
            <p className="text-blue-100 text-sm">Step {step} of 4</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-100">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Intake Type</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'purchase', label: 'Purchase Order', desc: 'We buy inventory' },
                  { value: 'itad', label: 'ITAD Project', desc: 'Client-owned assets' },
                  { value: 'recycling', label: 'Recycling Order', desc: 'Material handling' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setIntakeType(option.value as IntakeType)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      intakeType === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Commercial Model</h3>
              <div className="space-y-3">
                {[
                  { value: 'we_buy', label: 'We Buy Material', desc: 'Accounts Payable - we pay supplier' },
                  { value: 'client_pays', label: 'Client Pays Us', desc: 'Accounts Receivable - client pays for service' },
                  { value: 'hybrid', label: 'Hybrid / Certificate Only', desc: 'No invoice, certificate-based' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setCommercialModel(option.value as CommercialModel)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      commercialModel === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Intent</h3>
              <div className="space-y-3">
                {[
                  { value: 'resale', label: 'Resale if Possible', desc: 'Test and grade, sell what works, recycle rest' },
                  { value: 'recycle_only', label: 'Recycle Only', desc: 'Direct to recycling, no resale attempt' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setProcessingIntent(option.value as ProcessingIntent)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      processingIntent === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Manifest</h3>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <label className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    Click to upload Excel file
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  Supports: Serial-based or Category/Weight-based manifests
                </p>
              </div>

              {fileUploaded && manifestLines.length > 0 && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800 font-medium">
                    <Check className="w-5 h-5" />
                    Loaded {manifestLines.length} items
                  </div>
                  <div className="text-sm text-green-700 mt-1">
                    {manifestLines.filter(l => l.lineType === 'serial').length} serial items, {' '}
                    {manifestLines.filter(l => l.lineType === 'category_weight').length} category items
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex gap-2">
            {step < 4 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={!canProceed() || loading}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create Intake
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
