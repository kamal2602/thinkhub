/*
  # Add Missing Engines to Registry

  1. Purpose
    - Add missing engines that have components but aren't in registry
    - Ensure all companies get these engines auto-enabled
    - Fix sidebar visibility

  2. Missing Engines
    - processing: Core operations workflow
    - receiving: Smart receiving workflow
    - repairs: Repairs management
    - esg: ESG reporting dashboard

  3. Changes
    - Insert missing engines for all existing companies
    - Set all as enabled by default
*/

-- Get all company IDs for dynamic insertion
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    
    -- Add Processing engine if not exists
    INSERT INTO engines (
      company_id, key, title, description, icon, category, 
      is_core, is_installed, is_enabled, workspace_route, sort_order
    )
    SELECT 
      company_record.id,
      'processing',
      'Processing',
      'Asset testing, grading, and refurbishment workflow',
      'Cog',
      'operations',
      true,
      true,
      true,
      '/processing',
      1
    WHERE NOT EXISTS (
      SELECT 1 FROM engines 
      WHERE company_id = company_record.id AND key = 'processing'
    );

    -- Add Receiving engine if not exists
    INSERT INTO engines (
      company_id, key, title, description, icon, category, 
      is_core, is_installed, is_enabled, workspace_route, sort_order
    )
    SELECT 
      company_record.id,
      'receiving',
      'Receiving',
      'Smart receiving workflow with discrepancy tracking',
      'PackageCheck',
      'operations',
      true,
      true,
      true,
      '/receiving',
      2
    WHERE NOT EXISTS (
      SELECT 1 FROM engines 
      WHERE company_id = company_record.id AND key = 'receiving'
    );

    -- Add Repairs engine if not exists
    INSERT INTO engines (
      company_id, key, title, description, icon, category, 
      is_core, is_installed, is_enabled, workspace_route, sort_order
    )
    SELECT 
      company_record.id,
      'repairs',
      'Repairs',
      'Repair work orders and component replacement tracking',
      'Wrench',
      'operations',
      false,
      true,
      true,
      '/repairs',
      50
    WHERE NOT EXISTS (
      SELECT 1 FROM engines 
      WHERE company_id = company_record.id AND key = 'repairs'
    );

    -- Add ESG engine if not exists
    INSERT INTO engines (
      company_id, key, title, description, icon, category, 
      is_core, is_installed, is_enabled, workspace_route, sort_order
    )
    SELECT 
      company_record.id,
      'esg',
      'ESG Reporting',
      'Environmental, social, and governance impact tracking',
      'Leaf',
      'business',
      false,
      true,
      true,
      '/esg',
      60
    WHERE NOT EXISTS (
      SELECT 1 FROM engines 
      WHERE company_id = company_record.id AND key = 'esg'
    );

  END LOOP;
END $$;
