/*
  # Link ITAD Projects to Procurement

  1. Changes
    - Add purchase_order_id to itad_projects
    - Create retroactive purchase_orders for orphaned projects
    - Create corresponding purchase_lots for receiving
    - Link assets to both ITAD project and procurement

  2. Strategy
    - For each orphaned ITAD project, create a purchase_order with intake_type='itad'
    - Create a purchase_lot for receiving tracking
    - Link project to new PO
    - Update any assets that reference this project

  3. Security
    - No RLS changes needed (inherits existing policies)
*/

-- Add purchase_order_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itad_projects' AND column_name = 'purchase_order_id'
  ) THEN
    ALTER TABLE itad_projects
      ADD COLUMN purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create retroactive purchase_orders for orphaned ITAD projects
DO $$
DECLARE
  project_rec RECORD;
  new_po_id uuid;
  new_lot_id uuid;
BEGIN
  FOR project_rec IN
    SELECT * FROM itad_projects WHERE purchase_order_id IS NULL
  LOOP
    -- Create purchase_order
    INSERT INTO purchase_orders (
      company_id,
      po_number,
      intake_type,
      commercial_model,
      processing_intent,
      client_party_id,
      order_date,
      status,
      source_channel,
      compliance_profile,
      notes,
      created_by,
      created_at
    ) VALUES (
      project_rec.company_id,
      'ITAD-' || project_rec.project_number,
      'itad',
      'client_pays',
      'resale',  -- Default, can be updated
      project_rec.itad_customer_id,
      COALESCE(project_rec.start_date, CURRENT_DATE),
      CASE
        WHEN project_rec.status = 'completed' THEN 'closed'
        WHEN project_rec.status = 'in_progress' THEN 'submitted'
        ELSE 'draft'
      END,
      'manual',
      'india',
      'Auto-created from legacy ITAD project: ' || COALESCE(project_rec.project_name, project_rec.project_number),
      project_rec.created_by,
      project_rec.created_at
    )
    RETURNING id INTO new_po_id;

    -- Link project to PO
    UPDATE itad_projects
    SET purchase_order_id = new_po_id
    WHERE id = project_rec.id;

    -- Create purchase_lot for receiving
    INSERT INTO purchase_lots (
      company_id,
      lot_number,
      purchase_order_id,
      purchase_date,
      receiving_status,
      expected_qty,
      created_by,
      created_at
    ) VALUES (
      project_rec.company_id,
      'ITAD-LOT-' || project_rec.project_number,
      new_po_id,
      COALESCE(project_rec.start_date, CURRENT_DATE),
      CASE
        WHEN project_rec.actual_quantity > 0 THEN 'complete'
        ELSE 'waiting'
      END,
      project_rec.expected_quantity,
      project_rec.created_by,
      project_rec.created_at
    )
    RETURNING id INTO new_lot_id;

    -- Update any assets that might be linked to this project
    -- Link them to the new procurement structure
    UPDATE assets
    SET
      purchase_order_id = new_po_id,
      intake_type = 'itad'
    WHERE itad_project_id = project_rec.id
      AND purchase_order_id IS NULL;

    RAISE NOTICE 'Created PO % and LOT % for ITAD project %', new_po_id, new_lot_id, project_rec.id;
  END LOOP;
END $$;

-- Create index for purchase_order_id lookups
CREATE INDEX IF NOT EXISTS idx_itad_projects_purchase_order_id ON itad_projects(purchase_order_id);

-- Add helpful comment
COMMENT ON COLUMN itad_projects.purchase_order_id IS
  'ITAD project is a DETAIL record linked to a procurement (intake_type=itad). The procurement represents the inbound event, while the project stores ITAD-specific commercial terms.';