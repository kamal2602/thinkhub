/*
  # Improve Import Field Mapping Keywords

  1. Purpose
    - Update auto_map_keywords to include more variations (e.g., "processor type", "memory type")
    - Fix keyword ordering to prioritize longer, more specific phrases
    - Ensure "Processor Type" maps to CPU field instead of Product Type

  2. Changes
    - Update all existing import_field_mappings with improved keyword lists
    - Keywords are now ordered from longest to shortest for better matching
    - Add common variations like "processor type", "memory size", etc.

  3. Notes
    - This migration updates existing data without dropping records
    - Companies with custom mappings will have their keywords enhanced
    - The UI allows users to edit these keywords in Settings → Import Field Mappings
*/

-- Update product_type keywords (keep longer phrases first)
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['product type', 'product category', 'item type', 'device type', 'category']
WHERE field_name = 'product_type'
  AND is_active = true;

-- Update brand keywords
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['brand', 'manufacturer', 'mfr', 'make', 'vendor name', 'oem']
WHERE field_name = 'brand'
  AND is_active = true;

-- Update model keywords (longer phrases first)
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['model', 'model number', 'part number', 'part#', 'partnumber', 'product name', 'item']
WHERE field_name = 'model'
  AND is_active = true;

-- Update serial_number keywords (longer phrases first)
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['serial number', 'serial#', 'service tag', 's/n', 'sn', 'serial']
WHERE field_name = 'serial_number'
  AND is_active = true;

-- Update quantity keywords
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['quantity', 'qty', 'available', 'avail', 'stock', 'count', 'units']
WHERE field_name = 'quantity_ordered'
  AND is_active = true;

-- Update unit_cost keywords (longer phrases first)
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['unit price', 'unit cost', 'per unit', 'price', 'cost', 'each', 'amount', 'value']
WHERE field_name = 'unit_cost'
  AND is_active = true;

-- Update description keywords
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['description', 'item description', 'product description', 'desc', 'details']
WHERE field_name = 'description'
  AND is_active = true;

-- Update condition/grade keywords (longer phrases first)
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['cosmetic grade', 'grade', 'condition', 'cosmetic', 'quality', 'rating']
WHERE field_name = 'expected_condition'
  AND is_active = true;

-- Update supplier_sku keywords
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['supplier sku', 'vendor sku', 'item number', 'item#', 'sku']
WHERE field_name = 'supplier_sku'
  AND is_active = true;

-- CRITICAL: Update CPU/Processor keywords with "processor type" FIRST
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['processor type', 'processor model', 'cpu type', 'cpu model', 'processor', 'cpu', 'proc', 'chip']
WHERE field_name = 'specifications.cpu'
  AND is_active = true;

-- Update RAM/Memory keywords (longer phrases first)
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['memory type', 'ram type', 'memory size', 'ram size', 'ram', 'memory', 'mem']
WHERE field_name = 'specifications.ram'
  AND is_active = true;

-- Update storage keywords (longer phrases first)
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['storage type', 'storage capacity', 'hard drive', 'storage', 'hdd', 'ssd', 'drive', 'disk']
WHERE field_name = 'specifications.storage'
  AND is_active = true;

-- Update screen size keywords (longer phrases first)
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['screen size', 'display size', 'screen', 'display', 'lcd', 'monitor']
WHERE field_name = 'specifications.screen_size'
  AND is_active = true;

-- Update graphics keywords (longer phrases first)
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['graphics card', 'video card', 'graphics', 'gpu', 'video']
WHERE field_name = 'specifications.graphics'
  AND is_active = true;

-- Update OS keywords (longer phrases first)
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['operating system', 'os', 'software', 'windows', 'macos']
WHERE field_name = 'specifications.os'
  AND is_active = true;

-- Update functional_notes keywords
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['functional status', 'functional', 'function', 'test', 'working', 'status']
WHERE field_name = 'specifications.functional_notes'
  AND is_active = true;

-- Update cosmetic_notes keywords (longer phrases first)
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['cosmetic notes', 'appearance', 'physical', 'cosmetic']
WHERE field_name = 'specifications.cosmetic_notes'
  AND is_active = true;

-- Update notes keywords
UPDATE import_field_mappings
SET auto_map_keywords = ARRAY['notes', 'comments', 'remarks', 'memo', 'issue', 'issues']
WHERE field_name = 'notes'
  AND is_active = true;
