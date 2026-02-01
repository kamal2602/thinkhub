/*
  # AI Valuation Engine (Phase 4)
  
  ## Purpose
  Create advisory pricing and channel recommendation system:
  - Predict optimal sales channel (direct sale, auction, component harvest, scrap)
  - Estimate resale value, auction value, scrap value
  - Learn from historical outcomes
  - Provide confidence scores and explanations
  
  ## Training Data Sources
  - sales_invoices & sales_invoice_items: Actual resale prices
  - auction_lots & bids: Market demand signals
  - purchase_lots: Cost basis data
  - assets: Product attributes (brand, model, age, condition)
  - harvested_components: Component harvest value
  
  ## Implementation Strategy
  - Phase 4a (Current): Rule-based valuation with historical averages
  - Phase 4b (Future): ML models (XGBoost/LightGBM) via pgml or Edge Functions
  - Phase 4c (Future): Real-time market data integration
  
  ## New Tables
  
  ### `ai_valuation_models`
  Stores valuation predictions for inventory items
  - Multiple valuation predictions per channel
  - Confidence scores and explanations
  - Validation tracking (predicted vs actual)
  
  ### `ai_model_performance`
  Tracks model accuracy and performance metrics
  - Mean Absolute Error (MAE), RMSE, R² scores
  - Training metadata and feature importance
  - Per-category model performance
  
  ### `valuation_rules`
  Configurable business rules for pricing
  - Brand/model specific rules
  - Condition-based adjustments
  - Market trend multipliers
  
  ## Security
  - RLS enabled
  - Predictions are advisory only (not binding)
  - Audit trail for overrides
  
  ## Compliance
  - Clearly marked as "advisory"
  - Human override mechanism
  - Bias monitoring and fairness checks
*/

