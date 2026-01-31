import React, { useState, useEffect, useRef } from 'react';
import { Package, Upload, Scan, CheckCircle, AlertTriangle, XCircle, Download, Plus, SkipForward, ArrowRight, X, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import * as XLSX from 'xlsx';
import { createImportIntelligenceService, ImportIntelligenceService } from '../../lib/importIntelligence';
import { SmartAutoCreateModal } from '../common/SmartAutoCreateModal';
import { createSmartAutoCreateService } from '../../lib/smartAutoCreate';
import { ExcelSheetSelector } from '../common/ExcelSheetSelector';
import { isPassthroughSpec } from '../../lib/passthroughFields';

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  status: string;
  total_shipments: number;
  shipments_received: number;
  suppliers: { name: string };
  source_file_name?: string;
  source_file_data?: ParsedData;
  source_file_mappings?: ColumnMapping[];
  exchange_rate?: number;
  source_currency?: string;
  is_lot?: boolean;
  purchase_lot_id?: string;
  lot_number?: string;
}

interface POLine {
  id: string;
  brand: string;
  model: string;
  product_type_id?: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  quantity: number;
  unit_cost: number;
}

interface ExpectedItem {
  id?: string;
  serial_number: string;
  brand: string;
  model: string;
  expected_specs: any;
  expected_grade: string;
  unit_cost: number;
  supplier_sku?: string;
  product_type_id?: string;
  status: 'awaiting' | 'received' | 'missing';
  has_discrepancy: boolean;
  discrepancies: any[];
  is_bonus: boolean;
}

interface ReceivingLog {
  id: string;
  receiving_number: string;
  shipment_number: number;
  status: string;
  total_items_expected: number;
  total_items_received: number;
  total_bonus: number;
  total_missing: number;
  total_discrepancies: number;
}

interface ColumnMapping {
  supplierColumn: string;
  systemField: string;
  sampleValues: string[];
}

interface ParsedData {
  headers: string[];
  rows: string[][];
  sampleData: Record<string, string[]>;
}

type Step = 'select_po' | 'map_columns' | 'scan_items' | 'complete' | 'append_columns';


