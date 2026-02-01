import * as XLSX from 'xlsx';

type ExcelCellValue = string | number | boolean | null | undefined;
type ExcelRow = ExcelCellValue[];
type ExcelData = ExcelRow[];

export interface SheetInfo {
  name: string;
  rowCount: number;
  preview: string[][];
}

export interface ParseResult {
  headers: string[];
  rows: string[][];
  totalRows: number;
  hasMultipleSheets?: boolean;
  sheets?: SheetInfo[];
}

function isExcelData(data: unknown): data is ExcelData {
  if (!Array.isArray(data)) return false;
  return data.every(row =>
    Array.isArray(row) &&
    row.every(cell =>
      cell === null ||
      cell === undefined ||
      typeof cell === 'string' ||
      typeof cell === 'number' ||
      typeof cell === 'boolean'
    )
  );
}

function normalizeExcelCell(cell: ExcelCellValue): string {
  if (cell === null || cell === undefined) return '';
  return String(cell).trim();
}

export class ExcelParser {
  private workbook: XLSX.WorkBook | null = null;

  async parseFile(file: File, sheetName?: string): Promise<ParseResult> {
    const data = await file.arrayBuffer();
    this.workbook = XLSX.read(data, { type: 'array' });

    if (this.workbook.SheetNames.length > 1 && !sheetName) {
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        hasMultipleSheets: true,
        sheets: this.getSheetInfo(),
      };
    }

    const targetSheetName = sheetName || this.workbook.SheetNames[0];
    return this.parseSheet(targetSheetName);
  }

  parseSheet(sheetName: string): ParseResult {
    if (!this.workbook) {
      throw new Error('No workbook loaded');
    }

    const sheet = this.workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!isExcelData(rawData)) {
      throw new Error('Invalid Excel data format');
    }

    if (rawData.length < 2) {
      throw new Error('Sheet is empty or has no data rows');
    }

    const headers = rawData[0].map(normalizeExcelCell).filter(h => h);
    const rows = rawData.slice(1)
      .map(row => row.map(normalizeExcelCell))
      .filter(row => row.some(cell => cell !== ''));

    return {
      headers,
      rows,
      totalRows: rows.length,
    };
  }

  getSheetInfo(): SheetInfo[] {
    if (!this.workbook) {
      return [];
    }

    return this.workbook.SheetNames.map((sheetName: string) => {
      const sheet = this.workbook!.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (!isExcelData(rawData)) {
        return { name: sheetName, rowCount: 0, preview: [] };
      }

      const preview = rawData.slice(0, 6).map(row =>
        row.map(normalizeExcelCell)
      );
      const rowCount = Math.max(0, rawData.length - 1);

      return { name: sheetName, rowCount, preview };
    });
  }

  static async quickParse(file: File, sheetName?: string): Promise<ParseResult> {
    const parser = new ExcelParser();
    return parser.parseFile(file, sheetName);
  }
}

export async function parseExcelFile(file: File, sheetName?: string): Promise<ParseResult> {
  return ExcelParser.quickParse(file, sheetName);
}

export function getSheetInfo(workbook: XLSX.WorkBook): SheetInfo[] {
  return workbook.SheetNames.map((sheetName: string) => {
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!isExcelData(rawData)) {
      return { name: sheetName, rowCount: 0, preview: [] };
    }

    const preview = rawData.slice(0, 6).map(row =>
      row.map(normalizeExcelCell)
    );
    const rowCount = Math.max(0, rawData.length - 1);

    return { name: sheetName, rowCount, preview };
  });
}
