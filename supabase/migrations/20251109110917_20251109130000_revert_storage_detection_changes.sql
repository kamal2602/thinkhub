/*
  # Revert Storage Detection Changes

  1. Changes
    - Remove smart_detect_storage_type function
    - Restore original trigger logic
    - Go back to simple extract_technology_type detection

  2. Why
    - New logic broke storage component display
    - Reverting to working state
*/

-- Drop the new function
DROP FUNCTION IF EXISTS smart_detect_storage_type(text);

-- Restore original trigger with simple logic
CREATE OR REPLACE FUNCTION create_components_from_asset()
RETURNS TRIGGER AS $$
DECLARE
  ram_components jsonb;
  storage_components jsonb;
  component_record jsonb;
  ram_changed boolean := false;
  storage_changed boolean := false;
  storage_type text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    ram_changed := NEW.ram IS NOT NULL AND NEW.ram != '';
    storage_changed := NEW.storage IS NOT NULL AND NEW.storage != '';
  ELSIF TG_OP = 'UPDATE' THEN
    ram_changed := (OLD.ram IS DISTINCT FROM NEW.ram) AND NEW.ram IS NOT NULL AND NEW.ram != '';
    storage_changed := (OLD.storage IS DISTINCT FROM NEW.storage) AND NEW.storage IS NOT NULL AND NEW.storage != '';
  END IF;

  IF ram_changed THEN
    DELETE FROM asset_components
    WHERE asset_id = NEW.id AND component_type = 'RAM';

    ram_components := parse_component_pattern(NEW.ram);
    FOR component_record IN SELECT * FROM jsonb_array_elements(ram_components)
    LOOP
      INSERT INTO asset_components (
        company_id, asset_id, component_type, component_name,
        capacity, quantity, technology_type, status, condition, created_by, installed_date
      ) VALUES (
        NEW.company_id, NEW.id, 'RAM',
        'RAM ' || (component_record->>'capacity'),
        component_record->>'capacity',
        COALESCE((component_record->>'quantity')::int, 1),
        extract_technology_type(NEW.ram),
        'installed',
        'working',
        NEW.created_by,
        COALESCE(NEW.purchase_date, now())
      );
    END LOOP;
  END IF;

  IF storage_changed THEN
    DELETE FROM asset_components
    WHERE asset_id = NEW.id AND component_type IN ('SSD', 'HDD', 'NVMe', 'Other');

    storage_components := parse_component_pattern(NEW.storage);
    FOR component_record IN SELECT * FROM jsonb_array_elements(storage_components)
    LOOP
      -- Determine storage type (default to SSD if not specified)
      storage_type := extract_technology_type(NEW.storage);
      IF storage_type IS NULL OR storage_type NOT IN ('HDD', 'SSD', 'NVMe') THEN
        storage_type := 'SSD'; -- Default to SSD
      END IF;

      INSERT INTO asset_components (
        company_id, asset_id, component_type, component_name,
        capacity, quantity, technology_type, status, condition, created_by, installed_date
      ) VALUES (
        NEW.company_id, NEW.id,
        storage_type,
        storage_type || ' ' || (component_record->>'capacity'),
        component_record->>'capacity',
        COALESCE((component_record->>'quantity')::int, 1),
        storage_type,
        'installed',
        'working',
        NEW.created_by,
        COALESCE(NEW.purchase_date, now())
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS auto_create_components ON assets;

CREATE TRIGGER auto_create_components
  AFTER INSERT OR UPDATE OF ram, storage ON assets
  FOR EACH ROW
  EXECUTE FUNCTION create_components_from_asset();
