/*
  # Update Engine Registry for Procurement

  1. Changes
    - Rename "Orders" engine to "Procurement"
    - Update description to reflect centralized inbound management
    - Hide "Lots" from launcher by disabling it
  
  2. Purpose
    - Procurement becomes the single entry point for all inbound flows
    - Lots are internal detail, not top-level navigation
*/

-- Update orders engine to procurement
UPDATE engines
SET
  title = 'Procurement',
  description = 'Centralized inbound management: resale purchases, ITAD projects, and recycling orders',
  workspace_route = '/procurement'
WHERE key = 'orders';

-- Also update if key is already procurement
UPDATE engines
SET
  title = 'Procurement',
  description = 'Centralized inbound management: resale purchases, ITAD projects, and recycling orders',
  workspace_route = '/procurement'
WHERE key = 'procurement';

-- Hide lots from launcher by disabling it
UPDATE engines
SET is_enabled = false
WHERE key = 'lots';