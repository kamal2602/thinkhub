/*
  # Create asset_internal_ids table for multiple internal ID tracking

  1. New Tables
    - `asset_internal_ids`
      - `id` (uuid, primary key)
      - `asset_id` (uuid, foreign key to assets)
      - `internal_id` (text) - the barcode value
      - `is_primary` (boolean) - marks the primary/main ID
      - `added_date` (timestamptz)
      - `added_by` (uuid, foreign key to profiles)
      - `reason` (text) - why this ID was added
      - `status` (text) - 'active' or 'replaced'
      - `company_id` (uuid, foreign key)

  2. Features
    - Supports multiple internal IDs per asset
    - Tracks ID history and changes
    - Syncs primary ID back to assets.internal_asset_id

  3. Security
    - Enable RLS on asset_internal_ids table
    - Policies for authenticated users within same company
*/

-- Create asset_internal_ids table
CREATE TABLE IF NOT EXISTS asset_internal_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  internal_id text NOT NULL,
  is_primary boolean DEFAULT false,
  added_date timestamptz DEFAULT now(),
  added_by uuid REFERENCES profiles(id),
  reason text DEFAULT '',
  status text DEFAULT 'active',
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_internal_id_per_company UNIQUE (internal_id, company_id)
);

-- Create indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_asset_internal_ids_asset_id ON asset_internal_ids(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_internal_ids_internal_id ON asset_internal_ids(internal_id);
CREATE INDEX IF NOT EXISTS idx_asset_internal_ids_company_id ON asset_internal_ids(company_id);
CREATE INDEX IF NOT EXISTS idx_asset_internal_ids_status ON asset_internal_ids(status);

-- Enable RLS
ALTER TABLE asset_internal_ids ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view internal IDs in their company"
  ON asset_internal_ids FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert internal IDs in their company"
  ON asset_internal_ids FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update internal IDs in their company"
  ON asset_internal_ids FOR UPDATE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete internal IDs in their company"
  ON asset_internal_ids FOR DELETE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid())
  );

-- Migrate existing internal_asset_id values to new table
INSERT INTO asset_internal_ids (asset_id, internal_id, is_primary, added_date, added_by, reason, status, company_id)
SELECT
  id,
  internal_asset_id,
  true,
  created_at,
  NULL,
  'Migrated from existing data',
  'active',
  company_id
FROM assets
WHERE internal_asset_id IS NOT NULL
  AND internal_asset_id != ''
  AND NOT EXISTS (
    SELECT 1 FROM asset_internal_ids
    WHERE asset_internal_ids.internal_id = assets.internal_asset_id
    AND asset_internal_ids.company_id = assets.company_id
  );

-- Function to sync primary internal_asset_id with assets table
CREATE OR REPLACE FUNCTION sync_primary_internal_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE assets
    SET internal_asset_id = NEW.internal_id
    WHERE id = NEW.asset_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync primary ID
DROP TRIGGER IF EXISTS sync_primary_internal_id_trigger ON asset_internal_ids;
CREATE TRIGGER sync_primary_internal_id_trigger
  AFTER INSERT OR UPDATE ON asset_internal_ids
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION sync_primary_internal_id();

-- Function to auto-set added_by
CREATE OR REPLACE FUNCTION set_internal_id_added_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.added_by IS NULL THEN
    NEW.added_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-set added_by
DROP TRIGGER IF EXISTS set_internal_id_added_by_trigger ON asset_internal_ids;
CREATE TRIGGER set_internal_id_added_by_trigger
  BEFORE INSERT ON asset_internal_ids
  FOR EACH ROW
  EXECUTE FUNCTION set_internal_id_added_by();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_asset_internal_ids_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_asset_internal_ids_updated_at_trigger ON asset_internal_ids;
CREATE TRIGGER update_asset_internal_ids_updated_at_trigger
  BEFORE UPDATE ON asset_internal_ids
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_internal_ids_updated_at();

COMMENT ON TABLE asset_internal_ids IS 'Tracks multiple internal IDs/barcodes for each asset';
COMMENT ON COLUMN asset_internal_ids.internal_id IS 'Company-assigned internal ID/barcode value';
COMMENT ON COLUMN asset_internal_ids.is_primary IS 'Marks the primary ID that syncs to assets.internal_asset_id';
COMMENT ON COLUMN asset_internal_ids.status IS 'active or replaced - allows tracking ID history';
