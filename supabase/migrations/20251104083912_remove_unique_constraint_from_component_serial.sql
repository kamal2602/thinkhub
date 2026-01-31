/*
  # Remove Unique Constraint from Component Serial

  1. Changes
    - Drop the UNIQUE constraint on `component_serial` in `asset_components` table
  
  2. Reason
    - Component serials can be reused across different assets
    - A CPU harvested from Asset A can later be installed in Asset B
    - The same component serial should be allowed to appear multiple times in the table
    - The combination of (asset_id, component_type, component_serial) provides sufficient uniqueness
*/

ALTER TABLE asset_components 
DROP CONSTRAINT IF EXISTS asset_components_component_serial_key;
