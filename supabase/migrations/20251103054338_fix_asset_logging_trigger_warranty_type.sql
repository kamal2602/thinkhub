/*
  # Fix Asset Logging Trigger - Remove Invalid Field

  1. Changes
    - Remove warranty_type field check from log_asset_changes trigger
    - The assets table doesn't have a warranty_type column

  2. Notes
    - This fixes the error: record "old" has no field "warranty_type"
*/

-- Function to log comprehensive asset changes
CREATE OR REPLACE FUNCTION log_asset_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes_made text[] := '{}';
  change_details jsonb := '{}'::jsonb;
BEGIN
  -- Check each field for changes and build description
  IF OLD.serial_number IS DISTINCT FROM NEW.serial_number THEN
    changes_made := array_append(changes_made, 'Serial Number: ' || COALESCE(OLD.serial_number, 'NULL') || ' → ' || COALESCE(NEW.serial_number, 'NULL'));
    change_details := change_details || jsonb_build_object('serial_number', jsonb_build_object('old', OLD.serial_number, 'new', NEW.serial_number));
  END IF;

  IF OLD.imei IS DISTINCT FROM NEW.imei THEN
    changes_made := array_append(changes_made, 'IMEI: ' || COALESCE(OLD.imei, 'NULL') || ' → ' || COALESCE(NEW.imei, 'NULL'));
    change_details := change_details || jsonb_build_object('imei', jsonb_build_object('old', OLD.imei, 'new', NEW.imei));
  END IF;

  IF OLD.brand IS DISTINCT FROM NEW.brand THEN
    changes_made := array_append(changes_made, 'Brand: ' || COALESCE(OLD.brand, 'NULL') || ' → ' || COALESCE(NEW.brand, 'NULL'));
    change_details := change_details || jsonb_build_object('brand', jsonb_build_object('old', OLD.brand, 'new', NEW.brand));
  END IF;

  IF OLD.model IS DISTINCT FROM NEW.model THEN
    changes_made := array_append(changes_made, 'Model: ' || COALESCE(OLD.model, 'NULL') || ' → ' || COALESCE(NEW.model, 'NULL'));
    change_details := change_details || jsonb_build_object('model', jsonb_build_object('old', OLD.model, 'new', NEW.model));
  END IF;

  IF OLD.cosmetic_grade IS DISTINCT FROM NEW.cosmetic_grade THEN
    changes_made := array_append(changes_made, 'Cosmetic Grade: ' || COALESCE(OLD.cosmetic_grade, 'NULL') || ' → ' || COALESCE(NEW.cosmetic_grade, 'NULL'));
    change_details := change_details || jsonb_build_object('cosmetic_grade', jsonb_build_object('old', OLD.cosmetic_grade, 'new', NEW.cosmetic_grade));
  END IF;

  IF OLD.functional_status IS DISTINCT FROM NEW.functional_status THEN
    changes_made := array_append(changes_made, 'Functional Status: ' || COALESCE(OLD.functional_status, 'NULL') || ' → ' || COALESCE(NEW.functional_status, 'NULL'));
    change_details := change_details || jsonb_build_object('functional_status', jsonb_build_object('old', OLD.functional_status, 'new', NEW.functional_status));
  END IF;

  IF OLD.refurbishment_status IS DISTINCT FROM NEW.refurbishment_status THEN
    changes_made := array_append(changes_made, 'Refurbishment Status: ' || COALESCE(OLD.refurbishment_status, 'NULL') || ' → ' || COALESCE(NEW.refurbishment_status, 'NULL'));
    change_details := change_details || jsonb_build_object('refurbishment_status', jsonb_build_object('old', OLD.refurbishment_status, 'new', NEW.refurbishment_status));
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    changes_made := array_append(changes_made, 'Status: ' || COALESCE(OLD.status, 'NULL') || ' → ' || COALESCE(NEW.status, 'NULL'));
    change_details := change_details || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
  END IF;

  IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
    changes_made := array_append(changes_made, 'Location changed');
    change_details := change_details || jsonb_build_object('location_id', jsonb_build_object('old', OLD.location_id, 'new', NEW.location_id));
  END IF;

  IF OLD.purchase_price IS DISTINCT FROM NEW.purchase_price THEN
    changes_made := array_append(changes_made, 'Purchase Price: $' || COALESCE(OLD.purchase_price::text, 'NULL') || ' → $' || COALESCE(NEW.purchase_price::text, 'NULL'));
    change_details := change_details || jsonb_build_object('purchase_price', jsonb_build_object('old', OLD.purchase_price, 'new', NEW.purchase_price));
  END IF;

  IF OLD.selling_price IS DISTINCT FROM NEW.selling_price THEN
    changes_made := array_append(changes_made, 'Selling Price: $' || COALESCE(OLD.selling_price::text, 'NULL') || ' → $' || COALESCE(NEW.selling_price::text, 'NULL'));
    change_details := change_details || jsonb_build_object('selling_price', jsonb_build_object('old', OLD.selling_price, 'new', NEW.selling_price));
  END IF;

  IF OLD.market_price IS DISTINCT FROM NEW.market_price THEN
    changes_made := array_append(changes_made, 'Market Price: $' || COALESCE(OLD.market_price::text, 'NULL') || ' → $' || COALESCE(NEW.market_price::text, 'NULL'));
    change_details := change_details || jsonb_build_object('market_price', jsonb_build_object('old', OLD.market_price, 'new', NEW.market_price));
  END IF;

  IF OLD.warranty_months IS DISTINCT FROM NEW.warranty_months THEN
    changes_made := array_append(changes_made, 'Warranty: ' || COALESCE(OLD.warranty_months::text, 'NULL') || ' → ' || COALESCE(NEW.warranty_months::text, 'NULL') || ' months');
    change_details := change_details || jsonb_build_object('warranty_months', jsonb_build_object('old', OLD.warranty_months, 'new', NEW.warranty_months));
  END IF;

  IF OLD.warranty_start_date IS DISTINCT FROM NEW.warranty_start_date THEN
    changes_made := array_append(changes_made, 'Warranty Start Date updated');
    change_details := change_details || jsonb_build_object('warranty_start_date', jsonb_build_object('old', OLD.warranty_start_date, 'new', NEW.warranty_start_date));
  END IF;

  IF OLD.other_specs IS DISTINCT FROM NEW.other_specs THEN
    changes_made := array_append(changes_made, 'Specifications updated');
    change_details := change_details || jsonb_build_object('other_specs', jsonb_build_object('old', OLD.other_specs, 'new', NEW.other_specs));
  END IF;

  IF OLD.notes IS DISTINCT FROM NEW.notes THEN
    changes_made := array_append(changes_made, 'Notes updated');
    change_details := change_details || jsonb_build_object('notes', jsonb_build_object('old', OLD.notes, 'new', NEW.notes));
  END IF;

  -- Only log if there were actual changes (excluding updated_at)
  IF array_length(changes_made, 1) > 0 THEN
    INSERT INTO asset_history (asset_id, event_type, description, performed_by, metadata)
    VALUES (
      NEW.id,
      'Asset Edited',
      array_to_string(changes_made, ', '),
      auth.uid(),
      change_details
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
