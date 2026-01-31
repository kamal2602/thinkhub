/*
  # Add Multi-Currency Support

  1. Overview
    - Add currency fields to purchase orders and line items
    - Support source currency (supplier's currency like USD, JPY) and local currency (AED)
    - Store exchange rates for audit trail
    - Enable automatic conversion during import

  2. Changes to `purchase_orders` table
    - `source_currency` (text) - The supplier's currency (USD, JPY, EUR, etc.)
    - `exchange_rate` (numeric) - Exchange rate from source currency to AED at time of PO
    - `local_currency` (text) - Always 'AED' but stored for consistency
    
  3. Changes to `purchase_order_lines` table
    - `unit_cost_source` (numeric) - Unit cost in supplier's currency
    - `unit_cost` (numeric) - Unit cost converted to AED (existing field)
    - `line_total_source` (numeric) - Line total in supplier's currency
    - `line_total` (numeric) - Line total in AED (existing field)

  4. Security
    - No RLS changes needed - inherits from existing policies

  5. Notes
    - Exchange rate is stored at PO level for consistency across all line items
    - Source amounts are stored for reference and reporting
    - Local (AED) amounts remain the primary calculation basis
    - If source_currency is 'AED', exchange_rate should be 1.0
*/

-- Add currency fields to purchase_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'source_currency'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN source_currency text DEFAULT 'AED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'exchange_rate'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN exchange_rate numeric DEFAULT 1.0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'local_currency'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN local_currency text DEFAULT 'AED';
  END IF;
END $$;

-- Add currency fields to purchase_order_lines
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_order_lines' AND column_name = 'unit_cost_source'
  ) THEN
    ALTER TABLE purchase_order_lines ADD COLUMN unit_cost_source numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_order_lines' AND column_name = 'line_total_source'
  ) THEN
    ALTER TABLE purchase_order_lines ADD COLUMN line_total_source numeric;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN purchase_orders.source_currency IS 'Supplier currency code (USD, JPY, EUR, etc.)';
COMMENT ON COLUMN purchase_orders.exchange_rate IS 'Exchange rate from source currency to AED at time of PO creation';
COMMENT ON COLUMN purchase_orders.local_currency IS 'Local currency - always AED';
COMMENT ON COLUMN purchase_order_lines.unit_cost_source IS 'Unit cost in supplier currency';
COMMENT ON COLUMN purchase_order_lines.unit_cost IS 'Unit cost converted to AED';
COMMENT ON COLUMN purchase_order_lines.line_total_source IS 'Line total in supplier currency';
COMMENT ON COLUMN purchase_order_lines.line_total IS 'Line total in AED';

-- Create index for currency queries
CREATE INDEX IF NOT EXISTS idx_purchase_orders_source_currency ON purchase_orders(source_currency);
