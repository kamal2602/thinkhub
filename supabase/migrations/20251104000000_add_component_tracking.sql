/*
  # Add Component Tracking System

  ## Overview
  Enable tracking of individual components (RAM sticks, HDDs, SSDs) within assets
  to support harvesting, inventory management, and component-level operations.

  ## Problem Being Solved
  - Suppliers list components as "8GB X2" or "256GB/1TB" for multiple components
  - Need to track individual RAM sticks, drives for harvesting operations
  - Must know exactly what components are installed vs available
  - Support removing 1x8GB RAM from a 16GB (2x8GB) system for reuse

  ## Changes

  1. **New Table: asset_components**
     - Tracks individual components within an asset
     - Supports RAM, HDD, SSD, NVMe, etc.
     - Records quantity, capacity, and status
     - Enables harvesting workflow

  2. **Component Types**
     - RAM: Memory modules (DDR3, DDR4, DDR5)
     - HDD: Hard disk drives
     - SSD: Solid state drives (SATA, NVMe, M.2)
     - Other: Batteries, screens, keyboards, etc.

  3. **Component Status**
     - installed: Currently in the asset
     - harvested: Removed for separate inventory
     - transferred: Moved to another asset
     - disposed: No longer usable

  4. **Harvested Components Inventory**
     - Separate table for harvested components
     - Track available loose components
     - Link back to source asset

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
  updated_at timestamptz DEFAULT now(),

  UNIQUE(company_id, component_type, component_name, capacity, manufacturer)
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

  -- Component Details (stored in case component is deleted)
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

-- Function to parse component patterns like "8GB X2", "8GB * 2", "256GB/1TB", "1TB Hynix/2TB Samsung"
CREATE OR REPLACE FUNCTION parse_component_pattern(input_text text)
RETURNS jsonb AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  pattern text;
  parts text[];
  capacity text;
  quantity int;
  i int;
BEGIN
  -- Handle null or empty input
  IF input_text IS NULL OR trim(input_text) = '' THEN
    RETURN result;
  END IF;

  -- Clean input
  input_text := trim(input_text);

  -- Pattern 1: "2x8GB" or "2 x 8GB" (prefix multiplier - check FIRST)
  IF input_text ~* '^(\d+)\s*[X×x]\s*(\d+)\s*(GB|TB|MHz)' THEN
    parts := regexp_matches(input_text, '^(\d+)\s*[X×x]\s*(\d+)\s*(GB|TB|MHz)', 'i');
    quantity := parts[1]::int;
    capacity := parts[2] || parts[3];

    FOR i IN 1..quantity LOOP
      result := result || jsonb_build_object(
        'capacity', capacity,
        'quantity', 1
      );
    END LOOP;
    RETURN result;
  END IF;

  -- Pattern 2: "8GB X2" or "8GB * 2" or "8GB×2" (suffix multiplier, including asterisk)
  IF input_text ~* '(\d+)\s*(GB|TB|MHz)?\s*[X×x*]\s*(\d+)' THEN
    capacity := substring(input_text from '(\d+\s*(?:GB|TB|MHz)?)');
    quantity := substring(input_text from '[X×x*]\s*(\d+)')::int;

    FOR i IN 1..quantity LOOP
      result := result || jsonb_build_object(
        'capacity', capacity,
        'quantity', 1
      );
    END LOOP;
    RETURN result;
  END IF;

  -- Pattern 3: "16GB (2x8GB)" - extract detail in parentheses
  IF input_text ~* '\((\d+)\s*[X×x*]\s*(\d+)\s*(GB|TB|MHz)\)' THEN
    parts := regexp_matches(input_text, '\((\d+)\s*[X×x*]\s*(\d+)\s*(GB|TB|MHz)\)', 'i');
    quantity := parts[1]::int;
    capacity := parts[2] || parts[3];

    FOR i IN 1..quantity LOOP
      result := result || jsonb_build_object(
        'capacity', capacity,
        'quantity', 1
      );
    END LOOP;
    RETURN result;
  END IF;

  -- Pattern 4: "256GB/1TB" or "256GB + 1TB" or "8GB + 8GB" or "1TB Hynix/2TB Samsung" (remove brand names)
  IF input_text ~* '(\d+\s*(?:GB|TB)(?:\s+[A-Za-z]+)?)\s*[/+&,]\s*(\d+\s*(?:GB|TB)(?:\s+[A-Za-z]+)?)' THEN
    parts := regexp_matches(input_text, '(\d+\s*(?:GB|TB)(?:\s+[A-Za-z]+)?)\s*[/+&,]\s*(\d+\s*(?:GB|TB)(?:\s+[A-Za-z]+)?)', 'i');

    -- Extract just the capacity, remove brand names
    capacity := (regexp_matches(parts[1], '(\d+\s*(?:GB|TB))', 'i'))[1];
    result := result || jsonb_build_object('capacity', trim(capacity), 'quantity', 1);

    capacity := (regexp_matches(parts[2], '(\d+\s*(?:GB|TB))', 'i'))[1];
    result := result || jsonb_build_object('capacity', trim(capacity), 'quantity', 1);
    RETURN result;
  END IF;

  -- Pattern 5: Simple "16GB" or "512GB SSD"
  IF input_text ~* '\d+\s*(GB|TB|MHz)' THEN
    result := result || jsonb_build_object(
      'capacity', input_text,
      'quantity', 1
    );
    RETURN result;
  END IF;

  -- Default: return as-is
  result := result || jsonb_build_object(
    'capacity', input_text,
    'quantity', 1
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract technology type (DDR3/DDR4, SSD/HDD, etc.)
CREATE OR REPLACE FUNCTION extract_technology_type(input_text text)
RETURNS text AS $$
DECLARE
  lower_text text;
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;

  lower_text := lower(input_text);

  -- RAM types
  IF lower_text LIKE '%ddr5%' THEN RETURN 'DDR5'; END IF;
  IF lower_text LIKE '%ddr4%' THEN RETURN 'DDR4'; END IF;
  IF lower_text LIKE '%ddr3%' THEN RETURN 'DDR3'; END IF;
  IF lower_text LIKE '%ddr2%' THEN RETURN 'DDR2'; END IF;

  -- Storage types
  IF lower_text LIKE '%nvme%' THEN RETURN 'NVMe'; END IF;
  IF lower_text LIKE '%m.2%' THEN RETURN 'M.2'; END IF;
  IF lower_text LIKE '%ssd%' THEN RETURN 'SSD'; END IF;
  IF lower_text LIKE '%hdd%' THEN RETURN 'HDD'; END IF;

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
  -- Parse RAM if present
  IF NEW.ram IS NOT NULL AND NEW.ram != '' THEN
    ram_components := parse_component_pattern(NEW.ram);

    FOR component_record IN SELECT * FROM jsonb_array_elements(ram_components)
    LOOP
      INSERT INTO asset_components (
        company_id,
        asset_id,
        component_type,
        component_name,
        capacity,
        quantity,
        technology_type,
        status,
        created_by
      ) VALUES (
        NEW.company_id,
        NEW.id,
        'RAM',
        'RAM ' || (component_record->>'capacity'),
        component_record->>'capacity',
        (component_record->>'quantity')::int,
        extract_technology_type(NEW.ram),
        'installed',
        NEW.created_by
      );
    END LOOP;
  END IF;

  -- Parse Storage if present
  IF NEW.storage IS NOT NULL AND NEW.storage != '' THEN
    storage_components := parse_component_pattern(NEW.storage);

    FOR component_record IN SELECT * FROM jsonb_array_elements(storage_components)
    LOOP
      -- Determine storage type from capacity string
      DECLARE
        storage_type text := 'HDD';
      BEGIN
        IF (component_record->>'capacity') ILIKE '%SSD%' OR
           (component_record->>'capacity') ILIKE '%NVMe%' OR
           (component_record->>'capacity') ILIKE '%M.2%' THEN
          storage_type := 'SSD';
        END IF;

        INSERT INTO asset_components (
          company_id,
          asset_id,
          component_type,
          component_name,
          capacity,
          quantity,
          technology_type,
          status,
          created_by
        ) VALUES (
          NEW.company_id,
          NEW.id,
          storage_type,
          storage_type || ' ' || (component_record->>'capacity'),
          component_record->>'capacity',
          (component_record->>'quantity')::int,
          extract_technology_type(NEW.storage),
          'installed',
          NEW.created_by
        );
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create components when asset is created
DROP TRIGGER IF EXISTS auto_create_components ON assets;
CREATE TRIGGER auto_create_components
  AFTER INSERT ON assets
  FOR EACH ROW
  EXECUTE FUNCTION create_components_from_asset();

-- Backfill components for existing assets
-- This will parse RAM and storage fields from existing assets and create component records
DO $$
DECLARE
  asset_record RECORD;
  ram_components jsonb;
  storage_components jsonb;
  component_record jsonb;
BEGIN
  -- Loop through all existing assets that don't have components yet
  FOR asset_record IN
    SELECT a.*
    FROM assets a
    WHERE NOT EXISTS (
      SELECT 1 FROM asset_components ac WHERE ac.asset_id = a.id
    )
  LOOP
    -- Parse RAM if present
    IF asset_record.ram IS NOT NULL AND asset_record.ram != '' THEN
      ram_components := parse_component_pattern(asset_record.ram);

      FOR component_record IN SELECT * FROM jsonb_array_elements(ram_components)
      LOOP
        INSERT INTO asset_components (
          company_id,
          asset_id,
          component_type,
          component_name,
          capacity,
          quantity,
          technology_type,
          status,
          created_by
        ) VALUES (
          asset_record.company_id,
          asset_record.id,
          'RAM',
          'RAM ' || (component_record->>'capacity'),
          component_record->>'capacity',
          (component_record->>'quantity')::int,
          extract_technology_type(asset_record.ram),
          'installed',
          asset_record.created_by
        );
      END LOOP;
    END IF;

    -- Parse Storage if present
    IF asset_record.storage IS NOT NULL AND asset_record.storage != '' THEN
      storage_components := parse_component_pattern(asset_record.storage);

      FOR component_record IN SELECT * FROM jsonb_array_elements(storage_components)
      LOOP
        DECLARE
          storage_type text := 'HDD';
        BEGIN
          IF (component_record->>'capacity') ILIKE '%SSD%' OR
             (component_record->>'capacity') ILIKE '%NVMe%' OR
             (component_record->>'capacity') ILIKE '%M.2%' THEN
            storage_type := 'SSD';
          END IF;

          INSERT INTO asset_components (
            company_id,
            asset_id,
            component_type,
            component_name,
            capacity,
            quantity,
            technology_type,
            status,
            created_by
          ) VALUES (
            asset_record.company_id,
            asset_record.id,
            storage_type,
            storage_type || ' ' || (component_record->>'capacity'),
            component_record->>'capacity',
            (component_record->>'quantity')::int,
            extract_technology_type(asset_record.storage),
            'installed',
            asset_record.created_by
          );
        END;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_components_asset ON asset_components(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_components_type ON asset_components(company_id, component_type);
CREATE INDEX IF NOT EXISTS idx_asset_components_status ON asset_components(company_id, status);
CREATE INDEX IF NOT EXISTS idx_harvested_inventory_type ON harvested_components_inventory(company_id, component_type);
CREATE INDEX IF NOT EXISTS idx_component_transactions_asset ON component_transactions(source_asset_id, destination_asset_id);
CREATE INDEX IF NOT EXISTS idx_component_transactions_date ON component_transactions(company_id, performed_at DESC);

-- Add helper view for component summary
CREATE OR REPLACE VIEW asset_component_summary AS
SELECT
  a.id as asset_id,
  a.serial_number,
  a.company_id,
  json_agg(
    json_build_object(
      'type', ac.component_type,
      'name', ac.component_name,
      'capacity', ac.capacity,
      'quantity', ac.quantity,
      'status', ac.status
    )
  ) as components
FROM assets a
LEFT JOIN asset_components ac ON ac.asset_id = a.id
GROUP BY a.id, a.serial_number, a.company_id;
