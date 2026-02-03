/*
  # Add Intake Type to Assets

  1. New Columns
    - `intake_type` - Inherited from procurement (resale | itad | recycling)
    - `purchase_order_id` - Direct link to procurement (not just via lot)
    - `itad_project_id` - Optional link to ITAD project detail
    - `recycling_order_id` - Optional link to recycling order detail

  2. Changes
    - Add columns as nullable
    - Backfill intake_type from purchase_order via lot
    - Backfill purchase_order_id from lot
    - Create indexes for filtering

  3. Security
    - No RLS changes needed (inherits existing policies)
*/

-- Add columns
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS intake_type text
    CHECK (intake_type IN ('resale', 'itad', 'recycling')),

  ADD COLUMN IF NOT EXISTS purchase_order_id uuid
    REFERENCES purchase_orders(id) ON DELETE SET NULL,

  ADD COLUMN IF NOT EXISTS itad_project_id uuid
    REFERENCES itad_projects(id) ON DELETE SET NULL,

  ADD COLUMN IF NOT EXISTS recycling_order_id uuid
    REFERENCES recycling_orders(id) ON DELETE SET NULL;

-- Backfill purchase_order_id from purchase_lot
UPDATE assets a
SET purchase_order_id = COALESCE(
  a.purchase_order_id,
  (SELECT pl.purchase_order_id
   FROM purchase_lots pl
   WHERE pl.id = a.purchase_lot_id)
)
WHERE a.purchase_lot_id IS NOT NULL
  AND a.purchase_order_id IS NULL;

-- Backfill intake_type from purchase_order
UPDATE assets a
SET intake_type = COALESCE(
  a.intake_type,
  (SELECT po.intake_type
   FROM purchase_orders po
   WHERE po.id = a.purchase_order_id)
)
WHERE a.purchase_order_id IS NOT NULL
  AND a.intake_type IS NULL;

-- Default old assets without purchase_order to 'resale'
UPDATE assets
SET intake_type = 'resale'
WHERE intake_type IS NULL;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_assets_intake_type ON assets(intake_type);
CREATE INDEX IF NOT EXISTS idx_assets_purchase_order_id ON assets(purchase_order_id) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_itad_project_id ON assets(itad_project_id) WHERE itad_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_recycling_order_id ON assets(recycling_order_id) WHERE recycling_order_id IS NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN assets.intake_type IS
  'Inherited from purchase_order: resale (buy-to-resell), itad (client-owned for destruction), recycling (commodity extraction)';

COMMENT ON COLUMN assets.purchase_order_id IS
  'Direct link to procurement record for full traceability. Can be via purchase_lot or direct.';

COMMENT ON COLUMN assets.itad_project_id IS
  'Optional link to ITAD project detail record. Only populated for intake_type=itad assets.';

COMMENT ON COLUMN assets.recycling_order_id IS
  'Optional link to recycling order detail record. Only populated for intake_type=recycling assets.';