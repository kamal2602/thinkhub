import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type AuditExport = Database['public']['Tables']['audit_exports']['Row'];
type AuditExportContents = Database['public']['Tables']['audit_export_contents']['Row'];

export interface ExportRequest {
  export_type: 'regulator' | 'client' | 'certifier' | 'internal';
  export_format: 'csv' | 'xml' | 'xbrl' | 'json';
  from_date: string;
  to_date: string;
  purpose: string;
  regulator_name?: string;
  client_name?: string;
  compliance_frameworks?: string[];
  tables_to_include: string[];
  filters?: Record<string, any>;
}

export interface ExportDataRow {
  [key: string]: any;
}

export const auditExportService = {
  async createExport(companyId: string, request: ExportRequest): Promise<AuditExport> {
    const exportData = await this.gatherExportData(companyId, request);

    let fileContent: string;
    let fileHash: string;

    if (request.export_format === 'csv') {
      fileContent = this.generateCSV(exportData);
    } else if (request.export_format === 'xml') {
      fileContent = this.generateXML(exportData, request);
    } else if (request.export_format === 'xbrl') {
      fileContent = this.generateXBRL(exportData, request);
    } else {
      fileContent = JSON.stringify(exportData, null, 2);
    }

    fileHash = await this.calculateHash(fileContent);

    const fileName = `export_${Date.now()}.${request.export_format}`;
    const filePath = `audit_exports/${companyId}/${fileName}`;

    const blob = new Blob([fileContent], {
      type: this.getContentType(request.export_format),
    });

    const { error: uploadError } = await supabase.storage
      .from('exports')
      .upload(filePath, blob);

    if (uploadError) throw uploadError;

    const { data: exportRecord, error: exportError } = await supabase.rpc(
      'create_audit_export',
      {
        p_company_id: companyId,
        p_export_type: request.export_type,
        p_export_format: request.export_format,
        p_from_date: request.from_date,
        p_to_date: request.to_date,
        p_file_path: filePath,
        p_file_hash: fileHash,
        p_purpose: request.purpose,
        p_regulator_name: request.regulator_name || null,
        p_compliance_frameworks: request.compliance_frameworks || null,
      }
    );

    if (exportError) throw exportError;

    await this.createExportContents(exportRecord, exportData);

    const { data: fullExport, error: fetchError } = await supabase
      .from('audit_exports')
      .select('*')
      .eq('id', exportRecord)
      .single();

    if (fetchError) throw fetchError;
    return fullExport;
  },

  async gatherExportData(
    companyId: string,
    request: ExportRequest
  ): Promise<Record<string, ExportDataRow[]>> {
    const result: Record<string, ExportDataRow[]> = {};

    for (const tableName of request.tables_to_include) {
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', request.from_date)
        .lte('created_at', request.to_date);

      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        continue;
      }

      result[tableName] = data || [];
    }

    return result;
  },

  generateCSV(data: Record<string, ExportDataRow[]>): string {
    let csv = '';

    for (const [tableName, rows] of Object.entries(data)) {
      if (rows.length === 0) continue;

      csv += `\n### ${tableName} ###\n`;

      const headers = Object.keys(rows[0]);
      csv += headers.join(',') + '\n';

      rows.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csv += values.join(',') + '\n';
      });
    }

    return csv;
  },

  generateXML(data: Record<string, ExportDataRow[]>, request: ExportRequest): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<AuditExport>\n`;
    xml += `  <Metadata>\n`;
    xml += `    <ExportType>${this.escapeXML(request.export_type)}</ExportType>\n`;
    xml += `    <FromDate>${this.escapeXML(request.from_date)}</FromDate>\n`;
    xml += `    <ToDate>${this.escapeXML(request.to_date)}</ToDate>\n`;
    xml += `    <Purpose>${this.escapeXML(request.purpose)}</Purpose>\n`;
    if (request.regulator_name) {
      xml += `    <RegulatorName>${this.escapeXML(request.regulator_name)}</RegulatorName>\n`;
    }
    if (request.compliance_frameworks) {
      xml += `    <ComplianceFrameworks>\n`;
      request.compliance_frameworks.forEach(framework => {
        xml += `      <Framework>${this.escapeXML(framework)}</Framework>\n`;
      });
      xml += `    </ComplianceFrameworks>\n`;
    }
    xml += `  </Metadata>\n`;
    xml += `  <Data>\n`;

    for (const [tableName, rows] of Object.entries(data)) {
      xml += `    <Table name="${this.escapeXML(tableName)}">\n`;
      rows.forEach(row => {
        xml += `      <Row>\n`;
        Object.entries(row).forEach(([key, value]) => {
          xml += `        <${key}>${this.escapeXML(String(value))}</${key}>\n`;
        });
        xml += `      </Row>\n`;
      });
      xml += `    </Table>\n`;
    }

    xml += `  </Data>\n`;
    xml += `</AuditExport>`;

    return xml;
  },

  generateXBRL(data: Record<string, ExportDataRow[]>, request: ExportRequest): string {
    let xbrl = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xbrl += '<xbrl xmlns="http://www.xbrl.org/2003/instance"\n';
    xbrl += '      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
    xbrl += '      xmlns:link="http://www.xbrl.org/2003/linkbase"\n';
    xbrl += '      xmlns:esg="http://example.com/esg/2024">\n';

    xbrl += `  <context id="period_${request.from_date}_${request.to_date}">\n`;
    xbrl += `    <period>\n`;
    xbrl += `      <startDate>${request.from_date}</startDate>\n`;
    xbrl += `      <endDate>${request.to_date}</endDate>\n`;
    xbrl += `    </period>\n`;
    xbrl += `  </context>\n`;

    if (data.esg_events) {
      const totalWeight = data.esg_events.reduce((sum, e) => sum + (e.weight_kg || 0), 0);
      const totalCarbon = data.esg_events.reduce((sum, e) => sum + (e.carbon_estimate_kg || 0), 0);

      xbrl += `  <esg:TotalWasteProcessed contextRef="period_${request.from_date}_${request.to_date}" unitRef="kg" decimals="2">${totalWeight}</esg:TotalWasteProcessed>\n`;
      xbrl += `  <esg:TotalCarbonEmissions contextRef="period_${request.from_date}_${request.to_date}" unitRef="kgCO2e" decimals="2">${totalCarbon}</esg:TotalCarbonEmissions>\n`;
    }

    xbrl += '</xbrl>';

    return xbrl;
  },

  escapeXML(str: string): string {
    if (typeof str !== 'string') return String(str);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  },

  async calculateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  },

  async createExportContents(
    exportId: string,
    data: Record<string, ExportDataRow[]>
  ): Promise<void> {
    const contents = Object.entries(data).map(([tableName, rows]) => ({
      export_id: exportId,
      table_name: tableName,
      row_count: rows.length,
      included_columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      data_range_start: rows.length > 0 ? rows[0].created_at : null,
      data_range_end: rows.length > 0 ? rows[rows.length - 1].created_at : null,
    }));

    const { error } = await supabase
      .from('audit_export_contents')
      .insert(contents);

    if (error) throw error;
  },

  getContentType(format: string): string {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'xml':
      case 'xbrl':
        return 'application/xml';
      case 'json':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  },

  async getExports(companyId: string): Promise<AuditExport[]> {
    const { data, error } = await supabase
      .from('audit_exports')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getExportDetails(exportId: string): Promise<{
    export: AuditExport;
    contents: AuditExportContents[];
  }> {
    const [exportResult, contentsResult] = await Promise.all([
      supabase
        .from('audit_exports')
        .select('*')
        .eq('id', exportId)
        .single(),
      supabase
        .from('audit_export_contents')
        .select('*')
        .eq('export_id', exportId),
    ]);

    if (exportResult.error) throw exportResult.error;
    if (contentsResult.error) throw contentsResult.error;

    return {
      export: exportResult.data,
      contents: contentsResult.data || [],
    };
  },

  async downloadExport(exportId: string): Promise<{ url: string }> {
    const { data: exportRecord, error: exportError } = await supabase
      .from('audit_exports')
      .select('file_path')
      .eq('id', exportId)
      .single();

    if (exportError) throw exportError;

    const { data: signedUrl } = await supabase.storage
      .from('exports')
      .createSignedUrl(exportRecord.file_path, 3600);

    if (!signedUrl) throw new Error('Failed to generate download URL');

    return { url: signedUrl.signedUrl };
  },

  async validateExportHash(exportId: string, fileContent: string): Promise<boolean> {
    const { data: exportRecord, error } = await supabase
      .from('audit_exports')
      .select('file_hash')
      .eq('id', exportId)
      .single();

    if (error) throw error;

    const calculatedHash = await this.calculateHash(fileContent);

    return calculatedHash === exportRecord.file_hash;
  },

  async generateESGComplianceExport(
    companyId: string,
    fromDate: string,
    toDate: string,
    frameworks: string[]
  ): Promise<AuditExport> {
    return this.createExport(companyId, {
      export_type: 'regulator',
      export_format: 'xml',
      from_date: fromDate,
      to_date: toDate,
      purpose: `ESG Compliance Report: ${frameworks.join(', ')}`,
      compliance_frameworks: frameworks,
      tables_to_include: [
        'esg_events',
        'waste_categories',
        'recovery_methods',
        'recycling_certificates',
      ],
    });
  },

  async generateClientAuditExport(
    companyId: string,
    clientName: string,
    fromDate: string,
    toDate: string
  ): Promise<AuditExport> {
    return this.createExport(companyId, {
      export_type: 'client',
      export_format: 'csv',
      from_date: fromDate,
      to_date: toDate,
      purpose: `Client audit export for ${clientName}`,
      client_name: clientName,
      tables_to_include: [
        'assets',
        'itad_projects',
        'data_destruction_certificates',
        'recycling_certificates',
      ],
    });
  },
};
