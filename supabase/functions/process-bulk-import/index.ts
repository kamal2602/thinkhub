import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ImportJobRequest {
  jobId: string;
  companyId: string;
  items: any[];
  jobType: 'assets' | 'purchase_order' | 'bulk_update';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { jobId, companyId, items, jobType }: ImportJobRequest = await req.json();

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
    const errors: any[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      try {
        let result;

        if (jobType === 'assets' || jobType === 'purchase_order') {
          const tableName = jobType === 'assets' ? 'assets' : 'purchase_order_lines';
          result = await supabase
            .from(tableName)
            .insert(batch);
        } else if (jobType === 'bulk_update') {
          for (const item of batch) {
            const { id, ...updates } = item;
            await supabase
              .from('assets')
              .update(updates)
              .eq('id', id);
          }
          result = { error: null };
        }

        if (result?.error) {
          failedRows += batch.length;
          errors.push({
            batch: i / batchSize + 1,
            error: result.error.message,
            items: batch.length
          });
        } else {
          successfulRows += batch.length;
        }
      } catch (error) {
        failedRows += batch.length;
        errors.push({
          batch: i / batchSize + 1,
          error: error.message,
          items: batch.length
        });
      }

      const progress = Math.floor(((i + batchSize) / items.length) * 100);
      await supabase
        .from('import_jobs')
        .update({
          progress: Math.min(progress, 100),
          processed_rows: i + batch.length,
          successful_rows: successfulRows,
          failed_rows: failedRows
        })
        .eq('id', jobId);
    }

    const finalStatus = failedRows === 0 ? 'completed' : failedRows === items.length ? 'failed' : 'completed';
    await supabase
      .from('import_jobs')
      .update({
        status: finalStatus,
        progress: 100,
        completed_at: new Date().toISOString(),
        error_details: errors,
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
        failed: failedRows
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
        error: error.message
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
