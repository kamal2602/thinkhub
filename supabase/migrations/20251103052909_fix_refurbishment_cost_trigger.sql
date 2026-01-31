/*
  # Fix Refurbishment Cost Trigger

  1. Changes
    - Update trigger function to handle DELETE operations correctly
    - Use COALESCE to handle OLD/NEW records properly
    - Ensure trigger works for INSERT, UPDATE, and DELETE

  2. Notes
    - On DELETE, use OLD.asset_id since NEW doesn't exist
    - On INSERT/UPDATE, use NEW.asset_id
*/

CREATE OR REPLACE FUNCTION update_asset_refurbishment_total()
RETURNS TRIGGER AS $$
DECLARE
  v_asset_id uuid;
BEGIN
  -- Get the correct asset_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_asset_id := OLD.asset_id;
  ELSE
    v_asset_id := NEW.asset_id;
  END IF;

  -- Update the asset's total refurbishment cost
  UPDATE assets
  SET refurbishment_cost = (
    SELECT COALESCE(SUM(cost), 0)
    FROM asset_refurbishment_costs
    WHERE asset_id = v_asset_id
  ),
  updated_at = now()
  WHERE id = v_asset_id;

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;
