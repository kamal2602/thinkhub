/*
  # Add Component Auto-Creation on Asset Update

  1. Changes
    - Modify auto_create_components trigger to fire on both INSERT and UPDATE
    - Only create components when RAM or Storage fields change
    - Prevents duplicate component creation

  2. Why
    - Currently components only auto-create on INSERT
    - When assets are updated with RAM/Storage, components aren't created
    - This fixes the "No components in component box" issue
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS auto_create_components ON assets;

-- Modify function to handle both INSERT and UPDATE
CREATE OR REPLACE FUNCTION create_components_from_asset()
RETURNS TRIGGER AS $$
DECLARE
  ram_components jsonb;
  storage_components jsonb;
  component_record jsonb;
  ram_changed boolean := false;
  storage_changed boolean := false;
BEGIN
  -- Determine if RAM or Storage changed (for UPDATE) or if it's an INSERT
  IF TG_OP = 'INSERT' THEN
    ram_changed := NEW.ram IS NOT NULL AND NEW.ram != '';
    storage_changed := NEW.storage IS NOT NULL AND NEW.storage != '';
  ELSIF TG_OP = 'UPDATE' THEN
    ram_changed := (OLD.ram IS DISTINCT FROM NEW.ram) AND NEW.ram IS NOT NULL AND NEW.ram != '';
    storage_changed := (OLD.storage IS DISTINCT FROM NEW.storage) AND NEW.storage IS NOT NULL AND NEW.storage != '';
  END IF;

  -- Process RAM components if changed
  IF ram_changed THEN
    -- Delete existing RAM components for this asset
    DELETE FROM asset_components
    WHERE asset_id = NEW.id AND component_type = 'RAM';

    -- Parse and create new RAM components
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

  -- Process Storage components if changed
  IF storage_changed THEN
    -- Delete existing Storage components for this asset
    DELETE FROM asset_components
    WHERE asset_id = NEW.id AND component_type IN ('SSD', 'HDD', 'NVMe', 'Storage');

    -- Parse and create new Storage components
    storage_components := parse_component_pattern(NEW.storage);
    FOR component_record IN SELECT * FROM jsonb_array_elements(storage_components)
    LOOP
      INSERT INTO asset_components (
        company_id, asset_id, component_type, component_name,
        capacity, quantity, technology_type, status, condition, created_by, installed_date
      ) VALUES (
        NEW.company_id, NEW.id,
        COALESCE(extract_technology_type(NEW.storage), 'Storage'),
        (COALESCE(extract_technology_type(NEW.storage), 'Storage')) || ' ' || (component_record->>'capacity'),
        component_record->>'capacity',
        COALESCE((component_record->>'quantity')::int, 1),
        extract_technology_type(NEW.storage),
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

-- Create trigger that fires on both INSERT and UPDATE
CREATE TRIGGER auto_create_components
  AFTER INSERT OR UPDATE OF ram, storage ON assets
  FOR EACH ROW
  EXECUTE FUNCTION create_components_from_asset();