export default function SmartReceivingWorkflow() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('select_po');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poLines, setPOLines] = useState<POLine[]>([]);
  const [expectedItems, setExpectedItems] = useState<ExpectedItem[]>([]);
  const [receivingLog, setReceivingLog] = useState<ReceivingLog | null>(null);
  const [currentSerial, setCurrentSerial] = useState('');
  const [scannedItem, setScannedItem] = useState<ExpectedItem | null>(null);
  const [recentScans, setRecentScans] = useState<ExpectedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSerials, setBulkSerials] = useState('');
  const [systemFields, setSystemFields] = useState<Array<{value: string; label: string}>>([{ value: '', label: '-- Skip This Column --' }]);
  const [autoMapRules, setAutoMapRules] = useState<Record<string, string[]>>({});
  const [templateName, setTemplateName] = useState('');
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [appendMode, setAppendMode] = useState(false);
  const [appendParsedData, setAppendParsedData] = useState<ParsedData | null>(null);
  const [appendMappings, setAppendMappings] = useState<ColumnMapping[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [pendingProductType, setPendingProductType] = useState<string | null>(null);
  const [existingProductTypes, setExistingProductTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [unmappedProductTypes, setUnmappedProductTypes] = useState<Set<string>>(new Set());
  const [productTypeResolutionQueue, setProductTypeResolutionQueue] = useState<string[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<Array<{ name: string; rowCount: number; preview: string[][] }>>([]);
  const [currentWorkbook, setCurrentWorkbook] = useState<any>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [manualItemData, setManualItemData] = useState({
    brand: '',
    model: '',
    product_type_id: '',
    unit_cost: '',
    cpu: '',
    ram: '',
    storage: ''
  });

  const serialInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedCompany) {
      checkForActiveSession();
      loadCustomFields();
    } else {
      setIsLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (receivingLog?.id) {
      const channel = supabase
        .channel(`expected-items-${receivingLog.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'expected_receiving_items',
            filter: `receiving_log_id=eq.${receivingLog.id}`
          },
          async (payload) => {
            console.log('Expected item change detected:', payload);
            const { data: updatedItems } = await supabase
              .from('expected_receiving_items')
              .select('*, product_types(name)')
              .eq('receiving_log_id', receivingLog.id);

            if (updatedItems) {
              setExpectedItems(updatedItems);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [receivingLog?.id]);

  const loadCustomFields = async () => {
    const { data, error } = await supabase
      .from('import_field_mappings')
      .select('*')
      .eq('company_id', selectedCompany?.id)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error loading custom fields:', error);
      return;
    }

    const { data: fieldAliases } = await supabase
      .from('field_aliases')
      .select('system_field, alias')
      .eq('company_id', selectedCompany?.id);

    if (data && data.length > 0) {
      const customFieldsList = data.map(field => ({
        value: field.field_name,
        label: field.field_label,
      }));

      const fieldsToUse = [
        { value: '', label: '-- Skip This Column --' },
        ...customFieldsList
      ];
      setSystemFields(fieldsToUse);

      const customRules: Record<string, string[]> = {};
      data.forEach(field => {
        if (field.auto_map_keywords && Array.isArray(field.auto_map_keywords)) {
          customRules[field.field_name] = field.auto_map_keywords;
        }
      });

      if (fieldAliases && fieldAliases.length > 0) {
        fieldAliases.forEach(alias => {
          if (!customRules[alias.system_field]) {
            customRules[alias.system_field] = [];
          }
          customRules[alias.system_field].push(alias.alias.toLowerCase());
        });
      }

      setAutoMapRules(customRules);
    } else {
      console.warn('No import field mappings found. Please configure fields in Settings > Import Intelligence.');
      setSystemFields([{ value: '', label: '-- Skip This Column --' }]);
      setAutoMapRules({});
    }
  };

  const loadSavedTemplate = async (headers: string[], supplierId: string | null) => {
    if (!selectedCompany || !supplierId) return null;

    try {
      const { data, error } = await supabase
        .from('supplier_column_mappings')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      const savedConfig = data.mapping_config as Record<string, string>;
      const mappings: ColumnMapping[] = headers.map(header => ({
        supplierColumn: header,
        systemField: savedConfig[header] || autoSuggestMapping(header),
        sampleValues: [],
      }));

      setTemplateName(data.template_name);
      showToast(`Applied saved template: ${data.template_name}`, 'success');
      return mappings;
    } catch (error: any) {
      console.error('Error loading template:', error);
      return null;
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      showToast('Please enter a template name', 'error');
      return;
    }

    try {
      const config: Record<string, string> = {};
      mappings.forEach(m => {
        if (m.systemField) {
          config[m.supplierColumn] = m.systemField;
        }
      });

      const { error } = await supabase
        .from('supplier_column_mappings')
        .insert({
          company_id: selectedCompany?.id,
          supplier_id: selectedPO?.supplier_id || null,
          template_name: templateName,
          mapping_config: config,
        });

      if (error) throw error;
      showToast('Template saved successfully', 'success');
    } catch (error: any) {
      showToast(`Error saving template: ${error.message}`, 'error');
    }
  };

  const handleCreateProductType = async (name: string, aliases: string[]) => {
    try {
      const autoCreateService = await createSmartAutoCreateService(selectedCompany!.id);
      const result = await autoCreateService.findOrCreateProductType(pendingProductType!, aliases);

      showToast(`Product type "${result.name}" ${result.wasCreated ? 'created' : 'linked'} successfully`, 'success');

      // Refresh product types list to include the newly created one
      const { data: refreshedProductTypes } = await supabase
        .from('product_types')
        .select('id, name')
        .eq('company_id', selectedCompany!.id)
        .order('name');

      if (refreshedProductTypes) {
        setExistingProductTypes(refreshedProductTypes);
      }

      const updatedQueue = productTypeResolutionQueue.filter(pt => pt !== pendingProductType);
      setProductTypeResolutionQueue(updatedQueue);

      if (updatedQueue.length > 0) {
        setPendingProductType(updatedQueue[0]);
      } else {
        setPendingProductType(null);
        // Small delay to ensure database transaction is fully committed
        await new Promise(resolve => setTimeout(resolve, 100));
        await continueImportAfterResolution();
      }
    } catch (error: any) {
      console.error('Error creating product type:', error);
      showToast('Failed to create product type', 'error');
    }
  };

  const handleLinkProductType = async (existingId: string, createAlias: boolean) => {
    try {
      const autoCreateService = await createSmartAutoCreateService(selectedCompany!.id);
      await autoCreateService.linkToExistingProductType(pendingProductType!, existingId, createAlias);

      showToast(`Linked "${pendingProductType}" to existing product type`, 'success');

      // Refresh product types list to include any new aliases
      const { data: refreshedProductTypes } = await supabase
        .from('product_types')
        .select('id, name')
        .eq('company_id', selectedCompany!.id)
        .order('name');

      if (refreshedProductTypes) {
        setExistingProductTypes(refreshedProductTypes);
      }

      const updatedQueue = productTypeResolutionQueue.filter(pt => pt !== pendingProductType);
      setProductTypeResolutionQueue(updatedQueue);

      if (updatedQueue.length > 0) {
        setPendingProductType(updatedQueue[0]);
      } else {
        setPendingProductType(null);
        // Small delay to ensure database transaction is fully committed
        await new Promise(resolve => setTimeout(resolve, 100));
        await continueImportAfterResolution();
      }
    } catch (error: any) {
      console.error('Error linking product type:', error);
      showToast('Failed to link product type', 'error');
    }
  };

  const handleSkipProductType = () => {
    const updatedQueue = productTypeResolutionQueue.filter(pt => pt !== pendingProductType);
    setProductTypeResolutionQueue(updatedQueue);

    if (updatedQueue.length > 0) {
      setPendingProductType(updatedQueue[0]);
    } else {
      setPendingProductType(null);
      continueImportAfterResolution();
    }
  };

  const continueImportAfterResolution = async () => {
    if (!selectedPO || !selectedCompany) return;

    setIsProcessing(true);
    try {
      const { data: po } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name)')
        .eq('id', selectedPO.id)
        .single();

      if (po) {
        await handleStartReceiving(po);
      }
    } catch (error) {
      console.error('Error continuing import:', error);
      showToast('Failed to continue import', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSheetSelection = async (sheetName: string) => {
    if (!currentFile || !currentWorkbook) return;

    setShowSheetSelector(false);
    setLoading(true);

    try {
      const result = await parseExcelFile(currentFile, sheetName);
      const { headers, rows: allRows, totalRows } = result;

      if (!headers || headers.length === 0) {
        showToast('Sheet has no headers. Please ensure the first row contains column names.', 'error');
        setLoading(false);
        return;
      }

      if (!allRows || allRows.length === 0) {
        showToast('Sheet is empty. Please select a sheet with data rows.', 'error');
        setLoading(false);
        return;
      }

      if (allRows.length > 10000) {
        showToast(`Sheet contains ${totalRows} rows. Consider splitting into smaller files (max 10,000 rows recommended).`, 'warning');
      }

      const sampleData: Record<string, string[]> = {};
      headers.forEach(header => {
        sampleData[header] = [];
      });

      const sampleRows = allRows.slice(0, 5);
      sampleRows.forEach(row => {
        row.forEach((cell, index) => {
          if (headers[index] && cell) {
            sampleData[headers[index]].push(cell);
          }
        });
      });

      setAppendParsedData({ headers, rows: allRows, sampleData });

      const initialMappings = headers.map(header => {
        const suggestedMapping = autoSuggestMapping(header);
        return {
          supplierColumn: header,
          systemField: suggestedMapping === 'serial_number' ? 'serial_number' : '',
          sampleValues: sampleData[header].slice(0, 3),
        };
      });

      const serialMapped = initialMappings.some(m => m.systemField === 'serial_number');
      if (!serialMapped) {
        console.warn('No serial number column auto-detected. Please map manually.');
      }

      setAppendMappings(initialMappings);
      setStep('append_columns');
      showToast(`Loaded sheet "${sheetName}" with ${totalRows} rows and ${headers.length} columns`, 'success');
    } catch (error: any) {
      console.error('Sheet parsing error:', error);
      showToast(`Error parsing sheet: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSheetSelection = () => {
    setShowSheetSelector(false);
    setAvailableSheets([]);
    setCurrentWorkbook(null);
    setCurrentFile(null);
  };

  const checkForActiveSession = async () => {
    if (!selectedCompany) return;

    setIsLoading(true);
    try {
      const { data: activeLogs, error } = await supabase
        .from('receiving_logs')
        .select('*, purchase_orders(id, po_number, supplier_id, status, suppliers(name))')
        .eq('company_id', selectedCompany.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (activeLogs && activeLogs.length > 0) {
        const activeLog = activeLogs[0];

        const { data: expectedItemsData } = await supabase
          .from('expected_receiving_items')
          .select('*, product_types(name)')
          .eq('receiving_log_id', activeLog.id);

        const po = activeLog.purchase_orders as any;

        if (po) {
          setSelectedPO({
            id: po.id,
            po_number: po.po_number,
            supplier_id: po.supplier_id,
            status: po.status,
            suppliers: po.suppliers,
            total_shipments: 0,
            shipments_received: 0,
          });
          setManualMode(false);
        } else {
          setSelectedPO(null);
          setManualMode(true);
          const { data: types } = await supabase
            .from('product_types')
            .select('*')
            .eq('company_id', selectedCompany.id)
            .eq('is_active', true)
            .order('name');
          setProductTypes(types || []);
        }

        setReceivingLog(activeLog);
        setExpectedItems(expectedItemsData || []);
        setStep('scan_items');
        showToast(`Resumed active ${po ? 'PO-based' : 'manual'} receiving session`, 'success');

        setTimeout(() => serialInputRef.current?.focus(), 100);
      } else {
        loadPurchaseOrders();
      }
    } catch (error: any) {
      showToast(`Error checking for active session: ${error.message}`, 'error');
      loadPurchaseOrders();
    } finally {
      setIsLoading(false);
    }
  };

  const loadPurchaseOrders = async () => {
    if (!selectedCompany) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .select('id, po_number, supplier_id, status, source_file_name, source_file_data, source_file_mappings, exchange_rate, source_currency, purchase_lot_id, suppliers(name)')
        .eq('company_id', selectedCompany.id)
        .in('status', ['submitted', 'receiving', 'partial'])
        .order('created_at', { ascending: false });

      if (poError) throw poError;

      const enrichedPOs = await Promise.all(
        (poData || []).map(async (po: any) => {
          const { data: logs } = await supabase
            .from('receiving_logs')
            .select('id')
            .eq('purchase_order_id', po.id);

          let lotNumber = null;
          if (po.purchase_lot_id) {
            const { data: lotData } = await supabase
              .from('purchase_lots')
              .select('lot_number')
              .eq('id', po.purchase_lot_id)
              .maybeSingle();

            lotNumber = lotData?.lot_number;
          }

          return {
            id: po.id,
            po_number: po.po_number,
            supplier_id: po.supplier_id,
            status: po.status,
            suppliers: po.suppliers,
            total_shipments: logs?.length || 0,
            shipments_received: logs?.length || 0,
            source_file_name: po.source_file_name,
            source_file_data: po.source_file_data,
            source_file_mappings: po.source_file_mappings,
            exchange_rate: po.exchange_rate,
            source_currency: po.source_currency,
            purchase_lot_id: po.purchase_lot_id,
            lot_number: lotNumber,
          };
        })
      );

      setPurchaseOrders(enrichedPOs);
    } catch (error: any) {
      showToast(`Failed to load purchase orders: ${error.message}`, 'error');
      setPurchaseOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectPO = async (po: PurchaseOrder, forceNewReceiving = false) => {
    setSelectedPO(po);
    setManualMode(false);

    if (!forceNewReceiving) {
      const { data: completedLog } = await supabase
        .from('receiving_logs')
        .select('*')
        .eq('purchase_order_id', po.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (completedLog) {
        const { data: receivedItems } = await supabase
          .from('expected_receiving_items')
          .select('*, product_types(name)')
          .eq('purchase_order_id', po.id);

        setReceivingLog(completedLog);
        setExpectedItems(receivedItems || []);
        setStep('complete');
        showToast(`PO ${po.po_number} is already fully received`, 'info');
        return;
      }
    }

    const { data: existingItems } = await supabase
      .from('expected_receiving_items')
      .select('*, product_types(name)')
      .eq('purchase_order_id', po.id)
      .eq('status', 'awaiting');

    if (existingItems && existingItems.length > 0) {
      const logQuery = supabase
        .from('receiving_logs')
        .select('*')
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1);

      if (po.is_lot) {
        logQuery.eq('purchase_lot_id', po.id);
      } else {
        logQuery.eq('purchase_order_id', po.id);
      }

      const { data: logData } = await logQuery.maybeSingle();

      if (logData) {
        setReceivingLog(logData);
        setExpectedItems(existingItems);
        setStep('scan_items');
        showToast(`Resuming receiving for PO ${po.po_number}`, 'success');
        setTimeout(() => serialInputRef.current?.focus(), 100);
        return;
      } else {
        const logInsert: any = {
          company_id: selectedCompany.id,
          status: 'in_progress',
          received_by: user?.id,
        };

        if (po.is_lot) {
          logInsert.purchase_lot_id = po.id;
        } else {
          logInsert.purchase_order_id = po.id;
        }

        const { data: newLog, error: logError } = await supabase
          .from('receiving_logs')
          .insert(logInsert)
          .select()
          .single();

        if (logError) throw logError;

        const updateQuery = supabase
          .from('expected_receiving_items')
          .update({ receiving_log_id: newLog.id })
          .eq('status', 'awaiting');

        if (po.is_lot) {
          updateQuery.eq('purchase_lot_id', po.id);
        } else {
          updateQuery.eq('purchase_order_id', po.id);
        }

        await updateQuery;

        const { data: updatedItems } = await supabase
          .from('expected_receiving_items')
          .select('*')
          .eq('receiving_log_id', newLog.id);

        setReceivingLog(newLog);
        setExpectedItems(updatedItems || []);
        setStep('scan_items');
        showToast(`Continuing receiving for PO ${po.po_number} with ${existingItems.length} remaining items`, 'success');
        setTimeout(() => serialInputRef.current?.focus(), 100);
        return;
      }
    }

    // Load expected items that were created during PO import
    // These items are already normalized and ready to receive
    const { data: awaitingItems, error: itemsError } = await supabase
      .from('expected_receiving_items')
      .select('*')
      .eq('purchase_order_id', po.id)
      .eq('status', 'awaiting');

    if (itemsError) {
      showToast('Error loading expected items: ' + itemsError.message, 'error');
      return;
    }

    if (!awaitingItems || awaitingItems.length === 0) {
      showToast('No expected items found for this PO. Please check if PO was created with Smart Import.', 'error');
      return;
    }

    // Create receiving log
    const logInsertData: any = {
      company_id: selectedCompany.id,
      receiving_number: `RCV-${Date.now()}`,
      receiving_date: new Date().toISOString().split('T')[0],
      status: 'in_progress',
      received_by: user?.id,
      total_items_expected: awaitingItems.length,
      shipment_number: 1,
    };

    if (po.is_lot) {
      logInsertData.purchase_lot_id = po.id;
    } else {
      logInsertData.purchase_order_id = po.id;
    }

    const { data: newLog, error: logError } = await supabase
      .from('receiving_logs')
      .insert(logInsertData)
      .select()
      .single();

    if (logError) {
      showToast('Error creating receiving log: ' + logError.message, 'error');
      return;
    }

    // Update expected items with receiving log ID
    const { error: updateError } = await supabase
      .from('expected_receiving_items')
      .update({ receiving_log_id: newLog.id })
      .eq('purchase_order_id', po.id)
      .eq('status', 'awaiting');

    if (updateError) {
      showToast('Error updating expected items: ' + updateError.message, 'error');
      return;
    }

    // Set state and start scanning
    setExpectedItems(awaitingItems);
    setReceivingLog(newLog);
    setStep('scan_items');
    showToast(`Ready to receive ${awaitingItems.length} items for PO ${po.po_number}`, 'success');
    setTimeout(() => serialInputRef.current?.focus(), 100)
  };

  const startManualReceiving = async () => {
    if (!selectedCompany || !user) return;

    setIsProcessing(true);

    try {
      const { data: types } = await supabase
        .from('product_types')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .eq('is_active', true)
        .order('name');

      setProductTypes(types || []);

      const { data: newLog, error: logError } = await supabase
        .from('receiving_logs')
        .insert({
          company_id: selectedCompany.id,
          purchase_order_id: null,
          status: 'in_progress',
          received_by: user.id,
          receiving_number: `MAN-${Date.now()}`,
        })
        .select()
        .single();

      if (logError) throw logError;

      setReceivingLog(newLog);
      setExpectedItems([]);
      setManualMode(true);
      setStep('scan_items');
      showToast('Manual receiving started - scan items as you receive them', 'success');
      setTimeout(() => serialInputRef.current?.focus(), 100);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const autoSuggestMapping = (columnName: string): string => {
    const normalized = columnName.toLowerCase().trim();
    for (const [field, keywords] of Object.entries(autoMapRules)) {
      if (keywords.some(keyword => normalized.includes(keyword))) {
        return field;
      }
    }
    return '';
  };

  const parseExcelFile = async (file: File, sheetName?: string): Promise<{ headers: string[]; rows: string[][]; totalRows: number; hasMultipleSheets?: boolean; workbook?: any }> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });

    if (workbook.SheetNames.length > 1 && !sheetName) {
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        hasMultipleSheets: true,
        workbook,
      };
    }

    const targetSheetName = sheetName || workbook.SheetNames[0];
    const sheet = workbook.Sheets[targetSheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

    if (jsonData.length < 2) {
      throw new Error('Sheet is empty or has no data rows');
    }

    const headers = jsonData[0].map(h => String(h || '').trim());
    const rows = jsonData.slice(1)
      .map(row => row.map(cell => String(cell || '').trim()))
      .filter(row => row.some(cell => cell !== ''));

    return { headers, rows, totalRows: rows.length };
  };

  const getSheetInfo = (workbook: any): Array<{ name: string; rowCount: number; preview: string[][] }> => {
    return workbook.SheetNames.map((sheetName: string) => {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
      const preview = jsonData.slice(0, 6).map(row =>
        row.map((cell: any) => String(cell || '').trim())
      );
      const rowCount = jsonData.length - 1;

      return { name: sheetName, rowCount, preview };
    });
  };


  const updateMapping = (index: number, systemField: string) => {
    const updated = [...mappings];
    updated[index].systemField = systemField;
    setMappings(updated);
  };

  const importExpectedItems = async () => {
    if (!selectedPO || !selectedCompany || !parsedData) return;

    setIsProcessing(true);

    try {
      const { data: productTypes } = await supabase
        .from('product_types')
        .select('id, name')
        .eq('company_id', selectedCompany.id);

      const intelligenceService = await createImportIntelligenceService(selectedCompany.id);

      const productTypeMap = new Map(
        (productTypes || []).map(pt => [pt.name.toLowerCase(), pt.id])
      );

      const items: any[] = [];

      for (const row of parsedData.rows) {
        const item: any = {
          serial_number: '',
          brand: '',
          model: '',
          expected_specs: {},
          expected_grade: '',
          unit_cost: 0,
        };

        for (let index = 0; index < mappings.length; index++) {
          const mapping = mappings[index];
          const cellValue = row[index];

          if (mapping.systemField && cellValue !== undefined && cellValue !== null) {
            const value = String(cellValue).trim();
            if (!value) continue;

            if (mapping.systemField.startsWith('specs.') || mapping.systemField.startsWith('specifications.')) {
              const specKey = mapping.systemField.replace(/^(specs\.|specifications\.)/, '');
              item.expected_specs[specKey] = value;
            } else if (mapping.systemField === 'unit_cost' || mapping.systemField === 'quantity_ordered') {
              const cleanValue = value.replace(/[$,¥€£₹]/g, '');
              const numValue = parseFloat(cleanValue);
              if (!isNaN(numValue)) {
                item[mapping.systemField] = numValue;
              }
            } else if (mapping.systemField === 'product_type') {
              const lookupResult = await intelligenceService.lookupValue('product_type', value);
              let productTypeId = lookupResult.referenceId || productTypeMap.get(value.toLowerCase());
              if (productTypeId) {
                item.product_type_id = productTypeId;
              }
            } else {
              item[mapping.systemField] = value;
            }
          }
        }

        // Normalize model name if both brand and model are present
        if (item.brand && item.model) {
          try {
            const { data: normalizedModel } = await supabase
              .rpc('normalize_model_name', {
                p_company_id: selectedCompany.id,
                p_brand: item.brand,
                p_model_variant: item.model
              });

            if (normalizedModel) {
              item.model = normalizedModel;
            }
          } catch (error) {
            console.warn('Model normalization failed:', error);
          }
        }

        if (item.serial_number) {
          items.push(item);
        }
      }

      if (items.length === 0) {
        throw new Error('No items with serial numbers found in the file');
      }

      const serialNumbers = items.map(item => item.serial_number);
      const { data: existingAssets } = await supabase
        .from('assets')
        .select('serial_number')
        .eq('company_id', selectedCompany.id)
        .in('serial_number', serialNumbers);

      if (existingAssets && existingAssets.length > 0) {
        const duplicateSerials = existingAssets.map(a => a.serial_number).join(', ');
        throw new Error(`Cannot import: ${existingAssets.length} serial(s) already exist in inventory: ${duplicateSerials.slice(0, 100)}${duplicateSerials.length > 100 ? '...' : ''}`);
      }

      const { data: log, error: logError } = await supabase
        .from('receiving_logs')
        .insert({
          company_id: selectedCompany.id,
          purchase_order_id: selectedPO.id,
          receiving_number: `RCV-${Date.now()}`,
          receiving_date: new Date().toISOString().split('T')[0],
          status: 'in_progress',
          received_by: user?.id,
          total_items_expected: items.length,
          shipment_number: (selectedPO.shipments_received || 0) + 1,
        })
        .select()
        .single();

      if (logError) throw logError;

      const itemsWithLog = items.map(item => {
        let product_type_id = item.product_type_id || null;
        let unit_cost = item.unit_cost || 0;

        const matchingLine = poLines.find(line =>
          (line.brand && item.brand && line.brand.toLowerCase() === item.brand.toLowerCase()) &&
          (line.model && item.model && line.model.toLowerCase() === item.model.toLowerCase())
        );

        if (matchingLine) {
          if (!product_type_id && matchingLine.product_type_id) {
            product_type_id = matchingLine.product_type_id;
          }
          if (matchingLine.unit_cost) {
            unit_cost = matchingLine.unit_cost;
          }
        }

        return {
          ...item,
          unit_cost,
          company_id: selectedCompany.id,
          purchase_order_id: selectedPO.id,
          receiving_log_id: log.id,
          product_type_id,
          status: 'awaiting',
        };
      });

      const { data: insertedItems, error: itemsError } = await supabase
        .from('expected_receiving_items')
        .insert(itemsWithLog)
        .select();

      if (itemsError) throw itemsError;

      setExpectedItems(insertedItems || []);
      setReceivingLog(log);

      if (saveTemplate && templateName) {
        await handleSaveTemplate();
      }

      setStep('scan_items');
      showToast(`Loaded ${insertedItems?.length} expected items`, 'success');

      setTimeout(() => serialInputRef.current?.focus(), 100);
    } catch (error: any) {
      showToast(error.message || 'Error importing items', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAppendFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(csv|xlsx|xls)$/i)) {
      showToast('Please upload a CSV or Excel file (.csv, .xlsx, .xls)', 'error');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      showToast(`File size (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB) exceeds 10MB limit`, 'error');
      return;
    }

    setLoading(true);

    try {
      const result = await parseExcelFile(selectedFile);

      if (result.hasMultipleSheets && result.workbook) {
        const sheets = getSheetInfo(result.workbook);
        setAvailableSheets(sheets);
        setCurrentWorkbook(result.workbook);
        setCurrentFile(selectedFile);
        setShowSheetSelector(true);
        setLoading(false);
        return;
      }

      const { headers, rows: allRows, totalRows } = result;

      if (!headers || headers.length === 0) {
        showToast('File has no headers. Please ensure the first row contains column names.', 'error');
        setLoading(false);
        return;
      }

      if (!allRows || allRows.length === 0) {
        showToast('File is empty. Please upload a file with data rows.', 'error');
        setLoading(false);
        return;
      }

      if (allRows.length > 10000) {
        showToast(`File contains ${totalRows} rows. Consider splitting into smaller files (max 10,000 rows recommended).`, 'warning');
      }

      const sampleData: Record<string, string[]> = {};
      headers.forEach(header => {
        sampleData[header] = [];
      });

      const sampleRows = allRows.slice(0, 5);
      sampleRows.forEach(row => {
        row.forEach((cell, index) => {
          if (headers[index] && cell) {
            sampleData[headers[index]].push(cell);
          }
        });
      });

      setAppendParsedData({ headers, rows: allRows, sampleData });

      const initialMappings = headers.map(header => {
        const suggestedMapping = autoSuggestMapping(header);
        return {
          supplierColumn: header,
          systemField: suggestedMapping === 'serial_number' ? 'serial_number' : '',
          sampleValues: sampleData[header].slice(0, 3),
        };
      });

      const serialMapped = initialMappings.some(m => m.systemField === 'serial_number');
      if (!serialMapped) {
        console.warn('No serial number column auto-detected. Please map manually.');
      }

      setAppendMappings(initialMappings);
      setStep('append_columns');
      showToast(`Loaded ${selectedFile.name} with ${totalRows} rows and ${headers.length} columns`, 'success');
    } catch (error: any) {
      console.error('File parsing error:', error);
      let errorMessage = 'Error parsing file';

      if (error.message.includes('Unsupported file type')) {
        errorMessage = 'Unsupported file format. Please use .csv, .xlsx, or .xls files.';
      } else if (error.message.includes('password') || error.message.includes('encrypted')) {
        errorMessage = 'File is password protected. Please remove password protection and try again.';
      } else if (error.message.includes('corrupt') || error.message.includes('damaged')) {
        errorMessage = 'File appears to be corrupted. Please re-export and try again.';
      } else {
        errorMessage = `Error parsing file: ${error.message}. Check console for details.`;
      }

      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const updateAppendMapping = (index: number, systemField: string) => {
    const updated = [...appendMappings];
    updated[index].systemField = systemField;
    setAppendMappings(updated);
  };

  const appendColumnsToItems = async () => {
    if (!appendParsedData || !receivingLog || !selectedCompany) return;

    setIsProcessing(true);

    const errors: string[] = [];
    const warnings: string[] = [];
    const notFoundSerials: string[] = [];
    const emptySerials: number[] = [];
    const dbErrors: Array<{ serial: string; error: string }> = [];

    try {
      const { data: productTypes } = await supabase
        .from('product_types')
        .select('id, name')
        .eq('company_id', selectedCompany.id);

      const intelligenceService = await createImportIntelligenceService(selectedCompany.id);

      const productTypeMap = new Map<string, string>();

      (productTypes || []).forEach(pt => {
        productTypeMap.set(pt.name.toLowerCase(), pt.id);
      });
      let serialColumnIndex = -1;
      const updateMappings = appendMappings.filter((m, index) => {
        if (m.systemField === 'serial_number') {
          serialColumnIndex = index;
          return false;
        }
        return m.systemField !== '';
      });

      if (serialColumnIndex === -1) {
        showToast('Serial Number column must be mapped to match existing items', 'error');
        setIsProcessing(false);
        return;
      }

      if (updateMappings.length === 0) {
        showToast('Please map at least one column to append', 'error');
        setIsProcessing(false);
        return;
      }

      let updatedCount = 0;
      let assetsUpdatedCount = 0;
      let notFoundCount = 0;
      let skippedCount = 0;
      const batchUpdates: Array<{ id: string; serial: string; updates: any }> = [];

      for (let rowIndex = 0; rowIndex < appendParsedData.rows.length; rowIndex++) {
        const row = appendParsedData.rows[rowIndex];
        const serialNumber = String(row[serialColumnIndex] || '').trim();

        if (!serialNumber) {
          emptySerials.push(rowIndex + 2);
          skippedCount++;
          continue;
        }

        const existingItem = expectedItems.find(
          item => item.serial_number.toLowerCase() === serialNumber.toLowerCase()
        );

        if (!existingItem || !existingItem.id) {
          notFoundSerials.push(serialNumber);
          notFoundCount++;
          continue;
        }

        const updates: any = {};
        const specUpdates: any = { ...existingItem.expected_specs };

        console.log(`\n=== Processing Row ${rowIndex + 2}, Serial: ${serialNumber} ===`);
        console.log('Update Mappings:', updateMappings.map(m => `${m.supplierColumn} → ${m.systemField}`));
        console.log('Existing Item:', { id: existingItem.id, product_type_id: existingItem.product_type_id, expected_specs: existingItem.expected_specs });

        let hasSpecChanges = false;

        for (const mapping of updateMappings) {
          const colIndex = appendMappings.findIndex(m => m.supplierColumn === mapping.supplierColumn);
          const cellValue = row[colIndex];

          console.log(`\nMapping: ${mapping.supplierColumn} → ${mapping.systemField}`);
          console.log(`Column Index: ${colIndex}, Cell Value:`, cellValue);

          if (cellValue !== undefined && cellValue !== null) {
            const value = String(cellValue).trim();
            console.log(`Trimmed Value: "${value}"`);
            if (!value) {
              console.log(`❌ Skipping ${mapping.systemField} - empty value`);
              continue;
            }

            if (mapping.systemField.startsWith('specs.') || mapping.systemField.startsWith('specifications.')) {
              const specKey = mapping.systemField.replace(/^(specs\.|specifications\.)/, '');
              specUpdates[specKey] = value;
              hasSpecChanges = true;
              console.log(`✅ Added spec: ${specKey} = "${value}"`);
            } else if (mapping.systemField === 'unit_cost' || mapping.systemField === 'quantity_ordered') {
              const cleanValue = value.replace(/[$,¥€£₹]/g, '');
              const numValue = parseFloat(cleanValue);
              if (!isNaN(numValue)) {
                updates[mapping.systemField] = numValue;
                console.log(`✅ Added field: ${mapping.systemField} = ${numValue}`);
              } else {
                warnings.push(`Row ${rowIndex + 2}: Invalid number format for ${mapping.systemField}: "${value}"`);
              }
            } else if (mapping.systemField === 'product_type') {
              const lookupResult = await intelligenceService.lookupValue('product_type', value);
              let productTypeId = lookupResult.referenceId || productTypeMap.get(value.toLowerCase());
              if (productTypeId) {
                updates.product_type_id = productTypeId;
                console.log(`✅ Row ${rowIndex + 2}, Serial ${serialNumber}: Mapped product type "${value}" to ID ${productTypeId}`);
              } else {
                const productTypeNames = Array.from(new Set(
                  (productTypes || []).map(pt => pt.name)
                ));
                warnings.push(`Row ${rowIndex + 2}: Product type "${value}" not found. Available: ${productTypeNames.join(', ')}`);
                console.warn(`Row ${rowIndex + 2}, Serial ${serialNumber}: Product type "${value}" not found`);
              }
            } else {
              updates[mapping.systemField] = value;
              console.log(`✅ Added field: ${mapping.systemField} = "${value}"`);
            }
          } else {
            console.log(`⚠️ Cell value is undefined/null for ${mapping.systemField}`);
          }
        }

        if (hasSpecChanges) {
          updates.expected_specs = specUpdates;
          console.log(`✅ Will update expected_specs with ${Object.keys(specUpdates).length} keys`);
        }

        console.log('\nFinal Updates Object:', updates);
        console.log('Final Specs Updates Object:', specUpdates);
        console.log('Specs Changed:', Object.keys(specUpdates).length > Object.keys(existingItem.expected_specs).length);

        if (Object.keys(updates).length > 0) {
          batchUpdates.push({ id: existingItem.id, serial: serialNumber, updates });
          console.log(`✅ Row ${rowIndex + 2}, Serial ${serialNumber}: Prepared ${Object.keys(updates).length} updates`);
        } else {
          console.log(`❌ Row ${rowIndex + 2}, Serial ${serialNumber}: No updates prepared (all values empty or invalid)`);
          skippedCount++;
        }
      }

      if (emptySerials.length > 0) {
        warnings.push(`${emptySerials.length} rows with empty serial numbers (rows: ${emptySerials.slice(0, 5).join(', ')}${emptySerials.length > 5 ? '...' : ''})`);
      }

      if (notFoundSerials.length > 0) {
        warnings.push(`${notFoundSerials.length} serial numbers not found in receiving (${notFoundSerials.slice(0, 5).join(', ')}${notFoundSerials.length > 5 ? '...' : ''})`);
      }

      if (batchUpdates.length === 0) {
        const message = `No items to update. ${skippedCount} rows skipped, ${notFoundCount} serials not found.`;
        showToast(message, 'warning');
        setIsProcessing(false);
        return;
      }

      const BATCH_SIZE = 50;
      let currentBatch = 0;
      const totalBatches = Math.ceil(batchUpdates.length / BATCH_SIZE);

      for (let i = 0; i < batchUpdates.length; i += BATCH_SIZE) {
        const batch = batchUpdates.slice(i, i + BATCH_SIZE);
        currentBatch++;

        const promises = batch.map(({ id, serial, updates }) =>
          supabase
            .from('expected_receiving_items')
            .update(updates)
            .eq('id', id)
            .select()
            .then(result => ({ ...result, serial, itemId: id, updates }))
        );

        const results = await Promise.all(promises);

        const successfulUpdates: Array<{ id: string; serial: string; updates: any }> = [];

        results.forEach((result, idx) => {
          if (result.error) {
            const { serial } = batch[idx];
            dbErrors.push({
              serial,
              error: result.error.message || 'Unknown database error'
            });
            console.error(`Error updating ${serial}:`, result.error);
          } else if (result.data && result.data.length > 0) {
            updatedCount++;
            successfulUpdates.push({ id: result.itemId, serial: result.serial, updates: result.updates });
            console.log(`✅ Successfully updated expected_receiving_items: ${result.serial}`);
          } else {
            console.warn(`⚠️ No data returned for ${result.serial}`);
          }
        });

        if (successfulUpdates.length > 0) {
          setExpectedItems(prev => prev.map(item => {
            const update = successfulUpdates.find(u => u.id === item.id);
            return update ? { ...item, ...update.updates } : item;
          }));

          for (const { serial, updates } of successfulUpdates) {
            const { data: existingAsset } = await supabase
              .from('assets')
              .select('id, product_type_id, brand, model')
              .eq('company_id', selectedCompany.id)
              .eq('serial_number', serial)
              .maybeSingle();

            if (!existingAsset) {
              console.log(`ℹ️ Asset ${serial} not yet created (item not received/scanned)`);
              continue;
            }

            const assetUpdates: any = {};

            if (updates.product_type_id !== undefined) {
              assetUpdates.product_type_id = updates.product_type_id;
              console.log(`📝 Will update asset ${serial} product_type_id: ${existingAsset.product_type_id} → ${updates.product_type_id}`);
            }

            if (updates.brand !== undefined) {
              assetUpdates.brand = updates.brand;
            }

            if (updates.model !== undefined) {
              assetUpdates.model = updates.model;
            }

            if (updates.expected_specs !== undefined) {
              const specs = updates.expected_specs;
              if (specs.cpu !== undefined) assetUpdates.cpu = specs.cpu;
              if (specs.ram !== undefined) assetUpdates.ram = specs.ram;
              if (specs.storage !== undefined) assetUpdates.storage = specs.storage;
              if (specs.screen_size !== undefined) assetUpdates.screen_size = specs.screen_size;
              assetUpdates.other_specs = specs;
            }

            if (Object.keys(assetUpdates).length > 0) {
              console.log(`🔄 Updating asset ${serial} with:`, assetUpdates);
              const { data: updatedAsset, error: assetError } = await supabase
                .from('assets')
                .update(assetUpdates)
                .eq('company_id', selectedCompany.id)
                .eq('serial_number', serial)
                .select(`
                  id,
                  product_type_id,
                  brand,
                  model,
                  product_types(name)
                `);

              if (assetError) {
                console.error(`❌ Error updating asset ${serial}:`, assetError.message);
                console.error(`Full error:`, assetError);
                warnings.push(`Failed to update asset ${serial}: ${assetError.message}`);
              } else if (updatedAsset && updatedAsset.length > 0) {
                assetsUpdatedCount++;
                console.log(`✅ Successfully updated asset ${serial}:`, updatedAsset[0]);
                console.log(`   Product Type: ${updatedAsset[0].product_types?.name || 'NULL'} (ID: ${updatedAsset[0].product_type_id})`);
              } else {
                console.warn(`⚠️ Asset update returned no data for ${serial}`);
              }
            }
          }
        }
      }

      let summaryMessage = `Successfully updated ${updatedCount} of ${batchUpdates.length} expected items`;
      if (assetsUpdatedCount > 0) {
        summaryMessage += ` and ${assetsUpdatedCount} assets (already received)`;
      }

      if (dbErrors.length > 0) {
        errors.push(`${dbErrors.length} database errors occurred: ${dbErrors.slice(0, 3).map(e => `${e.serial} (${e.error})`).join(', ')}${dbErrors.length > 3 ? '...' : ''}`);
      }

      if (errors.length > 0 || warnings.length > 0) {
        console.group('Append Operation Report');
        console.log('Summary:', summaryMessage);
        if (errors.length > 0) {
          console.error('Errors:', errors);
        }
        if (warnings.length > 0) {
          console.warn('Warnings:', warnings);
        }
        if (dbErrors.length > 0) {
          console.error('Database Errors:', dbErrors);
        }
        console.groupEnd();

        const detailedMessage = [
          summaryMessage,
          errors.length > 0 ? `Errors: ${errors.length}` : null,
          warnings.length > 0 ? `Warnings: ${warnings.length}` : null,
          'Check console for details'
        ].filter(Boolean).join('. ');

        showToast(detailedMessage, errors.length > 0 ? 'error' : (warnings.length > 0 ? 'warning' : 'success'));
      } else {
        showToast(summaryMessage, 'success');
      }

      if (updatedCount > 0) {
        setStep('complete');
        setAppendMode(false);
        setAppendParsedData(null);
        setAppendMappings([]);
      }
    } catch (error: any) {
      console.error('Append operation failed:', error);
      showToast(`Critical error during append: ${error.message}. Check console for details.`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSerialScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSerial.trim() || !receivingLog) return;

    setIsProcessing(true);

    try {
      const { data: existingAsset } = await supabase
        .from('assets')
        .select('id, serial_number, brand, model, received_date')
        .eq('company_id', selectedCompany.id)
        .ilike('serial_number', currentSerial.trim())
        .maybeSingle();

      if (existingAsset) {
        showToast('Duplicate: This serial number has already been received', 'error');
        setCurrentSerial('');
        setIsProcessing(false);
        return;
      }

      if (manualMode) {
        setScannedItem({
          serial_number: currentSerial.trim(),
          brand: '',
          model: '',
          expected_specs: {},
          expected_grade: '',
          unit_cost: 0,
          status: 'awaiting',
          has_discrepancy: false,
          discrepancies: [],
          is_bonus: true,
        });
        setCurrentSerial('');
        setIsProcessing(false);
        return;
      }

      const expectedItem = expectedItems.find(
        item => item.serial_number.toLowerCase() === currentSerial.toLowerCase().trim()
      );

      if (!expectedItem) {
        const { data: existingAsset } = await supabase
          .from('assets')
          .select('id, serial_number, brand, model, received_date')
          .eq('company_id', selectedCompany.id)
          .ilike('serial_number', currentSerial.trim())
          .maybeSingle();

        if (existingAsset) {
          showToast('Duplicate: This serial number has already been received', 'error');
          setCurrentSerial('');
          setIsProcessing(false);
          return;
        }

        setScannedItem({
          serial_number: currentSerial.trim(),
          brand: '',
          model: '',
          expected_specs: {},
          expected_grade: '',
          unit_cost: 0,
          status: 'awaiting',
          has_discrepancy: false,
          discrepancies: [],
          is_bonus: true,
        });
        showToast('Bonus item detected - not in packing list', 'warning');
      } else {
        const { data: existingAsset } = await supabase
          .from('assets')
          .select('id')
          .eq('company_id', selectedCompany.id)
          .ilike('serial_number', expectedItem.serial_number)
          .maybeSingle();

        if (existingAsset) {
          showToast('Duplicate: This serial number has already been received', 'error');
          setCurrentSerial('');
          setIsProcessing(false);
          return;
        }

        setScannedItem(expectedItem);
      }

      setCurrentSerial('');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const acceptItem = async (grade: string, notes: string) => {
    if (!scannedItem || !receivingLog || !selectedCompany) return;

    setIsProcessing(true);

    try {
      let brand = scannedItem.brand;
      let model = scannedItem.model;
      let product_type_id = scannedItem.product_type_id;
      let unit_cost = scannedItem.unit_cost;
      let cpu = null;
      let ram = null;
      let storage = null;

      if (manualMode || scannedItem.is_bonus) {
        brand = manualItemData.brand;
        model = manualItemData.model;
        product_type_id = manualItemData.product_type_id;
        unit_cost = parseFloat(manualItemData.unit_cost) || 0;
        cpu = manualItemData.cpu || null;
        ram = manualItemData.ram || null;
        storage = manualItemData.storage || null;
      } else {
        if (scannedItem.expected_specs) {
          cpu = scannedItem.expected_specs.cpu || null;
          ram = scannedItem.expected_specs.ram || null;
          storage = scannedItem.expected_specs.storage || null;
        }
      }

      const assetData: any = {
        company_id: selectedCompany.id,
        purchase_order_id: manualMode ? null : selectedPO?.id,
        purchase_lot_id: manualMode ? null : selectedPO?.purchase_lot_id,
        serial_number: scannedItem.serial_number,
        brand: brand,
        model: model,
        product_type_id: product_type_id || null,
        cosmetic_grade: grade,
        po_unit_cost: unit_cost,
        purchase_price: unit_cost,
        status: 'In Stock',
        notes: notes || (manualMode ? 'Manual entry' : scannedItem.is_bonus ? 'Bonus item' : ''),
        received_date: new Date().toISOString().split('T')[0],
        received_by: user?.id,
        is_bonus_item: manualMode ? false : (scannedItem.is_bonus || false),
        cpu: cpu,
        ram: ram,
        storage: storage,
      };

      if (!manualMode && scannedItem.expected_specs) {
        assetData.screen_size = scannedItem.expected_specs.screen_size || null;

        // Filter out specs that belong in dedicated columns
        const otherSpecs: any = {};
        Object.keys(scannedItem.expected_specs).forEach(key => {
          const lowerKey = key.toLowerCase();
          // Skip specs that have dedicated columns
          if (!['cpu', 'ram', 'memory', 'storage', 'hdd', 'ssd', 'screen', 'screen_size'].includes(lowerKey)) {
            otherSpecs[key] = scannedItem.expected_specs[key];
          }
        });

        if (Object.keys(otherSpecs).length > 0) {
          assetData.other_specs = otherSpecs;
        }
      }

      if (!manualMode && !scannedItem.is_bonus) {
        assetData.receiving_log_id = receivingLog.id;
        assetData.expected_receiving_item_id = scannedItem.id;
      } else if (manualMode) {
        assetData.receiving_log_id = receivingLog.id;
      } else if (scannedItem.is_bonus) {
        assetData.receiving_log_id = receivingLog.id;
      }

      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .insert(assetData)
        .select()
        .single();

      if (assetError) throw assetError;

      if (scannedItem.is_bonus && !manualMode && selectedPO) {
        // Save bonus item to expected_receiving_items for tracking
        const { data: bonusItem } = await supabase
          .from('expected_receiving_items')
          .insert({
            company_id: selectedCompany.id,
            purchase_order_id: selectedPO.id,
            receiving_log_id: receivingLog.id,
            serial_number: scannedItem.serial_number,
            brand: brand,
            model: model,
            product_type_id: product_type_id,
            expected_specs: { cpu, ram, storage },
            unit_cost: unit_cost,
            status: 'received',
            is_bonus: true
          })
          .select()
          .single();

        if (bonusItem) {
          // Update asset with the bonus item reference
          await supabase
            .from('assets')
            .update({ expected_receiving_item_id: bonusItem.id })
            .eq('id', asset.id);

          // Add to expectedItems list
          setExpectedItems(prev => [...prev, bonusItem]);
        }
      }

      if (manualMode || scannedItem.is_bonus) {
        await supabase
          .from('receiving_logs')
          .update({
            total_bonus: manualMode ? (receivingLog.total_bonus || 0) : (receivingLog.total_bonus || 0) + 1,
            total_items_received: (receivingLog.total_items_received || 0) + 1,
          })
          .eq('id', receivingLog.id);
      } else {
        if (scannedItem.id) {
          await supabase
            .from('expected_receiving_items')
            .update({ status: 'received' })
            .eq('id', scannedItem.id);

          setExpectedItems(prev =>
            prev.map(item =>
              item.id === scannedItem.id ? { ...item, status: 'received' } : item
            )
          );
        }

        await supabase
          .from('receiving_logs')
          .update({
            total_items_received: (receivingLog.total_items_received || 0) + 1,
          })
          .eq('id', receivingLog.id);
      }

      setRecentScans([scannedItem, ...recentScans.slice(0, 4)]);
      setScannedItem(null);
      setManualItemData({
        brand: '',
        model: '',
        product_type_id: '',
        unit_cost: '',
        cpu: '',
        ram: '',
        storage: ''
      });
      showToast('Item received successfully', 'success');
      setTimeout(() => serialInputRef.current?.focus(), 100);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkReceiving = async (grade: string, notes: string) => {
    if (!bulkSerials.trim() || !receivingLog || !selectedCompany) return;

    setIsProcessing(true);

    try {
      const serialList = bulkSerials
        .split(/[\n,]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      if (serialList.length === 0) {
        showToast('No valid serials found', 'error');
        return;
      }

      showToast(`Processing ${serialList.length} items...`, 'info');

      const { data: existingAssets } = await supabase
        .from('assets')
        .select('serial_number')
        .eq('company_id', selectedCompany.id)
        .in('serial_number', serialList);

      const existingSerialsSet = new Set(
        (existingAssets || []).map(a => a.serial_number.toLowerCase())
      );

      const validSerials = serialList.filter(
        serial => !existingSerialsSet.has(serial.toLowerCase())
      );
      const duplicateCount = serialList.length - validSerials.length;

      if (validSerials.length === 0) {
        showToast('All serials are duplicates', 'warning');
        setIsProcessing(false);
        return;
      }

      const assetsToInsert: any[] = [];
      const expectedItemsMap = new Map(
        expectedItems.map(item => [item.serial_number.toLowerCase(), item])
      );
      const expectedIdsToUpdate: string[] = [];
      let bonusCount = 0;

      validSerials.forEach(serial => {
        const expectedItem = expectedItemsMap.get(serial.toLowerCase());
        const itemData = expectedItem || {
          serial_number: serial,
          brand: '',
          model: '',
          expected_specs: {},
          unit_cost: 0,
          is_bonus: true,
        };

        if (itemData.is_bonus) {
          bonusCount++;
        } else if (expectedItem?.id) {
          expectedIdsToUpdate.push(expectedItem.id);
        }

        const specs = itemData.expected_specs || {};

        // Extract dedicated columns for component tracking and display
        // Handle both "cpu" and "specifications.cpu" formats
        // Store ORIGINAL values (e.g., "2GB*8") - database trigger will parse and create components
        const cpu = specs.cpu || specs['specifications.cpu'] || null;
        const ram = specs.ram || specs['specifications.ram'] || null;
        const storage = specs.storage || specs['specifications.storage'] || null;
        const screen_size = specs.screen_size || specs['specifications.screen_size'] || null;

        // Remove the extracted keys from remaining specs
        const remainingSpecs = { ...specs };
        delete remainingSpecs.cpu;
        delete remainingSpecs['specifications.cpu'];
        delete remainingSpecs.ram;
        delete remainingSpecs['specifications.ram'];
        delete remainingSpecs.storage;
        delete remainingSpecs['specifications.storage'];
        delete remainingSpecs.screen_size;
        delete remainingSpecs['specifications.screen_size'];

        assetsToInsert.push({
          company_id: selectedCompany.id,
          purchase_order_id: selectedPO?.id,
          purchase_lot_id: selectedPO?.purchase_lot_id,
          receiving_log_id: receivingLog.id,
          serial_number: itemData.serial_number,
          brand: itemData.brand || '',
          model: itemData.model || '',
          product_type_id: itemData.product_type_id || null,
          cosmetic_grade: grade,
          cpu: cpu || null,
          ram: ram || null,
          storage: storage || null,
          screen_size: screen_size || null,
          other_specs: remainingSpecs,
          po_unit_cost: itemData.unit_cost || 0,
          purchase_price: itemData.unit_cost || 0,
          received_date: new Date().toISOString().split('T')[0],
          status: 'In Stock',
          notes: notes || null,
          is_bonus_item: itemData.is_bonus || false,
        });
      });

      const { error: insertError } = await supabase
        .from('assets')
        .insert(assetsToInsert);

      if (insertError) {
        throw new Error(`Failed to insert assets: ${insertError.message}`);
      }

      if (expectedIdsToUpdate.length > 0) {
        await supabase
          .from('expected_receiving_items')
          .update({ status: 'received' })
          .in('id', expectedIdsToUpdate);

        setExpectedItems(prev =>
          prev.map(item =>
            expectedIdsToUpdate.includes(item.id || '')
              ? { ...item, status: 'received' }
              : item
          )
        );
      }

      await supabase
        .from('receiving_logs')
        .update({
          total_items_received: (receivingLog.total_items_received || 0) + validSerials.length,
          total_bonus: (receivingLog.total_bonus || 0) + bonusCount,
        })
        .eq('id', receivingLog.id);

      let message = `Successfully received ${validSerials.length} items`;
      if (duplicateCount > 0) message += `, ${duplicateCount} duplicates skipped`;

      showToast(message, 'success');
      setBulkSerials('');
      setBulkMode(false);

      const { data: updatedLog } = await supabase
        .from('receiving_logs')
        .select('*')
        .eq('id', receivingLog.id)
        .single();

      if (updatedLog) {
        setReceivingLog(updatedLog);
      }

      const { data: refreshedItems } = await supabase
        .from('expected_receiving_items')
        .select('*')
        .eq('receiving_log_id', receivingLog.id);

      if (refreshedItems) {
        setExpectedItems(refreshedItems);
      }

      setTimeout(() => serialInputRef.current?.focus(), 100);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const completeReceiving = async () => {
    if (!receivingLog) return;

    try {
      await supabase
        .from('receiving_logs')
        .update({ status: 'completed' })
        .eq('id', receivingLog.id);

      showToast('Receiving completed successfully', 'success');
      setStep('complete');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Receiving</h1>
          <p className="text-gray-600 mt-1">Scan-based receiving with packing list validation</p>
        </div>
        {step === 'scan_items' && (
          <button
            onClick={async () => {
              if (confirm('Are you sure you want to cancel this receiving session? This will permanently end the session and cannot be resumed.')) {
                if (receivingLog?.id) {
                  try {
                    await supabase
                      .from('receiving_logs')
                      .update({ status: 'cancelled' })
                      .eq('id', receivingLog.id);
                    showToast('Receiving session cancelled', 'success');
                  } catch (error) {
                    console.error('Error cancelling session:', error);
                    showToast('Error cancelling session', 'error');
                  }
                }
                setStep('select_po');
                setSelectedPO(null);
                setExpectedItems([]);
                setReceivingLog(null);
                setRecentScans([]);
                setManualMode(false);
                loadPurchaseOrders();
              }
            }}
            className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
          >
            Cancel Session
          </button>
        )}
      </div>

      {step === 'select_po' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Select Purchase Order</h2>
              <button
                onClick={startManualReceiving}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Scan className="w-4 h-4" />
                Manual Entry (No PO)
              </button>
            </div>

            {purchaseOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No purchase orders available for receiving</p>
                <p className="text-sm text-gray-500">Use "Manual Entry" to receive items without a PO</p>
              </div>
            ) : (
              <div className="space-y-3">
                {purchaseOrders.map(po => (
                  <div
                    key={po.id}
                    onClick={() => selectPO(po)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{po.po_number}</p>
                          {po.lot_number && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              LOT-{po.lot_number}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{po.suppliers?.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {po.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {po.shipments_received} shipments received
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {step === 'map_columns' && parsedData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Map Columns</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Match supplier columns to system fields
                </p>
              </div>
              <button
                onClick={() => setStep('select_po')}
                className="text-gray-600 hover:text-gray-900"
              >
                Back
              </button>
            </div>

            {selectedPO?.source_file_name && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900">
                  <strong>✓ Auto-loaded from PO:</strong> {selectedPO.source_file_name}
                  <br />
                  <span className="text-xs text-green-700">
                    Using the same file uploaded during PO creation. Review mappings and adjust if needed.
                  </span>
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Found {parsedData.headers.length} columns</strong> in your file.
                Map them to system fields below. Auto-suggestions are already applied.
              </p>
              {selectedPO?.exchange_rate && selectedPO.exchange_rate !== 1.0 && (
                <p className="text-sm text-blue-900 mt-2">
                  <strong>PO Currency:</strong> {selectedPO.source_currency || 'Source'} → AED (Rate: {selectedPO.exchange_rate})
                  <br />
                  <span className="text-xs text-blue-700">Unit costs will be matched from PO lines (already in AED)</span>
                </p>
              )}
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {mappings.map((mapping, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-1">{mapping.supplierColumn}</p>
                    {mapping.sampleValues.length > 0 && (
                      <p className="text-xs text-gray-500">
                        Examples: {mapping.sampleValues.join(', ')}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 mt-2" />
                  <div className="flex-1">
                    <select
                      value={mapping.systemField}
                      onChange={(e) => updateMapping(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {systemFields.map(field => {
                        const isAlreadyMapped = field.value !== '' &&
                          mappings.some((m, mIdx) => mIdx !== index && m.systemField === field.value);
                        return (
                          <option
                            key={field.value}
                            value={field.value}
                            disabled={isAlreadyMapped}
                          >
                            {field.label}{isAlreadyMapped ? ' (Already mapped)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id="saveTemplate"
                  checked={saveTemplate}
                  onChange={(e) => setSaveTemplate(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="saveTemplate" className="text-sm text-gray-700">
                  Save as template for future use
                </label>
                {saveTemplate && (
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Enter template name..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <button
                onClick={() => setStep('select_po')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Back
              </button>
              <button
                onClick={importExpectedItems}
                disabled={isProcessing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isProcessing ? 'Importing...' : 'Start Receiving'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'scan_items' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Scan Items</h2>
                <div className="flex gap-2">
                  <label className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Add Missing Columns
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleAppendFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => {
                      setBulkMode(!bulkMode);
                      setScannedItem(null);
                      setCurrentSerial('');
                      setBulkSerials('');
                    }}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {bulkMode ? 'Single Mode' : 'Bulk Mode'}
                  </button>
                </div>
              </div>

              {!bulkMode ? (
                <>
                  <form onSubmit={handleSerialScan} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Serial Number
                      </label>
                      <input
                        ref={serialInputRef}
                        type="text"
                        value={currentSerial}
                        onChange={(e) => setCurrentSerial(e.target.value)}
                        placeholder="Scan or type serial number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg"
                        disabled={isProcessing}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isProcessing || !currentSerial.trim()}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing...' : 'Scan Item'}
                    </button>
                  </form>

                  {scannedItem && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">
                    {manualMode ? 'Manual Entry' : scannedItem.is_bonus ? 'Bonus Item (Not in list)' : 'Item Details'}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Serial Number
                      </label>
                      <input
                        type="text"
                        value={scannedItem.serial_number}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    {(manualMode || scannedItem.is_bonus) ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Brand *
                          </label>
                          <input
                            id="manual-brand"
                            type="text"
                            value={manualItemData.brand}
                            onChange={(e) => setManualItemData({...manualItemData, brand: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="e.g., Dell, HP, Lenovo"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Model *
                          </label>
                          <input
                            id="manual-model"
                            type="text"
                            value={manualItemData.model}
                            onChange={(e) => setManualItemData({...manualItemData, model: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="e.g., Latitude 7490, EliteBook 840 G5"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Type *
                          </label>
                          <select
                            id="manual-product-type"
                            value={manualItemData.product_type_id}
                            onChange={(e) => setManualItemData({...manualItemData, product_type_id: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="">Select Product Type</option>
                            {productTypes.map(type => (
                              <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              CPU
                            </label>
                            <input
                              type="text"
                              value={manualItemData.cpu}
                              onChange={(e) => setManualItemData({...manualItemData, cpu: e.target.value})}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              placeholder="i5-8350U"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              RAM
                            </label>
                            <input
                              type="text"
                              value={manualItemData.ram}
                              onChange={(e) => setManualItemData({...manualItemData, ram: e.target.value})}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              placeholder="8GB"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Storage
                            </label>
                            <input
                              type="text"
                              value={manualItemData.storage}
                              onChange={(e) => setManualItemData({...manualItemData, storage: e.target.value})}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              placeholder="256GB SSD"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Cost
                          </label>
                          <input
                            id="manual-cost"
                            type="number"
                            step="0.01"
                            value={manualItemData.unit_cost}
                            onChange={(e) => setManualItemData({...manualItemData, unit_cost: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="0.00"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <p><strong>Brand:</strong> {scannedItem.brand || 'N/A'}</p>
                        <p><strong>Model:</strong> {scannedItem.model || 'N/A'}</p>
                        <p><strong>Expected Grade:</strong> {scannedItem.expected_grade || 'N/A'}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grade
                      </label>
                      <select
                        id="actual-grade"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="A">Grade A</option>
                        <option value="B">Grade B</option>
                        <option value="C">Grade C</option>
                        <option value="D">Grade D</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        id="item-notes"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setScannedItem(null);
                          setManualItemData({
                            brand: '',
                            model: '',
                            product_type_id: '',
                            unit_cost: '',
                            cpu: '',
                            ram: '',
                            storage: ''
                          });
                          setCurrentSerial('');
                          setTimeout(() => serialInputRef.current?.focus(), 100);
                        }}
                        disabled={isProcessing}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const grade = (document.getElementById('actual-grade') as HTMLSelectElement)?.value;
                          const notes = (document.getElementById('item-notes') as HTMLTextAreaElement)?.value;
                          acceptItem(grade, notes);
                        }}
                        disabled={isProcessing || (manualMode && (!manualItemData.brand || !manualItemData.model || !manualItemData.product_type_id))}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        Accept & Continue
                      </button>
                    </div>
                  </div>
                </div>
              )}
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Serial Numbers (one per line or comma-separated)
                    </label>
                    <textarea
                      value={bulkSerials}
                      onChange={(e) => setBulkSerials(e.target.value)}
                      placeholder="Paste or enter multiple serial numbers&#10;Example:&#10;ABC123&#10;DEF456&#10;GHI789"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-mono"
                      rows={8}
                      disabled={isProcessing}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {bulkSerials.split(/[\n,]/).filter(s => s.trim()).length} serials entered
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grade (applies to all items)
                    </label>
                    <select
                      id="bulk-grade"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="A">Grade A</option>
                      <option value="B">Grade B</option>
                      <option value="C">Grade C</option>
                      <option value="D">Grade D</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      id="bulk-notes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                      placeholder="Notes for all items (optional)"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const grade = (document.getElementById('bulk-grade') as HTMLSelectElement)?.value;
                      const notes = (document.getElementById('bulk-notes') as HTMLTextAreaElement)?.value;
                      handleBulkReceiving(grade, notes);
                    }}
                    disabled={isProcessing || !bulkSerials.trim()}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Receive All Items'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={completeReceiving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Complete Receiving
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Receiving Session</h3>
              {selectedPO && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">PO:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedPO.po_number}</span>
                    </div>
                    {selectedPO.lot_number && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Lot:</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          LOT-{selectedPO.lot_number}
                        </span>
                      </div>
                    )}
                    <div className="text-sm text-gray-600">
                      {selectedPO.suppliers?.name}
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Expected</span>
                    <span className="font-medium">{expectedItems.length}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Received</span>
                    <span className="font-medium text-green-600">
                      {expectedItems.filter(i => i.status === 'received').length}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Remaining</span>
                    <span className="font-medium text-orange-600">
                      {expectedItems.filter(i => i.status === 'awaiting').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {recentScans.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Recent Scans</h3>
                <div className="space-y-2">
                  {recentScans.map((item, i) => (
                    <div key={i} className="text-sm p-2 bg-green-50 rounded">
                      <p className="font-medium text-gray-900">{item.serial_number}</p>
                      <p className="text-gray-600">{item.brand} {item.model}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'append_columns' && appendParsedData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Append Missing Columns</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Map columns to update existing items by Serial Number
                </p>
              </div>
              <button
                onClick={() => {
                  setStep('scan_items');
                  setAppendParsedData(null);
                  setAppendMappings([]);
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900">
                <strong>Important:</strong> Serial Number column is <strong className="text-red-600">REQUIRED</strong> to match existing items.
                Only map the columns you want to add or update. Skip columns already imported.
              </p>
              {selectedPO?.exchange_rate && selectedPO.exchange_rate !== 1.0 && (
                <p className="text-sm text-amber-900 mt-2">
                  <strong>PO Currency:</strong> {selectedPO.source_currency || 'Source'} → AED (Rate: {selectedPO.exchange_rate})
                  <br />
                  <span className="text-xs text-amber-700">Costs from packing list will be used as-is (assumed to be in AED already)</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {appendMappings.filter(m => m.systemField && m.systemField !== '').length} columns mapped
                  {' • '}
                  {appendMappings.filter(m => !m.systemField || m.systemField === '').length} skipped
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAppendMappings(prev => prev.map(m => ({
                      ...m,
                      systemField: ''
                    })));
                  }}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Skip All (except Serial)
                </button>
                <button
                  onClick={() => {
                    const autoMapped = appendMappings.map(m => ({
                      ...m,
                      systemField: autoSuggestMapping(m.supplierColumn)
                    }));
                    setAppendMappings(autoMapped);
                  }}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Auto-Map All
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {appendMappings.map((mapping, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-1">{mapping.supplierColumn}</p>
                    {mapping.sampleValues.length > 0 && (
                      <p className="text-xs text-gray-500">
                        Examples: {mapping.sampleValues.join(', ')}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 mt-2" />
                  <div className="flex-1">
                    <select
                      value={mapping.systemField}
                      onChange={(e) => updateAppendMapping(index, e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        mapping.systemField === 'serial_number'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300'
                      }`}
                    >
                      {systemFields.map(field => {
                        const isAlreadyMapped = field.value !== '' &&
                          appendMappings.some((m, mIdx) => mIdx !== index && m.systemField === field.value);
                        return (
                          <option
                            key={field.value}
                            value={field.value}
                            disabled={isAlreadyMapped}
                          >
                            {field.label}{isAlreadyMapped ? ' (Already mapped)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {mapping.systemField === 'serial_number' && (
                      <p className="text-xs text-green-600 mt-1 font-medium">✓ Required field mapped</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Preview: Fields to Update</h3>
                <div className="flex flex-wrap gap-2">
                  {appendMappings.filter(m => m.systemField && m.systemField !== '').map((m, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                        m.systemField === 'serial_number'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {systemFields.find(f => f.value === m.systemField)?.label || m.systemField}
                    </span>
                  ))}
                  {appendMappings.filter(m => m.systemField && m.systemField !== '').length === 0 && (
                    <p className="text-sm text-gray-500 italic">No fields selected for update</p>
                  )}
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  {appendParsedData.rows.length} rows will be processed
                </p>
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <button
                onClick={() => {
                  setStep('scan_items');
                  setAppendParsedData(null);
                  setAppendMappings([]);
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <div className="flex flex-col items-end gap-1">
                {!appendMappings.some(m => m.systemField === 'serial_number') && (
                  <p className="text-xs text-red-600 font-medium">⚠ Serial Number must be mapped</p>
                )}
                <button
                  onClick={appendColumnsToItems}
                  disabled={isProcessing || !appendMappings.some(m => m.systemField === 'serial_number')}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Updating...' : 'Update Items'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Receiving Complete!</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-gray-600">
                        PO: {selectedPO?.po_number}
                      </p>
                      {selectedPO?.lot_number && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          LOT-{selectedPO.lot_number}
                        </span>
                      )}
                      <span className="text-gray-600">- {selectedPO?.suppliers?.name}</span>
                    </div>
                  </div>
                </div>
              </div>
              <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Add Missing Columns
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleAppendFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-medium">Expected</p>
                <p className="text-2xl font-bold text-blue-900">{receivingLog?.total_items_expected || 0}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium">Received</p>
                <p className="text-2xl font-bold text-green-900">{expectedItems.filter(i => i.status === 'received').length}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-600 font-medium">Bonus</p>
                <p className="text-2xl font-bold text-purple-900">{receivingLog?.total_bonus || 0}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm text-orange-600 font-medium">Missing</p>
                <p className="text-2xl font-bold text-orange-900">{receivingLog?.total_missing || 0}</p>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={async () => {
                  if (receivingLog?.id) {
                    try {
                      await supabase
                        .from('receiving_logs')
                        .update({ status: 'completed', completed_at: new Date().toISOString() })
                        .eq('id', receivingLog.id);
                    } catch (error) {
                      console.error('Error completing session:', error);
                    }
                  }
                  setStep('select_po');
                  setSelectedPO(null);
                  setExpectedItems([]);
                  setReceivingLog(null);
                  setRecentScans([]);
                  setManualMode(false);
                  loadPurchaseOrders();
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start New Receiving
              </button>
              <button
                onClick={async () => {
                  if (receivingLog?.id) {
                    try {
                      await supabase
                        .from('receiving_logs')
                        .update({ status: 'completed', completed_at: new Date().toISOString() })
                        .eq('id', receivingLog.id);
                    } catch (error) {
                      console.error('Error completing session:', error);
                    }
                  }
                  if (selectedPO) {
                    selectPO(selectedPO, true);
                  }
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Re-Receive Same PO
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Received Items Summary</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {expectedItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.serial_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.brand || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.model || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{(item.product_types as any)?.name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          item.status === 'received' ? 'bg-green-100 text-green-800' :
                          item.status === 'missing' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {pendingProductType && (
        <SmartAutoCreateModal
          entityType="product_type"
          entityName={pendingProductType}
          existingEntities={existingProductTypes}
          onCreateNew={handleCreateProductType}
          onLinkExisting={handleLinkProductType}
          onSkip={handleSkipProductType}
        />
      )}

      {showSheetSelector && (
        <ExcelSheetSelector
          sheets={availableSheets}
          onSelectSheet={handleSheetSelection}
          onCancel={handleCancelSheetSelection}
        />
      )}
    </div>
  );
}
