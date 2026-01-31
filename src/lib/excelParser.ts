import * as XLSX from 'xlsx';

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

    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

    if (jsonData.length < 2) {
      throw new Error('Sheet is empty or has no data rows');
    }

    const headers = jsonData[0].map(h => String(h || '').trim()).filter(h => h);
    const rows = jsonData.slice(1)
      .map(row => row.map(cell => String(cell || '').trim()))
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
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
      const preview = jsonData.slice(0, 6).map(row =>
        row.map((cell: any) => String(cell || '').trim())
      );
      const rowCount = Math.max(0, jsonData.length - 1);

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
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    const preview = jsonData.slice(0, 6).map(row =>
      row.map((cell: any) => String(cell || '').trim())
    );
    const rowCount = Math.max(0, jsonData.length - 1);

    return { name: sheetName, rowCount, preview };
  });
}
