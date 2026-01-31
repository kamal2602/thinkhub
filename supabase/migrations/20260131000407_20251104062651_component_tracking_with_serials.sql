/*
  # Add Component Tracking System with Serial Numbers

  ## Overview
  Enable tracking of individual components (RAM sticks, HDDs, SSDs) within assets
  with unique serial numbers for harvesting, inventory, and barcode scanning.

  ## Changes

  1. **New Table: asset_components**
     - Tracks individual components within an asset
     - Includes component_serial for unique identification
     - Supports RAM, HDD, SSD, NVMe, etc.

  2. **New Table: harvested_components_inventory**
     - Tracks harvested components available for reuse
     - Each component has unique serial number
     - Links back to source asset

  3. **New Table: component_transactions**
     - Audit trail of all component movements
     - Tracks harvest, install, transfer operations

  ## Security
  - RLS enabled on all tables
  - Company-based access control
  - Staff+ can manage components
*/

-- Asset Components (tracks what's installed in each asset)
CREATE TABLE IF NOT EXISTS asset_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE NOT NULL,

  -- Component Details
  component_type text NOT NULL CHECK (component_type IN ('RAM', 'HDD', 'SSD', 'NVMe', 'Battery', 'Screen', 'Keyboard', 'Other')),
  component_name text NOT NULL,

  -- Specifications
  component_serial text UNIQUE,
  capacity text,
  capacity_value numeric,
  capacity_unit text,
  quantity int DEFAULT 1 NOT NULL,
  technology_type text,
  manufacturer text,
  model_number text,
  interface_type text,
  form_factor text,

  -- Status
  status text DEFAULT 'installed' CHECK (status IN ('installed', 'harvested', 'transferred', 'disposed', 'defective')),
  condition text DEFAULT 'working' CHECK (condition IN ('working', 'tested', 'untested', 'defective')),

  -- Tracking
  installed_date timestamptz DEFAULT now(),
  harvested_date timestamptz,
  harvested_by uuid REFERENCES auth.users(id),
  transferred_to_asset_id uuid REFERENCES assets(id),

  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE asset_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view components in their companies"
  ON asset_components FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = asset_components.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage components"
  ON asset_components FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = asset_components.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Harvested Components Inventory (loose components available for reuse)
CREATE TABLE IF NOT EXISTS harvested_components_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  -- Component Details
  component_type text NOT NULL CHECK (component_type IN ('RAM', 'HDD', 'SSD', 'NVMe', 'Battery', 'Screen', 'Keyboard', 'Other')),
  component_name text NOT NULL,

  -- Specifications
  component_serial text UNIQUE NOT NULL,
  capacity text,
  capacity_value numeric,
  capacity_unit text,
  technology_type text,
  manufacturer text,
  model_number text,
  interface_type text,
  form_factor text,

  -- Inventory (only 1 component per serial, so always 1 or 0)
  quantity_available int DEFAULT 1 NOT NULL,
  quantity_reserved int DEFAULT 0 NOT NULL,
  quantity_defective int DEFAULT 0 NOT NULL,

  -- Source tracking - which asset was this harvested from
  source_asset_id uuid REFERENCES assets(id),
  source_serial_number text,

  -- Location
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  bin_location text,

  -- Pricing
  estimated_value decimal(15,2),

  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE harvested_components_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view harvested inventory in their companies"
  ON harvested_components_inventory FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = harvested_components_inventory.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage harvested inventory"
  ON harvested_components_inventory FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = harvested_components_inventory.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Component Transaction Log (tracks all component movements)
CREATE TABLE IF NOT EXISTS component_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  transaction_type text NOT NULL CHECK (transaction_type IN ('harvest', 'install', 'transfer', 'dispose', 'test', 'reserve', 'unreserve')),
  component_id uuid REFERENCES asset_components(id) ON DELETE SET NULL,

  -- Source and Destination
  source_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  destination_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,

  -- Component Details
  component_type text NOT NULL,
  component_name text NOT NULL,
  quantity int DEFAULT 1,

  -- Reason
  reason text,
  notes text,

  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now()
);

ALTER TABLE component_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view component transactions in their companies"
  ON component_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = component_transactions.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can create component transactions"
  ON component_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = component_transactions.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Function to parse component patterns
CREATE OR REPLACE FUNCTION parse_component_pattern(input_text text)
RETURNS jsonb AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  parts text[];
  capacity text;
  quantity int;
  i int;
BEGIN
  IF input_text IS NULL OR trim(input_text) = '' THEN
    RETURN result;
  END IF;

  input_text := trim(input_text);

  -- Pattern: "2x8GB" or "2 x 8GB"
  IF input_text ~* '^(\d+)\s*[X×x]\s*(\d+)\s*(GB|TB|MHz)' THEN
    parts := regexp_matches(input_text, '^(\d+)\s*[X×x]\s*(\d+)\s*(GB|TB|MHz)', 'i');
    quantity := parts[1]::int;
    capacity := parts[2] || parts[3];
    FOR i IN 1..quantity LOOP
      result := result || jsonb_build_object('capacity', capacity, 'quantity', 1);
    END LOOP;
    RETURN result;
  END IF;

  -- Pattern: "8GB X2"
  IF input_text ~* '(\d+)\s*(GB|TB|MHz)?\s*[X×x*]\s*(\d+)' THEN
    capacity := substring(input_text from '(\d+\s*(?:GB|TB|MHz)?)');
    quantity := substring(input_text from '[X×x*]\s*(\d+)')::int;
    FOR i IN 1..quantity LOOP
      result := result || jsonb_build_object('capacity', capacity, 'quantity', 1);
    END LOOP;
    RETURN result;
  END IF;

  -- Default: single component
  result := result || jsonb_build_object('capacity', input_text, 'quantity', 1);
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract technology type
CREATE OR REPLACE FUNCTION extract_technology_type(input_text text)
RETURNS text AS $$
DECLARE
  lower_text text;
