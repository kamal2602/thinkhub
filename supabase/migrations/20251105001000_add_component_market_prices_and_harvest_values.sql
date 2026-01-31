/*
  # Add Component Market Prices and Harvest Value Tracking

  ## Overview
  Enable tracking of market prices for harvested components to calculate accurate P/L
  by purchase lot. Users can set standard market prices for common components and
  track the value created when harvesting.

  ## Changes

  1. **New Table: component_market_prices**
     - Master price list for common components
     - Company-specific pricing
     - Price history tracking
     - Auto-apply settings for harvest operations

  2. **Enhance: harvested_components_inventory**
     - Add market_value_at_harvest field
     - Track value created during harvest
     - Link to price source (template, manual, etc.)

  3. **Functions**
     - get_suggested_component_price() - Smart price suggestions
     - calculate_lot_component_value() - Total harvested value per lot

  ## Security
  - RLS enabled on all tables
  - Company-based access control
  - Staff+ can manage prices
*/

-- Component Market Prices (master price list)
CREATE TABLE IF NOT EXISTS component_market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  -- Component Specification
  component_type text NOT NULL CHECK (component_type IN ('RAM', 'HDD', 'SSD', 'NVMe', 'Battery', 'Screen', 'Keyboard', 'Other')),
  component_name text NOT NULL,
  capacity text,
  technology_type text,
  manufacturer text,

  -- Pricing
  current_market_price decimal(15,2) NOT NULL CHECK (current_market_price >= 0),
  currency text DEFAULT 'USD' NOT NULL,

  -- Price History (JSONB array of {price, date, updated_by})
  price_history jsonb DEFAULT '[]'::jsonb,

  -- Settings
  auto_apply boolean DEFAULT true,
  is_active boolean DEFAULT true,

  -- Metadata
  notes text,
  last_updated timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),

  -- Unique constraint: one price per component spec per company
  UNIQUE(company_id, component_type, capacity, technology_type, manufacturer)
);

ALTER TABLE component_market_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view component prices in their companies"
  ON component_market_prices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = component_market_prices.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage component prices"
  ON component_market_prices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = component_market_prices.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Add market value tracking to harvested components
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'harvested_components_inventory'
    AND column_name = 'market_value_at_harvest'
  ) THEN
    ALTER TABLE harvested_components_inventory
      ADD COLUMN market_value_at_harvest decimal(15,2),
      ADD COLUMN value_source text DEFAULT 'manual' CHECK (value_source IN ('template', 'manual', 'suggested', 'imported')),
      ADD COLUMN harvest_date timestamptz DEFAULT now(),
      ADD COLUMN harvested_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Function to get suggested component price
CREATE OR REPLACE FUNCTION get_suggested_component_price(
  p_company_id uuid,
  p_component_type text,
  p_capacity text,
  p_technology_type text DEFAULT NULL,
  p_manufacturer text DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_template_price decimal(15,2);
  v_recent_avg decimal(15,2);
  v_last_harvest decimal(15,2);
  v_last_harvest_date timestamptz;
  v_result json;
BEGIN
  -- Get price from template
  SELECT current_market_price INTO v_template_price
  FROM component_market_prices
  WHERE company_id = p_company_id
    AND component_type = p_component_type
    AND capacity = p_capacity
    AND (p_technology_type IS NULL OR technology_type = p_technology_type)
    AND (p_manufacturer IS NULL OR manufacturer = p_manufacturer)
    AND is_active = true
  ORDER BY
    CASE WHEN manufacturer = p_manufacturer THEN 1 ELSE 2 END,
    CASE WHEN technology_type = p_technology_type THEN 1 ELSE 2 END
  LIMIT 1;

  -- Get recent average (last 30 days)
  SELECT AVG(market_value_at_harvest) INTO v_recent_avg
  FROM harvested_components_inventory
  WHERE company_id = p_company_id
    AND component_type = p_component_type
    AND capacity = p_capacity
    AND harvest_date > now() - interval '30 days'
    AND market_value_at_harvest IS NOT NULL;

  -- Get last harvest price
  SELECT market_value_at_harvest, harvest_date
  INTO v_last_harvest, v_last_harvest_date
  FROM harvested_components_inventory
  WHERE company_id = p_company_id
    AND component_type = p_component_type
    AND capacity = p_capacity
    AND market_value_at_harvest IS NOT NULL
  ORDER BY harvest_date DESC
  LIMIT 1;

  -- Build result
  v_result := json_build_object(
    'template_price', v_template_price,
    'recent_average', ROUND(v_recent_avg, 2),
    'last_harvest_price', v_last_harvest,
    'last_harvest_date', v_last_harvest_date,
    'suggested_price', COALESCE(v_template_price, v_recent_avg, v_last_harvest, 0),
    'source', CASE
      WHEN v_template_price IS NOT NULL THEN 'template'
      WHEN v_recent_avg IS NOT NULL THEN 'recent_average'
      WHEN v_last_harvest IS NOT NULL THEN 'last_harvest'
      ELSE 'none'
    END
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total component value by purchase lot
CREATE OR REPLACE FUNCTION calculate_lot_component_value(
  p_lot_id uuid
) RETURNS decimal(15,2) AS $$
DECLARE
  v_total_value decimal(15,2);
BEGIN
  SELECT COALESCE(SUM(hci.market_value_at_harvest * hci.quantity_available), 0)
  INTO v_total_value
  FROM harvested_components_inventory hci
  JOIN assets a ON a.id = hci.source_asset_id
  WHERE a.purchase_lot_id = p_lot_id
    AND hci.market_value_at_harvest IS NOT NULL;

  RETURN v_total_value;
END;
$$ LANGUAGE plpgsql;

-- Function to track price changes in history
CREATE OR REPLACE FUNCTION track_component_price_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if price actually changed
  IF OLD.current_market_price IS DISTINCT FROM NEW.current_market_price THEN
    NEW.price_history := COALESCE(OLD.price_history, '[]'::jsonb) ||
      jsonb_build_object(
        'price', OLD.current_market_price,
        'date', now(),
        'updated_by', NEW.updated_by
      );
    NEW.last_updated := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_price_history
  BEFORE UPDATE ON component_market_prices
  FOR EACH ROW
  EXECUTE FUNCTION track_component_price_history();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_component_prices_lookup
  ON component_market_prices(company_id, component_type, capacity, is_active);

CREATE INDEX IF NOT EXISTS idx_harvested_inventory_lot_value
  ON harvested_components_inventory(source_asset_id, market_value_at_harvest)
  WHERE market_value_at_harvest IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_harvested_inventory_harvest_date
  ON harvested_components_inventory(company_id, harvest_date DESC);

-- Add some common default prices (optional - can be customized per company)
COMMENT ON TABLE component_market_prices IS
  'Master price list for harvested components. Used to auto-fill market values during harvest operations and calculate accurate P/L by purchase lot.';

COMMENT ON COLUMN harvested_components_inventory.market_value_at_harvest IS
  'Market value of component at time of harvest. Used for P/L calculation by purchase lot.';
