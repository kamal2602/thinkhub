import { useState, useEffect, useMemo } from 'react';
import { Upload, X, ArrowRight, Save, RefreshCw, Plus, AlertTriangle, Lock, Edit2, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { createImportIntelligenceService, ImportIntelligenceService } from '../../lib/importIntelligence';
import { parseExcelFile, SheetInfo } from '../../lib/excelParser';
import { ExcelSheetSelector } from '../common/ExcelSheetSelector';
import { isPassthroughSpec } from '../../lib/passthroughFields';
import { EntityNormalizationService, EntityGroup, NormalizationDecision, NormalizedMapping } from '../../lib/entityNormalization';
import EntityNormalizationModal from '../common/EntityNormalizationModal';
import { CANONICAL_FIELDS, CORE_FIELDS, SPEC_FIELDS, type CanonicalField } from '../../lib/canonicalFields';

interface SmartPOImportProps {
  supplierId?: string;
  onClose: () => void;
  onImport: (
    items: any[],
    currencyData?: { sourceCurrency: string; exchangeRate: number },
    fileData?: { fileName: string; parsedData: ParsedData; mappings: ColumnMapping[] }
  ) => void;
}

interface ColumnMapping {
  supplierColumn: string;
  systemField: string;
  sampleValues: string[];
  aliases?: string;
  showAddField?: boolean;
}

interface ParsedData {
  headers: string[];
  rows: string[][];
  sampleData: Record<string, string[]>;
}


const CURRENCIES = [
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
];

export function SmartPOImport({ supplierId, onClose, onImport }: SmartPOImportProps) {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();

  const [step, setStep] = useState<'upload' | 'map' | 'normalize' | 'preview'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sourceCurrency, setSourceCurrency] = useState('AED');
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [systemFields, setSystemFields] = useState<Array<{value: string; label: string}>>([{ value: '', label: '-- Skip This Column --' }]);
  const [autoMapRules, setAutoMapRules] = useState<Record<string, string[]>>({});
  const [intelligenceService, setIntelligenceService] = useState<ImportIntelligenceService | null>(null);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldData, setNewFieldData] = useState({
    fieldName: '',
    fieldLabel: '',
    fieldType: 'specification',
    keywords: '',
    isLocked: false
  });
  const [selectedTemplate, setSelectedTemplate] = useState<CanonicalField | null>(null);
  const [currentMappingIndex, setCurrentMappingIndex] = useState<number | null>(null);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [existingFieldNames, setExistingFieldNames] = useState<Set<string>>(new Set());
  const [availableSheets, setAvailableSheets] = useState<SheetInfo[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [showNormalizationModal, setShowNormalizationModal] = useState(false);
  const [entityGroups, setEntityGroups] = useState<EntityGroup[]>([]);
  const [normalizationMappings, setNormalizationMappings] = useState<NormalizedMapping[]>([]);
  const [autoNormalizationCount, setAutoNormalizationCount] = useState(0);
  const [mappedFields, setMappedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedCompany) {
      initializeIntelligence();
    }
  }, [selectedCompany]);

  const initializeIntelligence = async () => {
    if (!selectedCompany?.id) return;

    await loadCustomFields();

    try {
      const service = await createImportIntelligenceService(selectedCompany.id);
      setIntelligenceService(service);
    } catch (error) {
      console.error('Error initializing import intelligence:', error);
    }
  };

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
      const fieldNames = new Set<string>();
      data.forEach(field => {
        if (field.auto_map_keywords && Array.isArray(field.auto_map_keywords)) {
          customRules[field.field_name] = field.auto_map_keywords;
        }
        fieldNames.add(field.field_name);
      });
      setAutoMapRules(customRules);
      setExistingFieldNames(fieldNames);
    } else {
      console.warn('No import field mappings found. Please configure fields in Settings > Import Intelligence.');
      setSystemFields([{ value: '', label: '-- Skip This Column --' }]);
      setAutoMapRules({});
      setExistingFieldNames(new Set());
    }
  };

  const handleSaveAliases = async () => {
    if (!selectedCompany?.id) return;

    try {
      // Filter mappings that have aliases
      const mappingsWithAliases = mappings.filter(
        m => m.aliases && m.aliases.trim() && m.systemField
      );

      if (mappingsWithAliases.length === 0) return;

      // Process all mappings in parallel
      await Promise.all(
        mappingsWithAliases.map(async (mapping) => {
          const aliases = mapping.aliases!.split(',').map(k => k.trim()).filter(k => k);
          if (aliases.length === 0) return;

          const { data: existingMapping } = await supabase
            .from('import_field_mappings')
            .select('id, auto_map_keywords')
            .eq('company_id', selectedCompany.id)
            .eq('field_name', mapping.systemField)
            .maybeSingle();

          if (existingMapping) {
            const currentKeywords = existingMapping.auto_map_keywords || [];
            const newKeywords = [...new Set([...currentKeywords, ...aliases])];

            await supabase
              .from('import_field_mappings')
              .update({ auto_map_keywords: newKeywords })
              .eq('id', existingMapping.id);
          }
        })
      );
    } catch (error: any) {
      console.error('Error saving aliases:', error);
    }
  };

  const handleAddCustomField = async () => {
    if (!newFieldData.fieldName || !newFieldData.fieldLabel) {
      showToast('Field name and label are required', 'error');
      return;
    }

    try {
      // Determine final field name - add "specifications." prefix only if not already present
      let fieldNameValue = newFieldData.fieldName.trim();
      if (newFieldData.fieldType === 'specification' && !fieldNameValue.startsWith('specifications.')) {
        fieldNameValue = `specifications.${fieldNameValue}`;
      }

      // Check if field already exists
      if (existingFieldNames.has(fieldNameValue)) {
        showToast(`Field "${fieldNameValue}" already exists. Please choose a different field name.`, 'error');
        return;
      }

      const keywords = newFieldData.keywords
        ? newFieldData.keywords.split(',').map(k => k.trim()).filter(k => k)
        : [];

      console.log('Inserting field with type:', newFieldData.fieldType);
      console.log('Full data:', {
        company_id: selectedCompany?.id,
        field_name: fieldNameValue,
        field_label: newFieldData.fieldLabel,
        field_type: newFieldData.fieldType,
        auto_map_keywords: keywords.length > 0 ? keywords : null,
        is_active: true
      });

      const { error } = await supabase
        .from('import_field_mappings')
        .insert({
          company_id: selectedCompany?.id,
          field_name: fieldNameValue,
          field_label: newFieldData.fieldLabel,
          field_type: newFieldData.fieldType,
          auto_map_keywords: keywords.length > 0 ? keywords : null,
          is_active: true
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      showToast('Custom field added successfully', 'success');

      await loadCustomFields();

      if (currentMappingIndex !== null) {
        const updated = [...mappings];
        updated[currentMappingIndex].systemField = fieldNameValue;
        setMappings(updated);

        // Update mappedFields to include the newly created and assigned field
        const newMappedFields = new Set<string>();
        updated.forEach(m => {
          if (m.systemField) {
            newMappedFields.add(m.systemField);
          }
        });
        setMappedFields(newMappedFields);

        setCurrentMappingIndex(null);
      }

      setShowAddFieldModal(false);
      setSelectedTemplate(null);
      setNewFieldData({
        fieldName: '',
        fieldLabel: '',
        fieldType: 'specification',
        keywords: '',
        isLocked: false
      });
    } catch (error: any) {
      showToast('Error adding custom field: ' + error.message, 'error');
    }
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

  const autoSuggestMapping = (columnName: string): string => {
    if (intelligenceService) {
      const suggestion = intelligenceService.suggestColumnMapping(columnName);
      if (suggestion.confidence > 0.5) {
        return suggestion.suggestedField;
      }
    }

    const normalized = columnName.toLowerCase().trim();
    let bestMatch: { field: string; matchLength: number } | null = null;

    for (const [field, keywords] of Object.entries(autoMapRules)) {
      for (const keyword of keywords) {
        if (normalized.includes(keyword)) {
          if (!bestMatch || keyword.length > bestMatch.matchLength) {
            bestMatch = { field, matchLength: keyword.length };
          }
        }
      }
    }

    return bestMatch ? bestMatch.field : '';
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(csv|xlsx|xls)$/i)) {
      showToast('Please upload a CSV or Excel file', 'error');
      return;
    }

    setLoading(true);
    setFile(selectedFile);

    try {
      let headers: string[];
      let allRows: string[][];
      let totalRows: number;

      if (selectedFile.name.match(/\.(xlsx|xls)$/i)) {
        const result = await parseExcelFile(selectedFile);

        if (result.hasMultipleSheets && result.sheets) {
          setAvailableSheets(result.sheets);
          setCurrentFile(selectedFile);
          setShowSheetSelector(true);
          setLoading(false);
          return;
        }

        headers = result.headers;
        allRows = result.rows;
        totalRows = result.totalRows;
      } else {
        const text = await selectedFile.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim());

        if (lines.length < 2) {
          showToast('File is empty or has no data rows', 'error');
          setLoading(false);
          return;
        }

        headers = parseCSVLine(lines[0]);
        allRows = lines.slice(1).map(line => parseCSVLine(line));
        totalRows = allRows.length;
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

      setParsedData({ headers, rows: allRows, sampleData });

      const suggestedFields = headers.map(header => ({
        header,
        systemField: autoSuggestMapping(header)
      }));

      const uniqueFields = [...new Set(suggestedFields.map(s => s.systemField).filter(Boolean))];

      let aliasesMap: Record<string, string> = {};
      if (uniqueFields.length > 0 && selectedCompany?.id) {
        const { data } = await supabase
          .from('import_field_mappings')
          .select('field_name, auto_map_keywords')
          .eq('company_id', selectedCompany.id)
          .in('field_name', uniqueFields);

        if (data) {
          data.forEach(field => {
            if (field.auto_map_keywords && Array.isArray(field.auto_map_keywords)) {
              aliasesMap[field.field_name] = field.auto_map_keywords.join(', ');
            }
          });
        }
      }

      const initialMappings: ColumnMapping[] = suggestedFields.map(({ header, systemField }) => ({
        supplierColumn: header,
        systemField: systemField,
        sampleValues: sampleData[header].slice(0, 3),
        aliases: systemField ? (aliasesMap[systemField] || '') : '',
      }));

      setMappings(initialMappings);

      const initialMappedFields = new Set<string>();
      initialMappings.forEach(m => {
        if (m.systemField) {
          initialMappedFields.add(m.systemField);
        }
      });
      setMappedFields(initialMappedFields);

      setStep('map');
      showToast(`Parsed ${totalRows} rows from file`, 'success');
    } catch (error: any) {
      showToast(`Error parsing file: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = async (index: number, systemField: string) => {
    const updated = [...mappings];
    updated[index].systemField = systemField;

    if (systemField && selectedCompany?.id) {
      const { data } = await supabase
        .from('import_field_mappings')
        .select('auto_map_keywords')
        .eq('company_id', selectedCompany.id)
        .eq('field_name', systemField)
        .maybeSingle();

      if (data?.auto_map_keywords && Array.isArray(data.auto_map_keywords)) {
        updated[index].aliases = data.auto_map_keywords.join(', ');
      } else {
        updated[index].aliases = '';
      }
    } else {
      updated[index].aliases = '';
    }

    setMappings(updated);

    const newMappedFields = new Set<string>();
    updated.forEach(m => {
      if (m.systemField) {
        newMappedFields.add(m.systemField);
      }
    });
    setMappedFields(newMappedFields);
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
          supplier_id: supplierId || null,
          template_name: templateName,
          mapping_config: config,
        });

      if (error) throw error;
      showToast('Template saved successfully', 'success');
    } catch (error: any) {
      showToast(`Error saving template: ${error.message}`, 'error');
    }
  };

  const handleSheetSelection = async (sheetName: string) => {
    if (!currentFile) return;

    setShowSheetSelector(false);
    setLoading(true);
    setFile(currentFile);

    try {
      const result = await parseExcelFile(currentFile, sheetName);
      const headers = result.headers;
      const allRows = result.rows;
      const totalRows = result.totalRows;

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

      setParsedData({ headers, rows: allRows, sampleData });

      const suggestedFields = headers.map(header => ({
        header,
        systemField: autoSuggestMapping(header)
      }));

      const uniqueFields = [...new Set(suggestedFields.map(s => s.systemField).filter(Boolean))];

      let aliasesMap: Record<string, string> = {};
      if (uniqueFields.length > 0 && selectedCompany?.id) {
        const { data } = await supabase
          .from('import_field_mappings')
          .select('field_name, auto_map_keywords')
          .eq('company_id', selectedCompany.id)
          .in('field_name', uniqueFields);

        if (data) {
          data.forEach(field => {
            if (field.auto_map_keywords && Array.isArray(field.auto_map_keywords)) {
              aliasesMap[field.field_name] = field.auto_map_keywords.join(', ');
            }
          });
        }
      }

      const initialMappings: ColumnMapping[] = suggestedFields.map(({ header, systemField }) => ({
        supplierColumn: header,
        systemField: systemField,
        sampleValues: sampleData[header].slice(0, 3),
        aliases: systemField ? (aliasesMap[systemField] || '') : '',
      }));

      setMappings(initialMappings);

      const initialMappedFields = new Set<string>();
      initialMappings.forEach(m => {
        if (m.systemField) {
          initialMappedFields.add(m.systemField);
        }
      });
      setMappedFields(initialMappedFields);

      setStep('map');
      showToast(`Loaded sheet "${sheetName}" with ${totalRows} rows`, 'success');
    } catch (error: any) {
      showToast(`Error parsing sheet: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSheetSelection = () => {
    setShowSheetSelector(false);
    setAvailableSheets([]);
    setCurrentFile(null);
  };

  const handleProceedToNormalization = async () => {
    if (!parsedData || !selectedCompany) return;

    setLoading(true);

    try {
      const service = new EntityNormalizationService(selectedCompany.id);
      const fieldsToNormalize = ['product_type', 'supplier', 'brand', 'model', 'specifications.cpu'];
      const groups: EntityGroup[] = [];
      const autoMappings: NormalizedMapping[] = [];
      let autoCount = 0;

      const mappedRows = parsedData.rows.map((row) => {
        const item: any = {};
        mappings.forEach((mapping, index) => {
          if (mapping.systemField && row[index]) {
            item[mapping.systemField] = String(row[index]).trim();
          }
        });
        return item;
      });
      console.log('[CPU DEBUG] Sample mappedRows[0]:', mappedRows[0]);

      for (const field of fieldsToNormalize) {
        const hasField = mappings.some(m => m.systemField === field);
        console.log(`[CPU DEBUG] Field: ${field}, hasField: ${hasField}`);
        if (!hasField) continue;

        const uniqueValues = new Set<string>();
        mappedRows.forEach(row => {
          if (row[field]) uniqueValues.add(String(row[field]));
        });
        console.log(`[CPU DEBUG] Field: ${field}, uniqueValues:`, Array.from(uniqueValues));

        if (uniqueValues.size === 0) continue;

        const autoResolved: string[] = [];
        const needsDecision: string[] = [];

        // Batch process all values in parallel for speed
        const results = await Promise.all(
          Array.from(uniqueValues).map(value =>
            service.checkAutoNormalization(field, value).then(result => ({ value, result }))
          )
        );

        for (const { value, result } of results) {
          if (result.autoApplied) {
            autoMappings.push({
              field,
              originalValue: value,
              resolvedValue: result.resolvedValue,
              resolvedId: result.resolvedId,
            });
            autoResolved.push(value);
            autoCount++;
          } else {
            needsDecision.push(value);
          }
        }

        if (needsDecision.length > 0) {
          // Special handling for model-like fields - create separate groups for each value
          if (field === 'model') {
            const modelGroups = service.analyzeModelField(
              mappedRows.filter(row => needsDecision.includes(row[field]))
            );
            for (const modelGroup of modelGroups) {
              const matches = await service.checkExistingEntities(field, modelGroup.variants);
              groups.push({ ...modelGroup, existingMatches: matches });
            }
          } else if (field === 'specifications.cpu') {
            const cpuGroups = service.analyzeCPUField(
              mappedRows.filter(row => needsDecision.includes(row[field]))
            );
            for (const cpuGroup of cpuGroups) {
              const matches = await service.checkExistingEntities(field, cpuGroup.variants);
              groups.push({ ...cpuGroup, existingMatches: matches });
            }
          } else {
            const group = service.analyzeEntityField(field,
              mappedRows.filter(row => needsDecision.includes(row[field]))
            );
            if (group) {
              const matches = await service.checkExistingEntities(field, group.variants);
              groups.push({ ...group, existingMatches: matches });
            }
          }
        }
      }

      setNormalizationMappings(autoMappings);
      setAutoNormalizationCount(autoCount);

      if (groups.length > 0) {
        setEntityGroups(groups);
        setShowNormalizationModal(true);
      } else {
        setStep('preview');
      }
    } catch (error) {
      console.error('Error during normalization:', error);
      showToast('Error analyzing entities', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNormalizationComplete = async (decisions: NormalizationDecision[]) => {
    if (!selectedCompany) return;

    setLoading(true);
    setShowNormalizationModal(false);

    try {
      const service = new EntityNormalizationService(selectedCompany.id);

      // Process all decisions in parallel for speed
      const results = await Promise.all(
        decisions.map(decision => service.applyNormalizationDecision(decision))
      );

      const newMappings = results.flat();

      setNormalizationMappings(prev => [...prev, ...newMappings]);
      showToast(`Normalized ${newMappings.length + autoNormalizationCount} entities`, 'success');
      setStep('preview');
    } catch (error) {
      console.error('Error applying normalization:', error);
      showToast('Error normalizing entities', 'error');
    } finally {
      setLoading(false);
    }
  };

  const processImport = async () => {
    if (!parsedData) return;

    await handleSaveAliases();

    // Validate exchange rate
    if (exchangeRate <= 0) {
      showToast('Invalid exchange rate. Please enter a rate greater than 0', 'error');
      return;
    }

    const items: any[] = [];

    parsedData.rows.forEach((row, i) => {
      // Skip completely empty rows
      const hasData = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
      if (!hasData) {
        return;
      }

      const item: any = {
        line_number: i + 1,
        specifications: {},
        quantity_ordered: 1,
      };

      mappings.forEach((mapping, index) => {
        const cellValue = row[index];

        if (mapping.systemField && cellValue !== undefined && cellValue !== null) {
          let value = String(cellValue).trim();

          if (!value) {
            return;
          }

          const normalizedMapping = normalizationMappings.find(
            m => m.field === mapping.systemField && m.originalValue === value
          );
          if (normalizedMapping) {
            value = normalizedMapping.resolvedValue;
            if (normalizedMapping.resolvedId) {
              item[`${mapping.systemField}_id`] = normalizedMapping.resolvedId;
            }
          }

          if (mapping.systemField.startsWith('specifications.')) {
            const specKey = mapping.systemField.replace('specifications.', '').toLowerCase();

            if (isPassthroughSpec(specKey)) {
              item.specifications[specKey] = cellValue;
            } else {
              item.specifications[specKey] = value;
            }
          } else {
            if (mapping.systemField === 'quantity_ordered') {
              const qty = parseInt(value);
              if (!isNaN(qty)) {
                item[mapping.systemField] = qty;
              }
            } else if (mapping.systemField === 'unit_cost') {
              // Remove currency symbols, commas, spaces, and other non-numeric chars except decimal point
              let cleanValue = value
                .replace(/[$,¥€£₹\s]/g, '')
                .replace(/[^\d.-]/g, '');

              // Handle European number format (comma as decimal separator)
              if (cleanValue.includes(',') && !cleanValue.includes('.')) {
                cleanValue = cleanValue.replace(',', '.');
              }

              const cost = parseFloat(cleanValue);
              const convertedCost = cost * exchangeRate;

              if (!isNaN(cost) && cost > 0) {
                item.unit_cost_source = Math.round(cost * 100) / 100;
                item.unit_cost = Math.round(convertedCost * 100) / 100;
              }
            } else {
              item[mapping.systemField] = value;
            }
          }
        }
      });

      const hasValidCost = item.unit_cost !== undefined && item.unit_cost > 0;
      const hasValidBrand = item.brand !== undefined && item.brand.trim() !== '';

      // Quantity is optional - defaults to 1, will be matched during receiving
      if (item.quantity_ordered === undefined || item.quantity_ordered <= 0) {
        item.quantity_ordered = 1;
      }

      if (hasValidCost && hasValidBrand) {
        items.push(item);
      }
    });

    console.log('[PRODUCT_TYPE DEBUG] Sample item:', items[0]);

    const serialNumbers = items
      .map(item => item.serial_number)
      .filter(sn => sn && sn.trim());

    if (serialNumbers.length > 0 && selectedCompany) {
      try {
        const { data: existingAssets } = await supabase
          .from('assets')
          .select('serial_number')
          .eq('company_id', selectedCompany.id)
          .in('serial_number', serialNumbers);

        if (existingAssets && existingAssets.length > 0) {
          const duplicateSerials = existingAssets.map(a => a.serial_number).join(', ');
          showToast(
            `Cannot import: ${existingAssets.length} serial(s) already exist in inventory: ${duplicateSerials.slice(0, 100)}${duplicateSerials.length > 100 ? '...' : ''}`,
            'error'
          );
          return;
        }
      } catch (error: any) {
        showToast(`Error checking for duplicates: ${error.message}`, 'error');
        return;
      }
    }

    if (items.length === 0) {
      // Analyze why items were rejected
      const hasCostMapping = mappings.some(m => m.systemField === 'unit_cost');
      const hasBrandMapping = mappings.some(m => m.systemField === 'brand');
      const totalRows = parsedData.rows.length;

      let errorMsg = 'No items imported. ';
      if (!hasCostMapping) {
        errorMsg += 'Unit Cost column is not mapped. Please map a column to "Unit Cost".';
      } else if (!hasBrandMapping) {
        errorMsg += 'Brand column is not mapped. Please map a column to "Brand".';
      } else if (exchangeRate <= 0) {
        errorMsg += `Invalid exchange rate: ${exchangeRate}. Please enter a rate > 0.`;
      } else {
        errorMsg += `All ${totalRows} rows failed validation. Check console for details - common issues: missing brand, invalid cost format, zero/negative costs, or currency conversion errors.`;
      }

      showToast(errorMsg, 'error');
      return;
    }

    if (saveTemplate && templateName) {
      handleSaveTemplate();
    }

    const fileData = file ? {
      fileName: file.name,
      parsedData,
      mappings,
    } : undefined;

    onImport(items, { sourceCurrency, exchangeRate }, fileData);
    showToast(`Imported ${items.length} line items (${sourceCurrency} → AED @ ${exchangeRate})`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Smart PO Import</h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === 'upload' && 'Upload your supplier stock list'}
              {step === 'map' && 'Step 2: Map supplier columns to system fields'}
              {step === 'normalize' && 'Step 3: Review normalized entities'}
              {step === 'preview' && 'Review and import'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {step === 'upload' && (
          <div className="p-6 space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12">
              <div className="text-center">
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <label className="cursor-pointer">
                  <span className="text-lg text-blue-600 hover:text-blue-800 font-medium">
                    Choose supplier file
                  </span>
                  <span className="text-gray-600"> or drag and drop</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
                <p className="text-sm text-gray-500 mt-3">CSV or Excel files</p>
                <p className="text-xs text-gray-400 mt-2">
                  Excel (.xlsx, .xls) and CSV files supported
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Any column format accepted - we'll help you map them
                </p>
                {loading && (
                  <div className="mt-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Parsing file...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'map' && parsedData && (
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Found {parsedData.headers.length} columns</strong> in your file.
                Map them to system fields below. Auto-suggestions are already applied.
              </p>
            </div>

            <div className="space-y-3">
              {mappings.map((mapping, index) => {
                const availableFields = systemFields.filter(field => {
                  if (!field.value) return true;
                  if (field.value === mapping.systemField) return true;
                  return !mappedFields.has(field.value);
                });

                const findDuplicateMapping = () => {
                  if (!mapping.systemField) return null;
                  const otherMappings = mappings.filter((_, i) => i !== index);
                  return otherMappings.find(m => m.systemField === mapping.systemField);
                };

                const duplicateMapping = findDuplicateMapping();
                const hasDuplicate = duplicateMapping !== null && duplicateMapping !== undefined;

                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg space-y-3 transition ${
                      hasDuplicate
                        ? 'bg-yellow-50 border-2 border-yellow-300'
                        : 'bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    {hasDuplicate && (
                      <div className="flex items-center gap-2 text-yellow-800 text-sm bg-yellow-100 p-2 rounded">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>
                          This field is already mapped to <strong>"{duplicateMapping.supplierColumn}"</strong>.
                          Did you mean to skip this column?
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">{mapping.supplierColumn}</p>
                        {mapping.sampleValues.length > 0 && (
                          <p className="text-xs text-gray-500">
                            Examples: {mapping.sampleValues.join(', ')}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 mt-2" />
                      <div className="flex-1 space-y-2">
                        <select
                          value={mapping.systemField}
                          onChange={(e) => updateMapping(index, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          {availableFields.map(field => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                        {mapping.systemField === '' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentMappingIndex(index);
                              setShowAddFieldModal(true);
                            }}
                            className="w-full px-3 py-2 bg-blue-50 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition text-sm flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Create New Field Mapping
                          </button>
                        )}
                      </div>
                    </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Aliases (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={mapping.aliases || ''}
                      onChange={(e) => {
                        const updated = [...mappings];
                        updated[index].aliases = e.target.value;
                        setMappings(updated);
                      }}
                      placeholder="e.g., model_no, model number, item_model"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Add alternative names for auto-mapping in future imports
                    </p>
                  </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                setCurrentMappingIndex(null);
                setShowAddFieldModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-300 hover:border-blue-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Custom Field
            </button>

            <div className="border-t pt-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-medium text-amber-900 mb-3">Currency Conversion</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source Currency (Supplier)
                    </label>
                    <select
                      value={sourceCurrency}
                      onChange={(e) => {
                        setSourceCurrency(e.target.value);
                        if (e.target.value === 'AED') setExchangeRate(1.0);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {CURRENCIES.map(curr => (
                        <option key={curr.code} value={curr.code}>
                          {curr.code} - {curr.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exchange Rate to AED
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1.0)}
                      disabled={sourceCurrency === 'AED'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                      placeholder="e.g., 3.6725 for USD"
                    />
                  </div>
                </div>
                <p className="text-xs text-amber-700 mt-2">
                  Example: 1 {sourceCurrency} = {exchangeRate} AED
                  {sourceCurrency !== 'AED' && ` • All prices will be converted from ${sourceCurrency} to AED`}
                </p>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={saveTemplate}
                  onChange={(e) => setSaveTemplate(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Save this mapping as a template</span>
              </label>
              {saveTemplate && (
                <input
                  type="text"
                  placeholder="Template name (e.g., Dell Refurb Format)"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              )}
            </div>

            <div className="flex justify-between gap-3">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Back
              </button>
              <button
                onClick={handleProceedToNormalization}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {loading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...</>
                ) : (
                  <>Next: Review Entities <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && normalizationMappings.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Entity Normalization Summary</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  ✓ Successfully normalized {normalizationMappings.length} entities
                  {autoNormalizationCount > 0 && (
                    <span className="ml-1">({autoNormalizationCount} auto-applied from previous imports)</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex justify-between gap-3">
              <button
                onClick={() => setStep('map')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Back to Mapping
              </button>
              <button
                onClick={processImport}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Importing...' : 'Import Items'}
              </button>
            </div>
          </div>
        )}

        {showNormalizationModal && (
          <EntityNormalizationModal
            isOpen={showNormalizationModal}
            onClose={() => {
              setShowNormalizationModal(false);
              setStep('map');
            }}
            entityGroups={entityGroups}
            companyId={selectedCompany?.id || ''}
            onComplete={handleNormalizationComplete}
          />
        )}

        {showAddFieldModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">Add Custom Field</h3>
                <button
                  onClick={() => {
                    setShowAddFieldModal(false);
                    setCurrentMappingIndex(null);
                    setSelectedTemplate(null);
                    setNewFieldData({
                      fieldName: '',
                      fieldLabel: '',
                      fieldType: 'specification',
                      keywords: '',
                      isLocked: false
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-blue-900">
                      Quick Add System Field (Optional)
                    </label>
                  </div>
                  <select
                    value={selectedTemplate?.fieldName || ''}
                    onChange={(e) => {
                      const field = CANONICAL_FIELDS.find(f => f.fieldName === e.target.value);
                      if (field) {
                        setSelectedTemplate(field);
                        const isLocked = field.fieldType === 'direct';
                        setNewFieldData({
                          fieldName: field.fieldName,
                          fieldLabel: field.displayName,
                          fieldType: field.fieldType,
                          keywords: field.autoMapKeywords.join(', '),
                          isLocked
                        });
                      } else {
                        setSelectedTemplate(null);
                        setNewFieldData({
                          fieldName: '',
                          fieldLabel: '',
                          fieldType: 'specification',
                          keywords: '',
                          isLocked: false
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white"
                  >
                    <option value="">-- Choose a common field to auto-fill --</option>
                    <optgroup label="📋 REQUIRED FIELDS (System)">
                      {CORE_FIELDS.filter(f => f.required && !existingFieldNames.has(f.fieldName)).map(field => (
                        <option key={field.fieldName} value={field.fieldName}>
                          {field.displayName} ({field.fieldName})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="📦 OPTIONAL DIRECT FIELDS (System)">
                      {CORE_FIELDS.filter(f => !f.required && !existingFieldNames.has(f.fieldName)).map(field => (
                        <option key={field.fieldName} value={field.fieldName}>
                          {field.displayName} ({field.fieldName})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="⚙️ HARDWARE SPECIFICATIONS (Customizable)">
                      {SPEC_FIELDS.filter(f => !existingFieldNames.has(f.fieldName)).map(field => (
                        <option key={field.fieldName} value={field.fieldName}>
                          {field.displayName} ({field.fieldName})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  {selectedTemplate && (
                    <div className="mt-2 p-2 bg-white border border-blue-200 rounded text-xs">
                      <div className="font-medium text-slate-800">{selectedTemplate.displayName}</div>
                      <div className="text-slate-600 mt-0.5">{selectedTemplate.description}</div>
                    </div>
                  )}
                </div>

                <div className="text-sm text-slate-500 text-center">
                  ────────────── or create custom field manually ──────────────
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Type
                  </label>
                  <select
                    value={newFieldData.fieldType}
                    onChange={(e) => setNewFieldData({ ...newFieldData, fieldType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={newFieldData.isLocked}
                  >
                    <option value="specification">Specification (stored in other_specs)</option>
                    <option value="direct">Core Field (top-level field)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Use "Specification" for custom specs like warranty, accessories, etc.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    Field Name <span className="text-red-500">*</span>
                    {newFieldData.isLocked && (
                      <span className="flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
                        <Lock className="w-3 h-3" />
                        Locked
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={newFieldData.fieldName}
                    onChange={(e) => setNewFieldData({ ...newFieldData, fieldName: e.target.value })}
                    placeholder="e.g., warranty_months, charger_included"
                    className={`w-full px-3 py-2 border rounded-lg ${
                      newFieldData.isLocked
                        ? 'bg-slate-100 border-slate-300 text-slate-600 cursor-not-allowed'
                        : 'border-gray-300'
                    }`}
                    disabled={newFieldData.isLocked}
                  />
                  {newFieldData.isLocked ? (
                    <p className="mt-2 text-xs text-orange-700 bg-orange-50 p-2 rounded flex items-start gap-2">
                      <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        This is a system field that matches database columns and code. The field name cannot be changed.
                        You can customize the keywords below to match your supplier's column names.
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Use lowercase with underscores (no spaces)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newFieldData.fieldLabel}
                    onChange={(e) => setNewFieldData({ ...newFieldData, fieldLabel: e.target.value })}
                    placeholder="e.g., Warranty (Months), Charger Included"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auto-Map Keywords (optional)
                  </label>
                  <textarea
                    value={newFieldData.keywords}
                    onChange={(e) => setNewFieldData({ ...newFieldData, keywords: e.target.value })}
                    placeholder="warranty, warr, guarantee"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Comma-separated keywords to auto-detect this field during imports
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-4 border-t flex-shrink-0">
                <button
                  onClick={() => {
                    setShowAddFieldModal(false);
                    setCurrentMappingIndex(null);
                    setSelectedTemplate(null);
                    setNewFieldData({
                      fieldName: '',
                      fieldLabel: '',
                      fieldType: 'specification',
                      keywords: '',
                      isLocked: false
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomField}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Field
                </button>
              </div>
            </div>
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
