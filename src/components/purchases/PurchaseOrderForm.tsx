import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { SmartPOImport } from './SmartPOImport';
import { createImportIntelligenceService } from '../../lib/importIntelligence';
import { QuickAddModal } from '../common/QuickAddModal';

interface PurchaseOrderFormProps {
  po?: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface POLine {
  id?: string;
  line_number: number;
  product_type_id?: string;
  brand: string;
  model: string;
  description: string;
  specifications: any;
  quantity_ordered: number;
  unit_cost: number;
  expected_condition: string;
  supplier_sku: string;
  notes: string;
}

export function PurchaseOrderForm({ po, onClose, onSuccess }: PurchaseOrderFormProps) {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();

  const isEditable = !po || po.status === 'draft' || po.status === 'submitted';
  const isViewOnly = !isEditable;

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [intelligenceService, setIntelligenceService] = useState<any>(null);
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  const [formData, setFormData] = useState({
    supplier_id: po?.supplier_id || '',
    order_date: po?.order_date || new Date().toISOString().split('T')[0],
    expected_delivery_date: po?.expected_delivery_date || '',
    status: po?.status || 'draft',
    payment_terms: po?.payment_terms || '',
    shipping_address: po?.shipping_address || '',
    notes: po?.notes || '',
    tax_amount: po?.tax_amount || 0,
    shipping_cost: po?.shipping_cost || 0,
    source_currency: po?.source_currency || 'AED',
    exchange_rate: po?.exchange_rate || 1.0,
    local_currency: 'AED',
  });

  const [lines, setLines] = useState<POLine[]>(
    po?.lines || [
      {
        line_number: 1,
        brand: '',
        model: '',
        description: '',
        specifications: {},
        quantity_ordered: 1,
        unit_cost: 0,
        expected_condition: 'A',
        supplier_sku: '',
        notes: '',
      },
    ]
  );

  useEffect(() => {
    if (selectedCompany) {
      fetchSuppliers();
      fetchProductTypes();
      fetchPaymentTerms();
      initializeIntelligence();
    }
  }, [selectedCompany]);

  const initializeIntelligence = async () => {
    if (!selectedCompany?.id) return;

    try {
      const service = await createImportIntelligenceService(selectedCompany.id);
      setIntelligenceService(service);
    } catch (error) {
      console.error('Error initializing intelligence service:', error);
    }
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('company_id', selectedCompany?.id)
      .order('name');
    setSuppliers(data || []);
  };

  const handleAddSupplier = async (supplierName: string) => {
    if (!selectedCompany?.id) return;

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        company_id: selectedCompany.id,
        name: supplierName,
      })
      .select()
      .single();

    if (error) throw error;

