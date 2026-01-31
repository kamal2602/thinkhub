/*
  # Improve Storage Type Detection

  1. Changes
    - Add smart_detect_storage_type() function
    - Use capacity-based guessing when type not specified
    - Better defaults based on real-world patterns

  2. Logic
    - If text contains "SSD", "HDD", "NVMe" → Use that
    - If capacity <= 128GB → Likely SSD (modern small storage)
    - If capacity >= 256GB AND <= 512GB → Likely SSD (common laptop sizes)
    - If capacity >= 1TB → Likely HDD (large capacity usually mechanical)
    - Default → SSD (most modern laptops)

  3. Why
    - Supplier Excel often just says "500GB" without type
    - Need intelligent guessing based on capacity patterns
    - Improves accuracy of component creation
*/

-- Smart storage type detection with capacity-based guessing
CREATE OR REPLACE FUNCTION smart_detect_storage_type(storage_text text)
RETURNS text AS $$
DECLARE
  lower_text text;
  capacity_value numeric;
  capacity_unit text;
BEGIN
  IF storage_text IS NULL OR storage_text = '' THEN
    RETURN 'SSD'; -- Default for null/empty
  END IF;

  lower_text := lower(storage_text);

  -- First, check for explicit type keywords (most reliable)
  IF lower_text LIKE '%nvme%' OR lower_text LIKE '%m.2%' THEN 
    RETURN 'NVMe'; 
  END IF;
  
  IF lower_text LIKE '%ssd%' THEN 
    RETURN 'SSD'; 
  END IF;
  
  IF lower_text LIKE '%hdd%' OR lower_text LIKE '%hard drive%' THEN 
    RETURN 'HDD'; 
  END IF;

  -- No keyword found, use capacity-based guessing
  -- Extract numeric capacity
  capacity_value := substring(lower_text FROM '\d+')::numeric;
  
  IF lower_text LIKE '%tb%' THEN
    capacity_unit := 'TB';
  ELSIF lower_text LIKE '%gb%' THEN
    capacity_unit := 'GB';
  ELSE
    -- Can't determine capacity, default to SSD
    RETURN 'SSD';
  END IF;

  -- Capacity-based guessing rules:
  
  -- Very small storage (< 128GB) → Usually SSD in modern devices
  IF capacity_unit = 'GB' AND capacity_value < 128 THEN
    RETURN 'SSD';
  END IF;

  -- Common laptop sizes (128GB-512GB) → Usually SSD
  IF capacity_unit = 'GB' AND capacity_value >= 128 AND capacity_value <= 512 THEN
    RETURN 'SSD';
  END IF;

  -- Large capacity (>= 1TB) → Usually HDD (budget laptops, older systems)
  -- Exception: High-end devices may have 1TB+ SSD, but HDD is more common
  IF capacity_unit = 'TB' OR (capacity_unit = 'GB' AND capacity_value >= 1000) THEN
    RETURN 'HDD';
  END IF;

  -- Default fallback
  RETURN 'SSD';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the component creation trigger to use smart detection
DROP TRIGGER IF EXISTS auto_create_components ON assets;

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
      -- Use smart detection with capacity-based guessing
      storage_type := smart_detect_storage_type(NEW.storage);

      INSERT INTO asset_components (
        company_id, asset_id, component_type, component_name,
        capacity, quantity, technology_type, status, condition, created_by, installed_date
      ) VALUES (
        NEW.company_id, NEW.id,
        storage_type,
        storage_type || ' ' || (component_record->>'capacity'),
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

CREATE TRIGGER auto_create_components
  AFTER INSERT OR UPDATE OF ram, storage ON assets
  FOR EACH ROW
  EXECUTE FUNCTION create_components_from_asset();

-- Add helpful comment
COMMENT ON FUNCTION smart_detect_storage_type IS 
  'Intelligently detects storage type from text using keywords (NVMe/SSD/HDD) or capacity-based guessing. 
  Rules: <128GB=SSD, 128-512GB=SSD, >=1TB=HDD, default=SSD';
