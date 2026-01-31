/*
  # Add internal_asset_id column to assets table

  ## Problem
  Frontend code references assets.internal_id but the column doesn't exist.
  The internal ID system migration was never applied.

  ## Changes
  - Add `internal_asset_id` text column to assets table
  - Add index for fast searching by internal ID
  - Make it nullable since existing assets may not have internal IDs

  ## Notes
  - This is a simpler backward-compatible approach
  - Companies can assign internal IDs as needed
*/

-- Add internal_asset_id column
ALTER TABLE assets ADD COLUMN IF NOT EXISTS internal_asset_id text;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_assets_internal_asset_id ON assets(internal_asset_id);

COMMENT ON COLUMN assets.internal_asset_id IS 'Company-assigned internal asset ID / barcode for tracking';
