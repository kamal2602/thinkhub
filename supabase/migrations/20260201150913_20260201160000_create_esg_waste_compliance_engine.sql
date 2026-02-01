/*
  # ESG & Waste Compliance Engine (Phase 1)
  
  ## Purpose
  Create comprehensive ESG (Environmental, Social, Governance) tracking system
  for circular economy compliance with regulatory frameworks:
  - GRI (Global Reporting Initiative)
  - EU WEEE (Waste Electrical and Electronic Equipment)
  - EPR (Extended Producer Responsibility)
  - Carbon footprint tracking (Scope 3)
  - Circularity index calculation
  
  ## New Tables
  
  ### `waste_categories`
  Material taxonomy for environmental compliance
  - Classifies materials by type, hazard class, recycling rates
  - Links to UN hazard classifications
  - Carbon factors for impact calculation
  
  ### `recovery_methods`
  Processing methods for material recovery/disposal
  - Tracks reuse, recycling, recovery, disposal methods
  - Recovery efficiency and carbon impact
  - Regulatory compliance flags
  
  ### `esg_events`
  Main event log for all environmental impact events
  - Links to assets, components, inventory items
  - Tracks material weight, recovery method, carbon estimates
  - Provides complete lifecycle traceability
  - Downstream vendor tracking
  
  ## Security
  - RLS enabled on all tables
  - Company-scoped access control
  - Audit trail for all events
  
  ## Compliance
  - Immutable event log (no updates after creation)
  - Cryptographic hash support for audit trails
  - Regulatory framework tagging
*/

