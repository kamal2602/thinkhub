/*
  # Model Normalization System
  
  1. Purpose
    - Standardize model names from various suppliers
    - Handle variants: "840 G10", "Elitebook 840 G10", "EliteBook 840 G10 Notebook PC"
    - Auto-normalize to canonical format: "HP EliteBook 840 G10"
  
  2. New Tables
    - `model_aliases` - Maps variant model names to canonical/standard names
  
  3. Features
    - Manual mapping creation by users
    - Auto-learning from user corrections
    - Fuzzy matching for similar model names
    - Brand-aware normalization
  
  4. Security
    - RLS enabled with company-level access
*/

-- Create model_aliases table
CREATE TABLE IF NOT EXISTS model_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  brand text NOT NULL,
  variant_name text NOT NULL,
  canonical_name text NOT NULL,
  full_model_name text NOT NULL,
  confidence_score integer DEFAULT 100 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_model_aliases_company_brand ON model_aliases(company_id, brand);
CREATE INDEX IF NOT EXISTS idx_model_aliases_variant ON model_aliases(company_id, lower(variant_name));
CREATE INDEX IF NOT EXISTS idx_model_aliases_canonical ON model_aliases(company_id, lower(canonical_name));

-- Enable RLS
ALTER TABLE model_aliases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view model aliases in their company"
  ON model_aliases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = model_aliases.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can create model aliases"
  ON model_aliases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = model_aliases.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Staff can update model aliases"
  ON model_aliases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = model_aliases.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admins can delete model aliases"
  ON model_aliases FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = model_aliases.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager')
    )
  );

-- Function to normalize model name
CREATE OR REPLACE FUNCTION normalize_model_name(
  p_company_id uuid,
  p_brand text,
  p_model_variant text
) RETURNS text AS $$
DECLARE
  v_result text;
  v_canonical text;
  v_full_name text;
BEGIN
  -- First, try exact match (case-insensitive)
  SELECT full_model_name INTO v_full_name
  FROM model_aliases
  WHERE company_id = p_company_id
    AND lower(brand) = lower(p_brand)
    AND lower(variant_name) = lower(trim(p_model_variant))
  ORDER BY confidence_score DESC
  LIMIT 1;

  IF v_full_name IS NOT NULL THEN
    RETURN v_full_name;
  END IF;

  -- Try partial match - check if variant contains canonical name
  SELECT full_model_name INTO v_full_name
  FROM model_aliases
  WHERE company_id = p_company_id
    AND lower(brand) = lower(p_brand)
    AND lower(p_model_variant) LIKE '%' || lower(canonical_name) || '%'
  ORDER BY confidence_score DESC, length(canonical_name) DESC
  LIMIT 1;

  IF v_full_name IS NOT NULL THEN
    RETURN v_full_name;
  END IF;

  -- No match found, return original with brand prefix if not already there
  IF lower(p_model_variant) NOT LIKE lower(p_brand || '%') THEN
    RETURN p_brand || ' ' || p_model_variant;
  END IF;

  RETURN p_model_variant;
END;
$$ LANGUAGE plpgsql;

-- Add update timestamp trigger
CREATE OR REPLACE FUNCTION update_model_aliases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_model_aliases_timestamp
  BEFORE UPDATE ON model_aliases
  FOR EACH ROW
  EXECUTE FUNCTION update_model_aliases_updated_at();

-- Grant permissions
GRANT EXECUTE ON FUNCTION normalize_model_name TO authenticated;