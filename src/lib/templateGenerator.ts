import * as XLSX from 'xlsx';

export interface TemplateColumn {
  header: string;
  example: string;
  required?: boolean;
  description?: string;
}

export function generateExcelTemplate(
  columns: TemplateColumn[],
  fileName: string,
  sheetName: string = 'Template'
) {
  const workbook = XLSX.utils.book_new();

  const sampleData: Record<string, string> = {};
  columns.forEach(col => {
    const header = col.required ? `${col.header} *` : col.header;
    sampleData[header] = col.example;
  });

  const worksheet = XLSX.utils.json_to_sheet([sampleData]);

  worksheet['!cols'] = columns.map(() => ({ wch: 20 }));

  const instructions = [
    { 'Field': 'Instructions', 'Details': 'Fill in your data below the sample row. Delete the sample row before importing.' },
    { 'Field': 'Required Fields', 'Details': 'Fields marked with * are required and must have values' },
    { 'Field': 'Data Format', 'Details': 'Follow the examples provided in each column' },
    { 'Field': 'Serial Number', 'Details': 'Must be unique within your company' },
    { 'Field': 'Price/Cost', 'Details': 'Enter numbers only without currency symbols (e.g., 250.00 not $250)' },
    { 'Field': 'Quantity', 'Details': 'Enter whole numbers only (e.g., 1, 5, 10)' },
    { 'Field': 'Notes', 'Details': 'Optional fields can be left empty if not applicable' }
  ];

  columns.forEach((col, idx) => {
    if (col.description) {
      instructions.push({
        'Field': col.header,
        'Details': col.description
      });
    }
  });

  const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
  instructionsSheet['!cols'] = [{ wch: 20 }, { wch: 60 }];

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  XLSX.writeFile(workbook, fileName);
}

export const PO_TEMPLATE_COLUMNS: TemplateColumn[] = [
  {
    header: 'Serial Number',
    example: 'ABC123456789',
    required: true,
    description: 'Unique identifier for each device. Must be unique across your company.'
  },
  {
    header: 'Brand',
    example: 'HP',
    required: true,
    description: 'Manufacturer name (e.g., HP, Dell, Lenovo, Apple)'
  },
  {
    header: 'Model',
    example: 'EliteBook 840 G10',
    required: true,
    description: 'Specific model number or name'
  },
  {
    header: 'Product Type',
    example: 'Laptop',
    required: true,
    description: 'Category: Laptop, Desktop, Monitor, Server, etc.'
  },
  {
    header: 'Price',
    example: '250.00',
    required: true,
    description: 'Unit purchase price without currency symbol'
  },
  {
    header: 'Quantity',
    example: '1',
    required: true,
    description: 'Number of units (whole number)'
  },
  {
    header: 'Condition',
    example: 'Grade A',
    description: 'Cosmetic condition or grade if known'
  },
  {
    header: 'CPU',
    example: 'Intel Core i5-1135G7',
    description: 'Processor model'
  },
  {
    header: 'RAM',
    example: '16GB',
    description: 'Memory size (e.g., 8GB, 16GB, 32GB)'
  },
  {
    header: 'Storage',
    example: '256GB SSD',
    description: 'Storage capacity and type'
  },
  {
    header: 'Screen Size',
    example: '14"',
    description: 'Display size for laptops/monitors'
  },
  {
    header: 'Notes',
    example: 'Minor scratches on lid',
    description: 'Any additional notes or remarks'
  }
];

export const ASSET_TEMPLATE_COLUMNS: TemplateColumn[] = [
  {
    header: 'Serial Number',
    example: 'ABC123456789',
    required: true,
    description: 'Unique identifier for each device'
  },
  {
    header: 'Brand',
    example: 'Dell',
    required: true,
    description: 'Manufacturer name'
  },
  {
    header: 'Model',
    example: 'Latitude 5420',
    required: true,
    description: 'Model number or name'
  },
  {
    header: 'Product Type',
    example: 'Laptop',
    required: true,
    description: 'Device category'
  },
  {
    header: 'Cosmetic Grade',
    example: 'A-',
    required: true,
    description: 'Physical condition grade'
  },
  {
    header: 'Functional Status',
    example: 'Tested Working',
    description: 'Working condition status'
  },
  {
    header: 'CPU',
    example: 'Intel Core i7-1185G7',
    description: 'Processor specification'
  },
  {
    header: 'RAM',
    example: '32GB',
    description: 'Memory capacity'
  },
  {
    header: 'Storage',
    example: '512GB NVMe SSD',
    description: 'Storage details'
  },
  {
    header: 'Screen Size',
    example: '15.6"',
    description: 'Display size'
  },
  {
    header: 'Sale Price',
    example: '450.00',
    description: 'Expected selling price'
  }
];

export function downloadPOTemplate() {
  generateExcelTemplate(PO_TEMPLATE_COLUMNS, 'PO_Import_Template.xlsx', 'Purchase Order');
}

export function downloadAssetTemplate() {
  generateExcelTemplate(ASSET_TEMPLATE_COLUMNS, 'Asset_Import_Template.xlsx', 'Assets');
}
