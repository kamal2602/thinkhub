/*
  # Fix Comprehensive Asset Logging - Match Actual Table Schema

  1. Changes
    - Update trigger to only track fields that actually exist in assets table
    - Remove references to non-existent fields (specs, warranty_type)
    - Add tracking for cpu, ram, storage, screen_size, other_specs
    - Add tracking for purchase_date, manufacture_date

  2. Notes
    - Ensures trigger matches the actual assets table structure
    - Prevents "field does not exist" errors
*/

CREATE OR REPLACE FUNCTION log_asset_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes_made text[] := '{}';
  change_details jsonb := '{}'::jsonb;
BEGIN
  -- Basic Info
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

  -- Specifications
  IF OLD.cpu IS DISTINCT FROM NEW.cpu THEN
    changes_made := array_append(changes_made, 'CPU: ' || COALESCE(OLD.cpu, 'NULL') || ' → ' || COALESCE(NEW.cpu, 'NULL'));
    change_details := change_details || jsonb_build_object('cpu', jsonb_build_object('old', OLD.cpu, 'new', NEW.cpu));
  END IF;

  IF OLD.ram IS DISTINCT FROM NEW.ram THEN
    changes_made := array_append(changes_made, 'RAM: ' || COALESCE(OLD.ram, 'NULL') || ' → ' || COALESCE(NEW.ram, 'NULL'));
    change_details := change_details || jsonb_build_object('ram', jsonb_build_object('old', OLD.ram, 'new', NEW.ram));
  END IF;

  IF OLD.storage IS DISTINCT FROM NEW.storage THEN
    changes_made := array_append(changes_made, 'Storage: ' || COALESCE(OLD.storage, 'NULL') || ' → ' || COALESCE(NEW.storage, 'NULL'));
    change_details := change_details || jsonb_build_object('storage', jsonb_build_object('old', OLD.storage, 'new', NEW.storage));
  END IF;

  IF OLD.screen_size IS DISTINCT FROM NEW.screen_size THEN
    changes_made := array_append(changes_made, 'Screen Size: ' || COALESCE(OLD.screen_size, 'NULL') || ' → ' || COALESCE(NEW.screen_size, 'NULL'));
    change_details := change_details || jsonb_build_object('screen_size', jsonb_build_object('old', OLD.screen_size, 'new', NEW.screen_size));
  END IF;

  IF OLD.other_specs IS DISTINCT FROM NEW.other_specs THEN
    changes_made := array_append(changes_made, 'Other Specifications updated');
    change_details := change_details || jsonb_build_object('other_specs', jsonb_build_object('old', OLD.other_specs, 'new', NEW.other_specs));
  END IF;

  -- Condition & Status
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

  -- Location
  IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
    changes_made := array_append(changes_made, 'Location changed');
    change_details := change_details || jsonb_build_object('location_id', jsonb_build_object('old', OLD.location_id, 'new', NEW.location_id));
  END IF;

  -- Product Type
  IF OLD.product_type_id IS DISTINCT FROM NEW.product_type_id THEN
    changes_made := array_append(changes_made, 'Product Type changed');
    change_details := change_details || jsonb_build_object('product_type_id', jsonb_build_object('old', OLD.product_type_id, 'new', NEW.product_type_id));
  END IF;

  -- Pricing
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

  -- Warranty
  IF OLD.warranty_months IS DISTINCT FROM NEW.warranty_months THEN
    changes_made := array_append(changes_made, 'Warranty: ' || COALESCE(OLD.warranty_months::text, 'NULL') || ' → ' || COALESCE(NEW.warranty_months::text, 'NULL') || ' months');
    change_details := change_details || jsonb_build_object('warranty_months', jsonb_build_object('old', OLD.warranty_months, 'new', NEW.warranty_months));
  END IF;

  IF OLD.warranty_start_date IS DISTINCT FROM NEW.warranty_start_date THEN
    changes_made := array_append(changes_made, 'Warranty Start Date: ' || COALESCE(OLD.warranty_start_date::text, 'NULL') || ' → ' || COALESCE(NEW.warranty_start_date::text, 'NULL'));
    change_details := change_details || jsonb_build_object('warranty_start_date', jsonb_build_object('old', OLD.warranty_start_date, 'new', NEW.warranty_start_date));
  END IF;

  IF OLD.warranty_end_date IS DISTINCT FROM NEW.warranty_end_date THEN
    changes_made := array_append(changes_made, 'Warranty End Date: ' || COALESCE(OLD.warranty_end_date::text, 'NULL') || ' → ' || COALESCE(NEW.warranty_end_date::text, 'NULL'));
    change_details := change_details || jsonb_build_object('warranty_end_date', jsonb_build_object('old', OLD.warranty_end_date, 'new', NEW.warranty_end_date));
  END IF;

  -- Dates
  IF OLD.purchase_date IS DISTINCT FROM NEW.purchase_date THEN
    changes_made := array_append(changes_made, 'Purchase Date: ' || COALESCE(OLD.purchase_date::text, 'NULL') || ' → ' || COALESCE(NEW.purchase_date::text, 'NULL'));
    change_details := change_details || jsonb_build_object('purchase_date', jsonb_build_object('old', OLD.purchase_date, 'new', NEW.purchase_date));
  END IF;

  IF OLD.manufacture_date IS DISTINCT FROM NEW.manufacture_date THEN
    changes_made := array_append(changes_made, 'Manufacture Date: ' || COALESCE(OLD.manufacture_date::text, 'NULL') || ' → ' || COALESCE(NEW.manufacture_date::text, 'NULL'));
    change_details := change_details || jsonb_build_object('manufacture_date', jsonb_build_object('old', OLD.manufacture_date, 'new', NEW.manufacture_date));
  END IF;

  -- Notes
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
