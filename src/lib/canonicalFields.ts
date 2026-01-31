export interface CanonicalField {
  fieldName: string;
  displayName: string;
  description: string;
  fieldType: 'direct' | 'specification';
  required: boolean;
  sortOrder: number;
  autoMapKeywords: string[];
  validationHint?: string;
}

export const CANONICAL_FIELDS: CanonicalField[] = [
  {
    fieldName: 'serial_number',
    displayName: 'Serial Number',
    description: 'Unique identifier for each item',
    fieldType: 'direct',
    required: true,
    sortOrder: 1,
    autoMapKeywords: ['serial number', 'serial#', 'service tag', 's/n', 'sn', 'serial'],
    validationHint: 'Must be unique across inventory'
  },
  {
    fieldName: 'product_type',
    displayName: 'Product Type',
    description: 'Category like Laptop, Desktop, Monitor',
    fieldType: 'direct',
    required: true,
    sortOrder: 2,
    autoMapKeywords: ['product type', 'product category', 'item type', 'device type', 'category', 'type'],
    validationHint: 'Must match existing Product Type or create new'
  },
  {
    fieldName: 'brand',
    displayName: 'Brand',
    description: 'Manufacturer name',
    fieldType: 'direct',
    required: true,
    sortOrder: 3,
    autoMapKeywords: ['brand', 'manufacturer', 'mfr', 'make', 'vendor name', 'oem'],
    validationHint: 'Will be normalized (e.g., HP = Hewlett-Packard)'
  },
  {
    fieldName: 'model',
    displayName: 'Model',
    description: 'Model name or number',
    fieldType: 'direct',
    required: true,
    sortOrder: 4,
    autoMapKeywords: ['model', 'model number', 'model name', 'part number', 'part#', 'partnumber', 'product name', 'item'],
    validationHint: 'Will be normalized using model aliases'
  },
  {
    fieldName: 'unit_cost',
    displayName: 'Unit Cost',
    description: 'Price per unit',
    fieldType: 'direct',
    required: true,
    sortOrder: 5,
    autoMapKeywords: ['unit price', 'unit cost', 'per unit', 'price', 'cost', 'each', 'amount', 'value'],
    validationHint: 'Must be a positive number'
  },
  {
    fieldName: 'quantity_ordered',
    displayName: 'Quantity',
    description: 'Number of items',
    fieldType: 'direct',
    required: false,
    sortOrder: 6,
    autoMapKeywords: ['quantity', 'qty', 'available', 'avail', 'stock', 'count', 'units', 'amount'],
    validationHint: 'Must be a positive integer'
  },
  {
    fieldName: 'supplier_sku',
    displayName: 'Supplier SKU',
    description: 'Supplier part number',
    fieldType: 'direct',
    required: false,
    sortOrder: 7,
    autoMapKeywords: ['supplier sku', 'vendor sku', 'item number', 'item#', 'sku', 'part code'],
    validationHint: 'Supplier-specific identifier'
  },
  {
    fieldName: 'description',
    displayName: 'Description',
    description: 'Item description',
    fieldType: 'direct',
    required: false,
    sortOrder: 8,
    autoMapKeywords: ['description', 'item description', 'product description', 'desc', 'details', 'name'],
    validationHint: 'Free text description'
  },
  {
    fieldName: 'expected_condition',
    displayName: 'Grade / Condition',
    description: 'Cosmetic or functional grade',
    fieldType: 'direct',
    required: false,
    sortOrder: 9,
    autoMapKeywords: ['cosmetic grade', 'grade', 'condition', 'cosmetic', 'quality', 'rating'],
    validationHint: 'Use existing grades (A, B, C, etc.)'
  },
  {
    fieldName: 'specifications.cpu',
    displayName: 'CPU',
    description: 'Processor model',
    fieldType: 'specification',
    required: false,
    sortOrder: 10,
    autoMapKeywords: ['processor type', 'processor model', 'cpu type', 'cpu model', 'processor', 'cpu', 'proc', 'chip'],
    validationHint: 'e.g., Intel i7-8650U'
  },
  {
    fieldName: 'specifications.ram',
    displayName: 'RAM',
    description: 'Memory size',
    fieldType: 'specification',
    required: false,
    sortOrder: 11,
    autoMapKeywords: ['memory type', 'ram type', 'memory size', 'ram size', 'ram', 'memory', 'mem'],
    validationHint: 'e.g., 16GB DDR4'
  },
  {
    fieldName: 'specifications.storage',
    displayName: 'Storage',
    description: 'HDD/SSD capacity and type',
    fieldType: 'specification',
    required: false,
    sortOrder: 12,
    autoMapKeywords: ['storage type', 'storage capacity', 'hard drive', 'storage', 'hdd', 'ssd', 'drive', 'disk', 'hd'],
    validationHint: 'e.g., 512GB SSD'
  },
  {
    fieldName: 'specifications.screen_size',
    displayName: 'Screen Size',
    description: 'Display size',
    fieldType: 'specification',
    required: false,
    sortOrder: 13,
    autoMapKeywords: ['screen size', 'display size', 'screen', 'display', 'lcd', 'monitor', 'panel'],
    validationHint: 'e.g., 15.6 inch'
  },
  {
    fieldName: 'specifications.graphics',
    displayName: 'Graphics',
    description: 'GPU model',
    fieldType: 'specification',
    required: false,
    sortOrder: 14,
    autoMapKeywords: ['graphics card', 'video card', 'graphics', 'gpu', 'video', 'vga'],
    validationHint: 'e.g., Intel Iris Xe'
  },
  {
    fieldName: 'specifications.os',
    displayName: 'Operating System',
    description: 'OS version',
    fieldType: 'specification',
    required: false,
    sortOrder: 15,
    autoMapKeywords: ['operating system', 'os', 'software', 'windows', 'macos', 'linux'],
    validationHint: 'e.g., Windows 11 Pro'
  }
];

