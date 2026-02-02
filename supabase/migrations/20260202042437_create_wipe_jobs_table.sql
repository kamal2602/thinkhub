/*
  # Create Wipe Jobs Table

  1. New Table: wipe_jobs
    - `id` (uuid, primary key)
    - `company_id` (uuid, references companies)
    - `asset_id` (uuid, references assets) - the asset being wiped
    - `provider` ('blancco', 'wipedrive', 'dban', 'manual', 'physical_destruction')
    - `status` ('pending', 'in_progress', 'success', 'failed', 'exception_approved')
    - `wiped_at` (timestamptz) - when wipe completed
    - `wiped_by` (uuid, references profiles) - who performed the wipe
    - `certificate_url` (text) - link to certificate document
    - `certificate_uploaded_at` (timestamptz)
    - `exception_approved_by` (uuid, references profiles)
    - `exception_reason` (text)
    - `notes` (text)
    - `created_at`, `updated_at`

  2. Purpose
    - Track data wiping workflow for ITAD compliance
    - Store evidence of data destruction
    - Manage exceptions where wiping not required

  3. Security
    - Enable RLS
    - Company-scoped access
*/

CREATE TABLE IF NOT EXISTS wipe_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('blancco', 'wipedrive', 'dban', 'manual', 'physical_destruction')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'exception_approved')),
  wiped_at timestamptz,
  wiped_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  certificate_url text,
  certificate_uploaded_at timestamptz,
  exception_approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  exception_reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE wipe_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view wipe jobs in their company"
  ON wipe_jobs FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create wipe jobs in their company"
  ON wipe_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update wipe jobs in their company"
  ON wipe_jobs FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete wipe jobs in their company"
  ON wipe_jobs FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wipe_jobs_company 
  ON wipe_jobs(company_id);

CREATE INDEX IF NOT EXISTS idx_wipe_jobs_asset 
  ON wipe_jobs(asset_id);

CREATE INDEX IF NOT EXISTS idx_wipe_jobs_status 
  ON wipe_jobs(status);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_wipe_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wipe_jobs_updated_at
  BEFORE UPDATE ON wipe_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_wipe_jobs_updated_at();