    await fetchSuppliers();
    setFormData({ ...formData, supplier_id: data.id });
    showToast('Supplier added successfully', 'success');
  };

  const fetchProductTypes = async () => {
    const { data } = await supabase
      .from('product_types')
      .select('*')
      .eq('company_id', selectedCompany?.id)
      .order('name');
    setProductTypes(data || []);
  };

  const fetchPaymentTerms = async () => {
    const { data } = await supabase
      .from('payment_terms')
      .select('*')
      .eq('company_id', selectedCompany?.id)
      .order('days');
    setPaymentTerms(data || []);

    if (!po && data && data.length > 0 && !formData.payment_terms) {
      const defaultTerm = data.find(term => term.is_default);
      if (defaultTerm) {
        setFormData(prev => ({ ...prev, payment_terms: defaultTerm.name }));
      }
    }
  };

  const addLine = () => {
    setLines([
      ...lines,
      {
        line_number: lines.length + 1,
        brand: '',
        model: '',
        description: '',
        specifications: {},
        quantity_ordered: 1,
        unit_cost: 0,
        expected_condition: 'A',
        supplier_sku: '',
        notes: '',
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const handleBulkImport = async (
    importedItems: any[],
    currencyData?: { sourceCurrency: string; exchangeRate: number },
    fileData?: { fileName: string; parsedData: any; mappings: any[] }
  ) => {
    const updates: any = {};

    if (currencyData) {
      updates.source_currency = currencyData.sourceCurrency;
      updates.exchange_rate = currencyData.exchangeRate;
    }

    if (fileData) {
      updates.source_file_name = fileData.fileName;
      updates.source_file_data = fileData.parsedData;
      updates.source_file_mappings = fileData.mappings;
    }

    if (Object.keys(updates).length > 0) {
      setFormData({ ...formData, ...updates });
    }

    const isFirstLineEmpty = lines.length === 1 && !lines[0].brand && !lines[0].model;

    const newLines = await Promise.all(importedItems.map(async (item, index) => {
      let product_type_id = undefined;

      if (item.product_type) {
        if (intelligenceService) {
          const lookupResult = await intelligenceService.lookupValue('product_type', item.product_type);
          if (lookupResult.referenceId) {
            product_type_id = lookupResult.referenceId;
          }
        }

        if (!product_type_id) {
          const matchedType = productTypes.find(
            pt => pt.name.toLowerCase() === item.product_type.toLowerCase()
          );
          if (matchedType) {
            product_type_id = matchedType.id;
          }
        }
      }

      return {
        line_number: isFirstLineEmpty ? index + 1 : lines.length + index + 1,
        product_type_id,
        brand: item.brand,
        model: item.model,
        serial_number: item.serial_number,
        description: item.description,
        specifications: item.specifications,
        quantity_ordered: item.quantity_ordered,
        unit_cost: item.unit_cost,
        unit_cost_source: item.unit_cost_source,
        expected_condition: item.expected_condition,
        supplier_sku: item.supplier_sku,
        notes: item.notes,
      };
    }));

    setLines(isFirstLineEmpty ? newLines : [...lines, ...newLines]);
    showToast(`Imported ${newLines.length} line items`, 'success');
  };

  const updateLine = (index: number, field: string, value: any) => {
    if (isViewOnly) return;
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const calculateSubtotal = () => {
    return lines.reduce((sum, line) => sum + line.quantity_ordered * line.unit_cost, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + Number(formData.tax_amount) + Number(formData.shipping_cost);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    setLoading(true);
    try {
      const poData = {
        company_id: selectedCompany.id,
        ...formData,
        subtotal: calculateSubtotal(),
        total_amount: calculateTotal(),
        total_items_ordered: lines.reduce((sum, line) => sum + line.quantity_ordered, 0),
      };

      let poId = po?.id;

      if (po) {
        const { error } = await supabase
          .from('purchase_orders')
          .update(poData)
          .eq('id', po.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('purchase_orders')
          .insert(poData)
          .select()
          .single();
        if (error) throw error;
        poId = data.id;
      }

      if (po) {
        await supabase
          .from('purchase_order_lines')
          .delete()
          .eq('purchase_order_id', po.id);
      }

      const linesData = lines.map((line, index) => {
        const lineTotalSource = (line.unit_cost_source || line.unit_cost || 0) * (line.quantity_ordered || 0);

        const { line_total, ...lineWithoutGenerated } = line;

        return {
          purchase_order_id: poId,
          ...lineWithoutGenerated,
          line_number: index + 1,
          line_total_source: lineTotalSource,
        };
      });

      const { error: linesError } = await supabase
        .from('purchase_order_lines')
        .insert(linesData);

      if (linesError) throw linesError;

      // Create expected_receiving_items from normalized line data
      if (po) {
        await supabase
          .from('expected_receiving_items')
          .delete()
          .eq('purchase_order_id', po.id);
      }

      const expectedItems = lines.flatMap(line => {
        // If line has serial number, create one expected item
        if (line.serial_number && line.serial_number.trim()) {
          return [{
            company_id: selectedCompany.id,
            purchase_order_id: poId,
            serial_number: line.serial_number,
            supplier_sku: line.supplier_sku || null,
            brand: line.brand,
            model: line.model,
            product_type_id: line.product_type_id || null,
            expected_specs: line.specifications || {},
            expected_grade: line.expected_condition || null,
            unit_cost: line.unit_cost || 0,
            status: 'awaiting',
            notes: line.notes || null
          }];
        }

        // If no serial number, create placeholder items based on quantity
        return Array(line.quantity_ordered || 1).fill(null).map(() => ({
          company_id: selectedCompany.id,
          purchase_order_id: poId,
          serial_number: '',
          supplier_sku: line.supplier_sku || null,
          brand: line.brand,
          model: line.model,
          product_type_id: line.product_type_id || null,
          expected_specs: line.specifications || {},
          expected_grade: line.expected_condition || null,
          unit_cost: line.unit_cost || 0,
          status: 'awaiting',
          notes: line.notes || null
        }));
      });

      if (expectedItems.length > 0) {
        const { error: expectedError } = await supabase
          .from('expected_receiving_items')
          .insert(expectedItems);

        if (expectedError) throw expectedError;
      }

      showToast(po ? 'Purchase order updated' : 'Purchase order created', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast('Error: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">
            {po ? (isViewOnly ? 'View' : 'Edit') : 'Create'} Purchase Order
            {isViewOnly && (
              <span className="ml-3 text-sm font-normal text-amber-600">
                (Read-Only: PO is {po.status})
              </span>
            )}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier *
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  required
                  disabled={isViewOnly}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                {!isViewOnly && (
                  <button
                    type="button"
                    onClick={() => setShowAddSupplier(true)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1"
                    title="Add new supplier"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Date
              </label>
              <input
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={isViewOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Delivery
              </label>
              <input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) =>
                  setFormData({ ...formData, expected_delivery_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={isViewOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms
              </label>
              <select
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={isViewOnly}
              >
                <option value="">Select Payment Terms</option>
                {paymentTerms.map((term) => (
                  <option key={term.id} value={term.name}>
                    {term.name} {term.days > 0 ? `(${term.days} days)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Amount
              </label>
              <input
                type="number"
                value={formData.tax_amount}
                onChange={(e) =>
                  setFormData({ ...formData, tax_amount: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                step="0.01"
                min="0"
                disabled={isViewOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipping Cost
              </label>
              <input
                type="number"
                value={formData.shipping_cost}
                onChange={(e) =>
                  setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                step="0.01"
                min="0"
                disabled={isViewOnly}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Subtotal:</span>
                <div className="font-semibold text-gray-900">${calculateSubtotal().toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-600">Tax:</span>
                <div className="font-semibold text-gray-900">${Number(formData.tax_amount).toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-600">Shipping:</span>
                <div className="font-semibold text-gray-900">${Number(formData.shipping_cost).toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-600">Total:</span>
                <div className="text-lg font-bold text-blue-900">${calculateTotal().toFixed(2)}</div>
              </div>
            </div>
          </div>

          {!isViewOnly && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold text-lg shadow-md"
              >
                {loading ? 'Saving...' : po ? 'Update Purchase Order' : 'Create Purchase Order'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
                disabled={isViewOnly}
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Change to "Submitted" to mark PO as sent to supplier
              </p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
              {!isViewOnly && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkImport(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Upload className="w-4 h-4" />
                    Smart Import
                  </button>
                  <button
                    type="button"
                    onClick={addLine}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Line
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {lines.map((line, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                  {lines.length > 1 && !isViewOnly && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Brand *
                      </label>
                      <input
                        type="text"
                        value={line.brand}
                        onChange={(e) => updateLine(index, 'brand', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                        disabled={isViewOnly}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Model *
                      </label>
                      <input
                        type="text"
                        value={line.model}
                        onChange={(e) => updateLine(index, 'model', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                        disabled={isViewOnly}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={line.quantity_ordered}
                        onChange={(e) =>
                          updateLine(index, 'quantity_ordered', parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        min="1"
                        required
                        disabled={isViewOnly}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Cost *
                      </label>
                      <input
                        type="number"
                        value={line.unit_cost}
                        onChange={(e) =>
                          updateLine(index, 'unit_cost', parseFloat(e.target.value))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        step="0.01"
                        min="0"
                        required
                        disabled={isViewOnly}
                      />
                    </div>
                  </div>

                  <div className="mt-3 text-right">
                    <span className="text-sm text-gray-600">Line Total: </span>
                    <span className="text-lg font-bold text-gray-900">
                      ${(line.quantity_ordered * line.unit_cost).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            {!isViewOnly && (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : po ? 'Update PO' : 'Create PO'}
              </button>
            )}
          </div>
        </form>
      </div>

      {showBulkImport && (
        <SmartPOImport
          supplierId={formData.supplier_id}
          onClose={() => setShowBulkImport(false)}
          onImport={handleBulkImport}
        />
      )}

      {showAddSupplier && (
        <QuickAddModal
          title="Add New Supplier"
          placeholder="Enter supplier name"
          onAdd={handleAddSupplier}
          onClose={() => setShowAddSupplier(false)}
        />
      )}
    </div>
  );
}
