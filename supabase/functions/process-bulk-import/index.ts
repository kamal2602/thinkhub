import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type JobType = 'assets' | 'purchase_order' | 'bulk_update';

interface AssetImportItem {
  company_id: string;
  serial_number: string;
  product_type_id?: string;
  status?: string;
  functional_status?: string;
  cosmetic_grade?: string;
  [key: string]: unknown;
}

interface PurchaseOrderLineItem {
  company_id: string;
  purchase_order_id: string;
  product_type_id?: string;
  quantity?: number;
  unit_cost?: number;
  [key: string]: unknown;
}

interface BulkUpdateItem {
  id: string;
  [key: string]: unknown;
}

type ImportItem = AssetImportItem | PurchaseOrderLineItem | BulkUpdateItem;

interface ImportJobRequest {
  jobId: string;
  companyId: string;
  items: ImportItem[];
  jobType: JobType;
}

interface ImportError {
  batch: number;
  error: string;
  items: number;
}

interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

function isSupabaseError(error: unknown): error is SupabaseError {
  return typeof error === 'object' && error !== null && 'message' in error;
}

function getErrorMessage(error: unknown): string {
  if (isSupabaseError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData = await req.json() as ImportJobRequest;
    const { jobId, companyId, items, jobType } = requestData;

    if (!jobId || !companyId || !items || !jobType) {
      throw new Error('Missing required fields: jobId, companyId, items, or jobType');
    }

    if (!Array.isArray(items)) {
      throw new Error('items must be an array');
    }

    if (!['assets', 'purchase_order', 'bulk_update'].includes(jobType)) {
      throw new Error('Invalid jobType. Must be: assets, purchase_order, or bulk_update');
    }

    await supabase
      .from('import_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        total_rows: items.length
      })
      .eq('id', jobId);

    const batchSize = 100;
    let successfulRows = 0;
    let failedRows = 0;
    const errors: ImportError[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      try {
        let result: { error: SupabaseError | null } | undefined;

        if (jobType === 'assets') {
          const { error } = await supabase
            .from('assets')
            .insert(batch as AssetImportItem[]);
          result = { error };
        } else if (jobType === 'purchase_order') {
          const { error } = await supabase
            .from('purchase_order_lines')
            .insert(batch as PurchaseOrderLineItem[]);
          result = { error };
        } else if (jobType === 'bulk_update') {
          for (const item of batch as BulkUpdateItem[]) {
            const { id, ...updates } = item;
            const { error } = await supabase
              .from('assets')
              .update(updates)
              .eq('id', id);

            if (error) {
              result = { error };
              break;
            }
          }
          if (!result) {
            result = { error: null };
          }
        }

        if (result?.error) {
          failedRows += batch.length;
          errors.push({
            batch: Math.floor(i / batchSize) + 1,
            error: result.error.message,
            items: batch.length
          });
        } else {
          successfulRows += batch.length;
        }
      } catch (error) {
        failedRows += batch.length;
        errors.push({
          batch: Math.floor(i / batchSize) + 1,
          error: getErrorMessage(error),
          items: batch.length
        });
      }

      const progress = Math.floor(((i + batchSize) / items.length) * 100);
      await supabase
        .from('import_jobs')
        .update({
          progress: Math.min(progress, 100),
          processed_rows: Math.min(i + batch.length, items.length),
          successful_rows: successfulRows,
          failed_rows: failedRows
        })
        .eq('id', jobId);
    }

    const finalStatus = failedRows === 0
      ? 'completed'
      : failedRows === items.length
      ? 'failed'
      : 'completed';

    await supabase
      .from('import_jobs')
      .update({
        status: finalStatus,
        progress: 100,
        completed_at: new Date().toISOString(),
        error_details: errors.length > 0 ? errors : null,
        result_data: {
          total: items.length,
          successful: successfulRows,
          failed: failedRows
        }
      })
      .eq('id', jobId);

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        successful: successfulRows,
        failed: failedRows,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Import processing error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: getErrorMessage(error)
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
