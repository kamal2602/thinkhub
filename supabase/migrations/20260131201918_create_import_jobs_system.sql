/*
  # Import Jobs System

  1. New Tables
    - `import_jobs`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `created_by` (uuid, references profiles)
      - `job_type` (text) - 'purchase_order', 'assets', 'bulk_update'
      - `file_name` (text)
      - `status` (text) - 'pending', 'processing', 'completed', 'failed', 'cancelled'
      - `progress` (integer) - percentage complete (0-100)
      - `total_rows` (integer)
      - `processed_rows` (integer)
      - `successful_rows` (integer)
      - `failed_rows` (integer)
      - `error_message` (text)
      - `error_details` (jsonb) - detailed error information
      - `result_data` (jsonb) - summary of import results
      - `created_at` (timestamptz)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)

  2. Security
    - Enable RLS on `import_jobs` table
    - Add policies for authenticated users to manage their company's jobs
*/

-- Create import jobs table
CREATE TABLE IF NOT EXISTS import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  job_type text NOT NULL CHECK (job_type IN ('purchase_order', 'assets', 'bulk_update', 'inventory')),
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  total_rows integer DEFAULT 0,
  processed_rows integer DEFAULT 0,
  successful_rows integer DEFAULT 0,
  failed_rows integer DEFAULT 0,
  error_message text,
  error_details jsonb DEFAULT '[]'::jsonb,
  result_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_import_jobs_company_id ON import_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_by ON import_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own company import jobs" ON import_jobs;
DROP POLICY IF EXISTS "Users can create import jobs" ON import_jobs;
DROP POLICY IF EXISTS "Users can update own import jobs" ON import_jobs;
DROP POLICY IF EXISTS "System can update import jobs" ON import_jobs;

-- Policies for import_jobs
CREATE POLICY "Users can view own company import jobs"
  ON import_jobs FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create import jobs"
  ON import_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own import jobs"
  ON import_jobs FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Enable realtime for import_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE import_jobs;