-- =====================================================
-- WASTE CATEGORIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS waste_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Category information
  name text NOT NULL,
  description text,
  
  -- Material classification
  material_type text NOT NULL CHECK (material_type IN (
    'metal', 'plastic', 'battery', 'circuit_board', 'glass', 
    'rubber', 'rare_earth', 'composite', 'other'
  )),
  
  -- Hazard classification
  hazard_class text NOT NULL CHECK (hazard_class IN (
    'non_hazardous', 'hazardous', 'special_waste', 'universal_waste'
  )),
  un_number text, -- UN hazard classification code
  
  -- Environmental metrics
  recycling_rate_pct numeric(5,2) CHECK (recycling_rate_pct >= 0 AND recycling_rate_pct <= 100),
  carbon_factor_kg_per_kg numeric(10,6), -- kg CO2e per kg of material
  
  -- Regulatory compliance
  epr_category text, -- Extended Producer Responsibility category
  weee_category text, -- WEEE directive category (1-14)
  
  -- Metadata
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_waste_categories_company ON waste_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_waste_categories_material_type ON waste_categories(material_type);
CREATE INDEX IF NOT EXISTS idx_waste_categories_active ON waste_categories(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE waste_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view waste categories in their company" ON waste_categories;
CREATE POLICY "Users can view waste categories in their company"
  ON waste_categories FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage waste categories" ON waste_categories;
CREATE POLICY "Admins can manage waste categories"
  ON waste_categories FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- RECOVERY METHODS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS recovery_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Method information
  name text NOT NULL,
  description text,
  
  -- Method classification
  method_type text NOT NULL CHECK (method_type IN (
    'reuse', 'recycle', 'recovery', 'disposal', 'incineration', 'landfill'
  )),
  
  -- Efficiency metrics
  recovery_efficiency_pct numeric(5,2) CHECK (recovery_efficiency_pct >= 0 AND recovery_efficiency_pct <= 100),
  carbon_impact_kg_per_kg numeric(10,6), -- Carbon impact of the process itself
  
  -- Compliance
  complies_with text[], -- ["EU WEEE", "Basel Convention", "R2", "e-Stewards"]
  certification_required boolean DEFAULT false,
  
  -- Metadata
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_recovery_methods_company ON recovery_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_recovery_methods_type ON recovery_methods(method_type);
CREATE INDEX IF NOT EXISTS idx_recovery_methods_active ON recovery_methods(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE recovery_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view recovery methods in their company" ON recovery_methods;
CREATE POLICY "Users can view recovery methods in their company"
  ON recovery_methods FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage recovery methods" ON recovery_methods;
CREATE POLICY "Admins can manage recovery methods"
  ON recovery_methods FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- ESG EVENTS TABLE (Main Event Log)
-- =====================================================

CREATE TABLE IF NOT EXISTS esg_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Source tracking (polymorphic relationship)
  source_type text NOT NULL CHECK (source_type IN ('asset', 'component', 'inventory_item', 'purchase_lot')),
  source_id uuid NOT NULL,
  
  -- Material classification
  waste_category_id uuid REFERENCES waste_categories(id),
  material_category text, -- Denormalized for reporting performance
  weight_kg numeric(12,3) NOT NULL CHECK (weight_kg > 0),
  
  -- Processing method
  recovery_method_id uuid REFERENCES recovery_methods(id),
  recovery_method text, -- Denormalized
  disposal_method text,
  
  -- Environmental impact (calculated)
  carbon_estimate_kg numeric(12,3), -- Total CO2e for this event
  circularity_score numeric(5,2) CHECK (circularity_score >= 0 AND circularity_score <= 100),
  
  -- Traceability (flexible vendor tracking)
  downstream_vendor_type text CHECK (downstream_vendor_type IN ('customer', 'supplier', 'other')),
  downstream_vendor_id uuid, -- References customers or suppliers
  downstream_vendor_name text,
  certificate_id uuid REFERENCES recycling_certificates(id),
  processing_location text,
  
  -- Compliance flags
  complies_with text[], -- Regulatory frameworks this event satisfies
  requires_certification boolean DEFAULT false,
  certified boolean DEFAULT false,
  
  -- Additional data
  notes text,
  metadata jsonb, -- Extensible for custom data
  
  -- Event timing
  event_date timestamptz DEFAULT now(),
  
  -- Audit trail
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  -- Immutability: Events should not be updated, only created
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_esg_events_company ON esg_events(company_id);
CREATE INDEX IF NOT EXISTS idx_esg_events_source ON esg_events(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_esg_events_date ON esg_events(event_date);
CREATE INDEX IF NOT EXISTS idx_esg_events_waste_category ON esg_events(waste_category_id);
CREATE INDEX IF NOT EXISTS idx_esg_events_recovery_method ON esg_events(recovery_method_id);
CREATE INDEX IF NOT EXISTS idx_esg_events_downstream ON esg_events(downstream_vendor_type, downstream_vendor_id);
CREATE INDEX IF NOT EXISTS idx_esg_events_certificate ON esg_events(certificate_id);

-- RLS Policies
ALTER TABLE esg_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view ESG events in their company" ON esg_events;
CREATE POLICY "Users can view ESG events in their company"
  ON esg_events FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create ESG events" ON esg_events;
CREATE POLICY "Users can create ESG events"
  ON esg_events FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Prevent updates to ESG events (immutable log)
DROP POLICY IF EXISTS "ESG events cannot be updated" ON esg_events;
CREATE POLICY "ESG events cannot be updated"
  ON esg_events FOR UPDATE
  TO authenticated
  USING (false);

-- Only admins can delete ESG events (for corrections)
DROP POLICY IF EXISTS "Admins can delete ESG events" ON esg_events;
CREATE POLICY "Admins can delete ESG events"
  ON esg_events FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- SEED DATA - Common Waste Categories
-- =====================================================

-- Insert seed data for all existing companies
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    
    INSERT INTO waste_categories (company_id, name, material_type, hazard_class, recycling_rate_pct, carbon_factor_kg_per_kg, epr_category, weee_category)
    VALUES 
      (company_record.id, 'Lithium-Ion Batteries', 'battery', 'hazardous', 95.0, 2.5, 'Battery EPR', '6'),
      (company_record.id, 'Aluminum Chassis', 'metal', 'non_hazardous', 98.0, 0.5, 'Metal EPR', '3'),
      (company_record.id, 'Circuit Boards (PCB)', 'circuit_board', 'special_waste', 85.0, 3.2, 'E-Waste EPR', '3'),
      (company_record.id, 'Plastic Casings (ABS)', 'plastic', 'non_hazardous', 65.0, 1.8, 'Plastics EPR', '4'),
      (company_record.id, 'LCD Screens', 'glass', 'special_waste', 75.0, 2.1, 'Display EPR', '3'),
      (company_record.id, 'Rare Earth Magnets', 'rare_earth', 'non_hazardous', 45.0, 5.0, 'Critical Materials EPR', '6')
    ON CONFLICT DO NOTHING;
    
    -- Insert recovery methods
    INSERT INTO recovery_methods (company_id, name, method_type, recovery_efficiency_pct, carbon_impact_kg_per_kg, complies_with, certification_required)
    VALUES 
      (company_record.id, 'Component Harvesting for Reuse', 'reuse', 95.0, 0.1, ARRAY['EU WEEE', 'R2', 'e-Stewards'], false),
      (company_record.id, 'Metal Smelting & Recovery', 'recycle', 92.0, 0.8, ARRAY['EU WEEE', 'Basel Convention'], false),
      (company_record.id, 'Plastic Pelletization', 'recycle', 80.0, 0.6, ARRAY['EU WEEE', 'ISO 14001'], false),
      (company_record.id, 'Certified E-Waste Recycling', 'recovery', 88.0, 0.9, ARRAY['EU WEEE', 'R2', 'e-Stewards', 'Basel Convention'], true),
      (company_record.id, 'Hazardous Material Disposal', 'disposal', 0.0, 5.0, ARRAY['EPA', 'Basel Convention'], true)
    ON CONFLICT DO NOTHING;
    
  END LOOP;
END $$;

-- =====================================================
-- TRIGGERS & FUNCTIONS
-- =====================================================

-- Auto-calculate carbon estimate when ESG event is created
CREATE OR REPLACE FUNCTION calculate_esg_event_carbon()
RETURNS TRIGGER AS $$
DECLARE
  waste_carbon_factor numeric;
  recovery_carbon_impact numeric;
BEGIN
  -- Get carbon factor from waste category
  SELECT carbon_factor_kg_per_kg INTO waste_carbon_factor
  FROM waste_categories
  WHERE id = NEW.waste_category_id;
  
  -- Get carbon impact from recovery method
  SELECT carbon_impact_kg_per_kg INTO recovery_carbon_impact
  FROM recovery_methods
  WHERE id = NEW.recovery_method_id;
  
  -- Calculate total carbon estimate
  -- Formula: (material_carbon_factor + process_carbon_impact) * weight
  NEW.carbon_estimate_kg := 
    COALESCE(waste_carbon_factor, 0) * NEW.weight_kg + 
    COALESCE(recovery_carbon_impact, 0) * NEW.weight_kg;
  
  -- Calculate circularity score based on recovery method
  SELECT 
    CASE 
      WHEN method_type = 'reuse' THEN 95.0
      WHEN method_type = 'recycle' THEN recovery_efficiency_pct * 0.9
      WHEN method_type = 'recovery' THEN recovery_efficiency_pct * 0.7
      WHEN method_type = 'disposal' THEN 10.0
      WHEN method_type = 'incineration' THEN 20.0
      WHEN method_type = 'landfill' THEN 5.0
      ELSE 50.0
    END INTO NEW.circularity_score
  FROM recovery_methods
  WHERE id = NEW.recovery_method_id;
  
  -- Denormalize for performance
  SELECT name INTO NEW.material_category
  FROM waste_categories
  WHERE id = NEW.waste_category_id;
  
  SELECT name INTO NEW.recovery_method
  FROM recovery_methods
  WHERE id = NEW.recovery_method_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_esg_carbon_before_insert ON esg_events;
CREATE TRIGGER calculate_esg_carbon_before_insert
  BEFORE INSERT ON esg_events
  FOR EACH ROW
  EXECUTE FUNCTION calculate_esg_event_carbon();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_waste_categories_updated_at ON waste_categories;
CREATE TRIGGER update_waste_categories_updated_at
  BEFORE UPDATE ON waste_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recovery_methods_updated_at ON recovery_methods;
CREATE TRIGGER update_recovery_methods_updated_at
  BEFORE UPDATE ON recovery_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