BEGIN
  IF input_text IS NULL THEN RETURN NULL; END IF;
  lower_text := lower(input_text);
  IF lower_text LIKE '%ddr5%' THEN RETURN 'DDR5'; END IF;
  IF lower_text LIKE '%ddr4%' THEN RETURN 'DDR4'; END IF;
  IF lower_text LIKE '%ddr3%' THEN RETURN 'DDR3'; END IF;
  IF lower_text LIKE '%nvme%' THEN RETURN 'NVMe'; END IF;
  IF lower_text LIKE '%ssd%' THEN RETURN 'SSD'; END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to auto-create components from asset specs
CREATE OR REPLACE FUNCTION create_components_from_asset()
RETURNS TRIGGER AS $$
DECLARE
  ram_components jsonb;
  storage_components jsonb;
  component_record jsonb;
BEGIN
  IF NEW.ram IS NOT NULL AND NEW.ram != '' THEN
    ram_components := parse_component_pattern(NEW.ram);
    FOR component_record IN SELECT * FROM jsonb_array_elements(ram_components)
    LOOP
      INSERT INTO asset_components (
        company_id, asset_id, component_type, component_name,
        capacity, quantity, technology_type, status, created_by
      ) VALUES (
        NEW.company_id, NEW.id, 'RAM',
        'RAM ' || (component_record->>'capacity'),
        component_record->>'capacity', 1,
        extract_technology_type(NEW.ram), 'installed', NEW.created_by
      );
    END LOOP;
  END IF;

  IF NEW.storage IS NOT NULL AND NEW.storage != '' THEN
    storage_components := parse_component_pattern(NEW.storage);
    FOR component_record IN SELECT * FROM jsonb_array_elements(storage_components)
    LOOP
      DECLARE
        storage_type text := CASE
          WHEN (component_record->>'capacity') ILIKE '%SSD%' OR
               (component_record->>'capacity') ILIKE '%NVMe%' THEN 'SSD'
          ELSE 'HDD'
        END;
      BEGIN
        INSERT INTO asset_components (
          company_id, asset_id, component_type, component_name,
          capacity, quantity, technology_type, status, created_by
        ) VALUES (
          NEW.company_id, NEW.id, storage_type,
          storage_type || ' ' || (component_record->>'capacity'),
          component_record->>'capacity', 1,
          extract_technology_type(NEW.storage), 'installed', NEW.created_by
        );
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create components
DROP TRIGGER IF EXISTS auto_create_components ON assets;
CREATE TRIGGER auto_create_components
  AFTER INSERT ON assets
  FOR EACH ROW
  EXECUTE FUNCTION create_components_from_asset();

-- Backfill existing assets
DO $$
DECLARE
  asset_record RECORD;
  ram_components jsonb;
  storage_components jsonb;
  component_record jsonb;
BEGIN
  FOR asset_record IN
    SELECT a.* FROM assets a
    WHERE NOT EXISTS (SELECT 1 FROM asset_components ac WHERE ac.asset_id = a.id)
  LOOP
    IF asset_record.ram IS NOT NULL AND asset_record.ram != '' THEN
      ram_components := parse_component_pattern(asset_record.ram);
      FOR component_record IN SELECT * FROM jsonb_array_elements(ram_components)
      LOOP
        INSERT INTO asset_components (
          company_id, asset_id, component_type, component_name,
          capacity, quantity, technology_type, status, created_by
        ) VALUES (
          asset_record.company_id, asset_record.id, 'RAM',
          'RAM ' || (component_record->>'capacity'),
          component_record->>'capacity', 1,
          extract_technology_type(asset_record.ram), 'installed', asset_record.created_by
        );
      END LOOP;
    END IF;

    IF asset_record.storage IS NOT NULL AND asset_record.storage != '' THEN
      storage_components := parse_component_pattern(asset_record.storage);
      FOR component_record IN SELECT * FROM jsonb_array_elements(storage_components)
      LOOP
        DECLARE
          storage_type text := CASE
            WHEN (component_record->>'capacity') ILIKE '%SSD%' OR
                 (component_record->>'capacity') ILIKE '%NVMe%' THEN 'SSD'
            ELSE 'HDD'
          END;
        BEGIN
          INSERT INTO asset_components (
            company_id, asset_id, component_type, component_name,
            capacity, quantity, technology_type, status, created_by
          ) VALUES (
            asset_record.company_id, asset_record.id, storage_type,
            storage_type || ' ' || (component_record->>'capacity'),
            component_record->>'capacity', 1,
            extract_technology_type(asset_record.storage), 'installed', asset_record.created_by
          );
        END;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_components_asset ON asset_components(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_components_serial ON asset_components(component_serial) WHERE component_serial IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_harvested_inventory_serial ON harvested_components_inventory(component_serial);
CREATE INDEX IF NOT EXISTS idx_component_transactions_date ON component_transactions(company_id, performed_at DESC);