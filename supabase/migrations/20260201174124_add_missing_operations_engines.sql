/*
  # Add Missing Operations Engines to Registry

  1. Adds Missing Engines
    - `processing` - Asset testing, grading, and refurbishment workflows
    - `receiving` - Smart PO receiving and intake
    - `repairs` - Repair ticket management
  
  2. Fixes
    - Updates lot workspace route from /lots to /purchase-lots
    - Sets all as installed and enabled by default
  
  3. Safety
    - Uses ON CONFLICT DO UPDATE to handle existing entries
    - Only updates necessary fields
*/

-- Add Processing engine
INSERT INTO engines (
  company_id, key, title, description, icon, category,
  is_core, is_installed, is_enabled,
  workspace_route, settings_route, version, sort_order, depends_on
)
SELECT 
  id,
  'processing',
  'Processing',
  'Asset testing, grading, and refurbishment workflows',
  'Wrench',
  'operations',
  false,
  true,
  true,
  '/processing',
  '/settings/processing',
  '1.0.0',
  10,
  '["inventory"]'::jsonb
FROM companies
ON CONFLICT (company_id, key) 
DO UPDATE SET
  is_installed = true,
  is_enabled = true,
  workspace_route = '/processing';

-- Add Receiving engine
INSERT INTO engines (
  company_id, key, title, description, icon, category,
  is_core, is_installed, is_enabled,
  workspace_route, settings_route, version, sort_order, depends_on
)
SELECT 
  id,
  'receiving',
  'Receiving',
  'Smart purchase order receiving and intake',
  'PackageOpen',
  'operations',
  false,
  true,
  true,
  '/smart-receiving',
  '/settings/receiving',
  '1.0.0',
  11,
  '["inventory"]'::jsonb
FROM companies
ON CONFLICT (company_id, key) 
DO UPDATE SET
  is_installed = true,
  is_enabled = true,
  workspace_route = '/smart-receiving';

-- Add Repairs engine
INSERT INTO engines (
  company_id, key, title, description, icon, category,
  is_core, is_installed, is_enabled,
  workspace_route, settings_route, version, sort_order, depends_on
)
SELECT 
  id,
  'repairs',
  'Repairs',
  'Customer repair ticket tracking and management',
  'Tool',
  'operations',
  false,
  true,
  true,
  '/repairs',
  '/settings/repairs',
  '1.0.0',
  12,
  '["inventory"]'::jsonb
FROM companies
ON CONFLICT (company_id, key) 
DO UPDATE SET
  is_installed = true,
  is_enabled = true,
  workspace_route = '/repairs';

-- Fix Purchase Lots workspace route
UPDATE engines 
SET workspace_route = '/purchase-lots'
WHERE key = 'lots' AND workspace_route = '/lots';
