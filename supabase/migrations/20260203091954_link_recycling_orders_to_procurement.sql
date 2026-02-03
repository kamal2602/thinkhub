/*
  # Link Recycling Orders to Procurement

  1. Changes
    - Add purchase_order_id to recycling_orders
    - Create retroactive purchase_orders for orphaned orders
    - Create corresponding purchase_lots for receiving
    - Link assets/commodities to both recycling order and procurement

  2. Strategy
    - For each orphaned recycling order, create a purchase_order with intake_type='recycling'
    - Create a purchase_lot for receiving tracking with weight fields
    - Link order to new PO
    - Update any assets that reference this order

  3. Security
    - No RLS changes needed (inherits existing policies)
*/

-- Add purchase_order_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recycling_orders' AND column_name = 'purchase_order_id'
  ) THEN
    ALTER TABLE recycling_orders
      ADD COLUMN purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create retroactive purchase_orders for orphaned recycling orders
DO $$
DECLARE
  order_rec RECORD;
  new_po_id uuid;
  new_lot_id uuid;
BEGIN
  FOR order_rec IN
    SELECT * FROM recycling_orders WHERE purchase_order_id IS NULL
  LOOP
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
      order_rec.company_id,
      'REC-' || order_rec.order_number,
      'recycling',
      CASE
        WHEN order_rec.contact_id IS NOT NULL THEN 'client_pays'
        ELSE 'we_buy'
      END,
      COALESCE(order_rec.processing_intent, 'recycle'),
      order_rec.contact_id,
      COALESCE(order_rec.order_date, CURRENT_DATE),
      CASE
        WHEN order_rec.status = 'completed' THEN 'closed'
        WHEN order_rec.status = 'in_progress' THEN 'submitted'
        ELSE 'draft'
      END,
      'manual',
      'india',
      'Auto-created from legacy recycling order',
      (SELECT created_by FROM user_company_access WHERE company_id = order_rec.company_id LIMIT 1),
      order_rec.created_at
    )
    RETURNING id INTO new_po_id;

    UPDATE recycling_orders
    SET purchase_order_id = new_po_id
    WHERE id = order_rec.id;

    -- Create purchase_lot with weight tracking
    INSERT INTO purchase_lots (
      company_id,
      lot_number,
      purchase_order_id,
      purchase_date,
      receiving_status,
      expected_weight_kg,
      actual_weight_kg,
      created_by,
      created_at
    ) VALUES (
      order_rec.company_id,
      'REC-LOT-' || order_rec.order_number,
      new_po_id,
      COALESCE(order_rec.order_date, CURRENT_DATE),
      CASE
        WHEN order_rec.total_weight > 0 THEN 'complete'
        ELSE 'waiting'
      END,
      order_rec.expected_weight,
      order_rec.total_weight,
      (SELECT created_by FROM user_company_access WHERE company_id = order_rec.company_id LIMIT 1),
      order_rec.created_at
    )
    RETURNING id INTO new_lot_id;

    -- Update any assets that might be linked to this recycling order
    UPDATE assets
    SET
      purchase_order_id = new_po_id,
      intake_type = 'recycling'
    WHERE recycling_order_id = order_rec.id
      AND purchase_order_id IS NULL;

    RAISE NOTICE 'Created PO % and LOT % for recycling order %', new_po_id, new_lot_id, order_rec.id;
  END LOOP;
END $$;

-- Create index for purchase_order_id lookups
CREATE INDEX IF NOT EXISTS idx_recycling_orders_purchase_order_id ON recycling_orders(purchase_order_id);

-- Add helpful comment
COMMENT ON COLUMN recycling_orders.purchase_order_id IS
  'Recycling order is a DETAIL record linked to a procurement (intake_type=recycling). The procurement represents the inbound event, while the order stores recycling-specific details like weight and commodity outputs.';