export const CORE_FIELDS = CANONICAL_FIELDS.filter(f => f.fieldType === 'direct');
export const SPEC_FIELDS = CANONICAL_FIELDS.filter(f => f.fieldType === 'specification');

export function isCanonicalField(fieldName: string): boolean {
  return CANONICAL_FIELDS.some(f => f.fieldName === fieldName);
}

export function getCanonicalField(fieldName: string): CanonicalField | undefined {
  return CANONICAL_FIELDS.find(f => f.fieldName === fieldName);
}

export function suggestCanonicalField(userInput: string): CanonicalField | null {
  const normalized = userInput.toLowerCase().trim();

  for (const field of CANONICAL_FIELDS) {
    if (field.fieldName === normalized) {
      return field;
    }

    if (field.fieldName.includes(normalized) || normalized.includes(field.fieldName.replace('specifications.', ''))) {
      return field;
    }

    const keywords = field.autoMapKeywords.map(k => k.toLowerCase());
    if (keywords.some(k => k === normalized || k.includes(normalized) || normalized.includes(k))) {
      return field;
    }
  }

  return null;
}

export function validateCustomFieldName(fieldName: string): { valid: boolean; error?: string; warning?: string; suggestion?: CanonicalField } {
  if (!fieldName || !fieldName.trim()) {
    return { valid: false, error: 'Field name is required' };
  }

  const trimmed = fieldName.trim();

  if (isCanonicalField(trimmed)) {
    return {
      valid: false,
      error: 'This is a standard field. Please use the suggested field instead.',
      suggestion: getCanonicalField(trimmed)
    };
  }

  const suggested = suggestCanonicalField(trimmed);
  if (suggested) {
    return {
      valid: true,
      warning: `Did you mean "${suggested.fieldName}"? This is a standard field used by the system.`,
      suggestion: suggested
    };
  }

  if (!trimmed.startsWith('specifications.')) {
    return {
      valid: false,
      error: 'Custom fields must start with "specifications." (e.g., specifications.warranty_length)'
    };
  }

  const specName = trimmed.replace('specifications.', '');
  if (!/^[a-z][a-z0-9_]*$/.test(specName)) {
    return {
      valid: false,
      error: 'Field name must use lowercase letters, numbers, and underscores only (e.g., specifications.my_custom_field)'
    };
  }

  return { valid: true };
}
