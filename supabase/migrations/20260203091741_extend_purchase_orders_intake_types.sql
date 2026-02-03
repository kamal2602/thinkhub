/*
  # Extend purchase_orders for All Intake Types

  1. New Columns
    - `intake_type` (resale | itad | recycling) - Type of inbound material
    - `commercial_model` (we_buy | client_pays | hybrid) - Who pays whom
    - `processing_intent` (resale | recycle | hybrid) - What we do with material
    - `client_party_id` - For ITAD/Recycling when client sends equipment
    - `source_channel` - How intake was created (manual, excel, portal, etc)
    - `compliance_profile` - Regulatory compliance profile (india, eu, us)

  2. Changes
    - Add new columns as nullable
    - Backfill existing records with defaults
    - Set NOT NULL constraints after backfill
    - Add check constraints for enum values

  3. Security
    - No RLS changes needed (inherits existing policies)
*/

-- Add new columns to purchase_orders
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS intake_type text
    CHECK (intake_type IN ('resale', 'itad', 'recycling')),

  ADD COLUMN IF NOT EXISTS commercial_model text
    CHECK (commercial_model IN ('we_buy', 'client_pays', 'hybrid')),

  ADD COLUMN IF NOT EXISTS processing_intent text
    CHECK (processing_intent IN ('resale', 'recycle', 'hybrid')),

  ADD COLUMN IF NOT EXISTS client_party_id uuid
    REFERENCES contacts(id) ON DELETE SET NULL,

  ADD COLUMN IF NOT EXISTS source_channel text
    CHECK (source_channel IN ('manual', 'excel', 'portal', 'website', 'api'))
    DEFAULT 'manual',

  ADD COLUMN IF NOT EXISTS compliance_profile text
    DEFAULT 'india';

-- Backfill existing purchase orders with sensible defaults
UPDATE purchase_orders
SET
  intake_type = 'resale',
  commercial_model = 'we_buy',
  processing_intent = 'resale',
  source_channel = CASE
    WHEN source_file_name IS NOT NULL THEN 'excel'
    ELSE 'manual'
  END,
  compliance_profile = 'india'
WHERE intake_type IS NULL;

-- Make intake_type, commercial_model, and processing_intent required
ALTER TABLE purchase_orders
  ALTER COLUMN intake_type SET DEFAULT 'resale',
  ALTER COLUMN intake_type SET NOT NULL;

ALTER TABLE purchase_orders
  ALTER COLUMN commercial_model SET DEFAULT 'we_buy',
  ALTER COLUMN commercial_model SET NOT NULL;

ALTER TABLE purchase_orders
  ALTER COLUMN processing_intent SET DEFAULT 'resale',
  ALTER COLUMN processing_intent SET NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN purchase_orders.intake_type IS
  'Type of inbound: resale (buying to resell), itad (client sends for destruction), recycling (bulk commodities)';

COMMENT ON COLUMN purchase_orders.commercial_model IS
  'Who pays: we_buy (we pay supplier), client_pays (client pays us for service), hybrid (revenue share)';

COMMENT ON COLUMN purchase_orders.processing_intent IS
  'What we do: resale (refurb & sell), recycle (dismantle for commodities), hybrid (cherry-pick then recycle)';

COMMENT ON COLUMN purchase_orders.client_party_id IS
  'For ITAD/Recycling: the customer/client sending equipment. For Resale: optional end-customer reference. Mutually exclusive with supplier_id in some cases.';

COMMENT ON COLUMN purchase_orders.source_channel IS
  'How this intake was created: manual (UI), excel (bulk import), portal (customer self-service), website (public form), api (programmatic)';

COMMENT ON COLUMN purchase_orders.compliance_profile IS
  'Regulatory compliance profile for this intake (india, eu, us, etc). Used for ITAD certificate generation and reporting.';

-- Create index for filtering by intake_type
CREATE INDEX IF NOT EXISTS idx_purchase_orders_intake_type ON purchase_orders(intake_type);

-- Create index for client_party_id lookups
CREATE INDEX IF NOT EXISTS idx_purchase_orders_client_party_id ON purchase_orders(client_party_id) WHERE client_party_id IS NOT NULL;