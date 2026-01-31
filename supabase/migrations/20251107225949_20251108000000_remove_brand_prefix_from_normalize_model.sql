/*
  # Remove Brand Prefix from Model Normalization

  1. Changes
    - Updates `normalize_model()` function to NOT add brand prefix automatically
    - Now returns original model variant as-is if no match found
    - Respects user input without modification

  2. Behavior
    - Before: "EliteBook 840" → "HP EliteBook 840" (auto-prefix added)
    - After: "EliteBook 840" → "EliteBook 840" (no modification)
    - Still normalizes to canonical names when matches exist in model_aliases table
*/

-- Replace the normalize_model function without brand prefix logic
CREATE OR REPLACE FUNCTION normalize_model(
  p_company_id uuid,
  p_brand text,
  p_model_variant text
) RETURNS text AS $$
DECLARE
  v_full_name text;
BEGIN
  -- Try exact match first
  SELECT full_model_name INTO v_full_name
  FROM model_aliases
  WHERE company_id = p_company_id
    AND lower(brand) = lower(p_brand)
    AND lower(variant_name) = lower(p_model_variant)
    AND is_active = true
  ORDER BY confidence_score DESC, updated_at DESC
  LIMIT 1;

  IF v_full_name IS NOT NULL THEN
    RETURN v_full_name;
  END IF;

  -- Try partial match on variant
  SELECT full_model_name INTO v_full_name
  FROM model_aliases
  WHERE company_id = p_company_id
    AND lower(brand) = lower(p_brand)
    AND (
      lower(p_model_variant) LIKE '%' || lower(variant_name) || '%'
      OR lower(variant_name) LIKE '%' || lower(p_model_variant) || '%'
    )
    AND is_active = true
  ORDER BY confidence_score DESC, updated_at DESC
  LIMIT 1;

  IF v_full_name IS NOT NULL THEN
    RETURN v_full_name;
  END IF;

  -- No match found, return original model variant as-is (NO brand prefix added)
  RETURN p_model_variant;
END;
$$ LANGUAGE plpgsql;