-- =====================================================
-- VALUATION RULES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS valuation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Rule identification
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN (
    'brand_multiplier', 'model_multiplier', 'condition_adjustment',
    'age_depreciation', 'market_trend', 'minimum_price', 'channel_preference'
  )),
  
  -- Rule conditions
  applies_to_brands text[],
  applies_to_models text[],
  applies_to_product_types text[],
  applies_to_conditions text[],
  
  -- Rule value
  multiplier numeric(10,4) DEFAULT 1.0,
  fixed_amount numeric(12,2),
  
  -- Channel recommendations
  preferred_channel text CHECK (preferred_channel IN (
    'direct_sale', 'auction', 'component_harvest', 'scrap', 'donate'
  )),
  
  -- Rule priority (higher = evaluated first)
  priority integer DEFAULT 50,
  
  -- Metadata
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_valuation_rules_company ON valuation_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_valuation_rules_type ON valuation_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_valuation_rules_active ON valuation_rules(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE valuation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view valuation rules" ON valuation_rules;
CREATE POLICY "Users can view valuation rules"
  ON valuation_rules FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage valuation rules" ON valuation_rules;
CREATE POLICY "Admins can manage valuation rules"
  ON valuation_rules FOR ALL
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
-- AI VALUATION MODELS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_valuation_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Target item (polymorphic - can be asset or inventory_item)
  target_type text NOT NULL CHECK (target_type IN ('asset', 'inventory_item', 'component')),
  target_id uuid NOT NULL,
  
  -- Asset/item details (denormalized for performance)
  brand text,
  model text,
  product_type text,
  condition_grade text,
  age_months integer,
  
  -- Valuation predictions
  predicted_resale_value numeric(12,2),
  predicted_auction_value numeric(12,2),
  predicted_scrap_value numeric(12,2),
  predicted_component_harvest_value numeric(12,2),
  
  -- Recommendation
  recommended_channel text CHECK (recommended_channel IN (
    'direct_sale', 'auction', 'component_harvest', 'scrap', 'donate', 'dispose'
  )),
  recommendation_reason text,
  
  -- Confidence metrics (0.0 - 1.0)
  confidence_score numeric(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  confidence_level text CHECK (confidence_level IN ('low', 'medium', 'high')),
  
  -- Model metadata
  model_version text DEFAULT 'rules-v1',
  algorithm text DEFAULT 'rule_based',
  
  -- Features used for prediction
  features_used jsonb,
  
  -- Explanation (for transparency)
  prediction_factors jsonb, -- Breakdown of how prediction was calculated
  
  -- Validation (populated after actual sale)
  actual_sale_channel text,
  actual_sale_value numeric(12,2),
  actual_sale_date timestamptz,
  prediction_error numeric(12,2), -- |predicted - actual|
  prediction_error_pct numeric(5,2), -- Error as percentage
  
  -- Prediction lifecycle
  predicted_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '30 days',
  
  -- Override tracking
  overridden boolean DEFAULT false,
  override_reason text,
  overridden_by uuid REFERENCES auth.users(id),
  overridden_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_valuations_company ON ai_valuation_models(company_id);
CREATE INDEX IF NOT EXISTS idx_valuations_target ON ai_valuation_models(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_valuations_created ON ai_valuation_models(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_valuations_expires ON ai_valuation_models(expires_at);
CREATE INDEX IF NOT EXISTS idx_valuations_brand_model ON ai_valuation_models(brand, model);
CREATE INDEX IF NOT EXISTS idx_valuations_channel ON ai_valuation_models(recommended_channel);

-- RLS Policies
ALTER TABLE ai_valuation_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view valuations" ON ai_valuation_models;
CREATE POLICY "Users can view valuations"
  ON ai_valuation_models FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create valuations" ON ai_valuation_models;
CREATE POLICY "Users can create valuations"
  ON ai_valuation_models FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their valuations" ON ai_valuation_models;
CREATE POLICY "Users can update their valuations"
  ON ai_valuation_models FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- AI MODEL PERFORMANCE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_model_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Model identification
  model_name text NOT NULL,
  model_version text NOT NULL,
  algorithm text,
  
  -- Scope
  product_category text,
  brand text,
  
  -- Performance metrics
  total_predictions integer DEFAULT 0,
  validated_predictions integer DEFAULT 0, -- Predictions with actual outcomes
  
  -- Accuracy metrics
  mae numeric(12,2), -- Mean Absolute Error
  rmse numeric(12,2), -- Root Mean Squared Error
  r2_score numeric(5,4), -- R² coefficient (-∞ to 1, closer to 1 is better)
  mape numeric(5,2), -- Mean Absolute Percentage Error
  
  -- Confidence calibration
  avg_confidence numeric(5,4),
  accuracy_by_confidence jsonb, -- {"high": 0.92, "medium": 0.75, "low": 0.55}
  
  -- Training metadata
  training_samples integer,
  training_date timestamptz,
  training_period_start timestamptz,
  training_period_end timestamptz,
  
  -- Features used
  features text[],
  feature_importance jsonb,
  
  -- Metadata
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_perf_company ON ai_model_performance(company_id);
CREATE INDEX IF NOT EXISTS idx_model_perf_version ON ai_model_performance(model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_model_perf_category ON ai_model_performance(product_category);

-- RLS Policies
ALTER TABLE ai_model_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view model performance" ON ai_model_performance;
CREATE POLICY "Users can view model performance"
  ON ai_model_performance FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage model performance" ON ai_model_performance;
CREATE POLICY "Admins can manage model performance"
  ON ai_model_performance FOR ALL
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
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate historical average price for a product
CREATE OR REPLACE FUNCTION get_historical_average_price(
  p_brand text,
  p_model text,
  p_company_id uuid
)
RETURNS numeric AS $$
DECLARE
  v_avg_price numeric;
BEGIN
  -- Average from sales invoices over last 6 months
  SELECT AVG(sii.unit_price)
  INTO v_avg_price
  FROM sales_invoice_items sii
  JOIN sales_invoices si ON sii.sales_invoice_id = si.id
  WHERE si.company_id = p_company_id
    AND si.invoice_date > now() - interval '6 months'
    AND (sii.brand = p_brand OR p_brand IS NULL)
    AND (sii.model = p_model OR p_model IS NULL);
  
  RETURN COALESCE(v_avg_price, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate scrap value based on weight and material
CREATE OR REPLACE FUNCTION estimate_scrap_value(
  p_target_type text,
  p_target_id uuid,
  p_company_id uuid
)
RETURNS numeric AS $$
DECLARE
  v_scrap_value numeric := 0;
  v_weight_kg numeric;
BEGIN
  -- Estimate based on typical e-waste scrap rates
  -- Average: $2-5 per kg for electronics
  
  IF p_target_type = 'asset' THEN
    -- Use estimated weight (future: add weight column to assets)
    v_scrap_value := 10.0; -- Placeholder: $10 default scrap value
  ELSIF p_target_type = 'component' THEN
    -- Components might have higher recovery value
    v_scrap_value := 5.0;
  END IF;
  
  RETURN v_scrap_value;
END;
$$ LANGUAGE plpgsql;

-- Function to get confidence level from score
CREATE OR REPLACE FUNCTION get_confidence_level(p_score numeric)
RETURNS text AS $$
BEGIN
  IF p_score >= 0.85 THEN
    RETURN 'high';
  ELSIF p_score >= 0.60 THEN
    RETURN 'medium';
  ELSE
    RETURN 'low';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-set confidence level from score
CREATE OR REPLACE FUNCTION set_confidence_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.confidence_level := get_confidence_level(NEW.confidence_score);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_confidence_level_on_insert ON ai_valuation_models;
CREATE TRIGGER set_confidence_level_on_insert
  BEFORE INSERT ON ai_valuation_models
  FOR EACH ROW
  EXECUTE FUNCTION set_confidence_level();

DROP TRIGGER IF EXISTS set_confidence_level_on_update ON ai_valuation_models;
CREATE TRIGGER set_confidence_level_on_update
  BEFORE UPDATE ON ai_valuation_models
  FOR EACH ROW
  WHEN (OLD.confidence_score IS DISTINCT FROM NEW.confidence_score)
  EXECUTE FUNCTION set_confidence_level();

-- Auto-calculate prediction error when actual value is recorded
CREATE OR REPLACE FUNCTION calculate_prediction_error()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actual_sale_value IS NOT NULL AND OLD.actual_sale_value IS NULL THEN
    -- Determine which predicted value to compare against
    CASE NEW.actual_sale_channel
      WHEN 'direct_sale' THEN
        NEW.prediction_error := ABS(NEW.predicted_resale_value - NEW.actual_sale_value);
        IF NEW.predicted_resale_value > 0 THEN
          NEW.prediction_error_pct := (NEW.prediction_error / NEW.predicted_resale_value) * 100;
        END IF;
      WHEN 'auction' THEN
        NEW.prediction_error := ABS(NEW.predicted_auction_value - NEW.actual_sale_value);
        IF NEW.predicted_auction_value > 0 THEN
          NEW.prediction_error_pct := (NEW.prediction_error / NEW.predicted_auction_value) * 100;
        END IF;
      WHEN 'scrap' THEN
        NEW.prediction_error := ABS(NEW.predicted_scrap_value - NEW.actual_sale_value);
        IF NEW.predicted_scrap_value > 0 THEN
          NEW.prediction_error_pct := (NEW.prediction_error / NEW.predicted_scrap_value) * 100;
        END IF;
      WHEN 'component_harvest' THEN
        NEW.prediction_error := ABS(NEW.predicted_component_harvest_value - NEW.actual_sale_value);
        IF NEW.predicted_component_harvest_value > 0 THEN
          NEW.prediction_error_pct := (NEW.prediction_error / NEW.predicted_component_harvest_value) * 100;
        END IF;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_error_on_validation ON ai_valuation_models;
CREATE TRIGGER calculate_error_on_validation
  BEFORE UPDATE ON ai_valuation_models
  FOR EACH ROW
  WHEN (NEW.actual_sale_value IS NOT NULL AND OLD.actual_sale_value IS NULL)
  EXECUTE FUNCTION calculate_prediction_error();

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_valuation_rules_timestamp ON valuation_rules;
CREATE TRIGGER update_valuation_rules_timestamp
  BEFORE UPDATE ON valuation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_valuations_timestamp ON ai_valuation_models;
CREATE TRIGGER update_valuations_timestamp
  BEFORE UPDATE ON ai_valuation_models
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA - Default Valuation Rules
-- =====================================================

-- Insert common valuation rules for all companies
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    
    -- Premium brand multiplier
    INSERT INTO valuation_rules (company_id, rule_name, rule_type, applies_to_brands, multiplier, priority)
    VALUES 
      (company_record.id, 'Apple Premium Brand', 'brand_multiplier', ARRAY['Apple'], 1.3, 90),
      (company_record.id, 'Dell Enterprise Brand', 'brand_multiplier', ARRAY['Dell'], 1.1, 80),
      (company_record.id, 'HP Standard Brand', 'brand_multiplier', ARRAY['HP'], 1.0, 70)
    ON CONFLICT DO NOTHING;
    
    -- Condition adjustments
    INSERT INTO valuation_rules (company_id, rule_name, rule_type, applies_to_conditions, multiplier, priority)
    VALUES 
      (company_record.id, 'Excellent Condition Premium', 'condition_adjustment', ARRAY['A', 'Excellent'], 1.2, 100),
      (company_record.id, 'Good Condition Standard', 'condition_adjustment', ARRAY['B', 'Good'], 1.0, 90),
      (company_record.id, 'Fair Condition Discount', 'condition_adjustment', ARRAY['C', 'Fair'], 0.7, 80),
      (company_record.id, 'Poor Condition Heavy Discount', 'condition_adjustment', ARRAY['D', 'Poor'], 0.4, 70)
    ON CONFLICT DO NOTHING;
    
  END LOOP;
END $$;
