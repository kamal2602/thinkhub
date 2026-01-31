/*
  # Remove Cost Categories and Presets System

  This migration removes the redundant cost categories and presets tables
  in favor of using test result options for automatic cost tracking.

  1. Changes
    - Drop `refurbishment_cost_presets` table
    - Drop `refurbishment_cost_categories` table
    - Drop `testing_checklist_cost_rules` table
    - Remove cost category columns from `testing_checklist_templates`

  2. Impact
    - Cost categories and presets are no longer needed
    - Test result options handle automatic cost prompting
    - Manual cost entry remains available with freeform category text
    - All existing refurbishment cost records remain intact

  3. Important Notes
    - This does NOT affect `asset_refurbishment_costs` table
    - Historical cost data is preserved
    - Test result cost fields remain functional
*/

-- Drop tables that are no longer needed
DROP TABLE IF EXISTS testing_checklist_cost_rules CASCADE;
DROP TABLE IF EXISTS refurbishment_cost_presets CASCADE;
DROP TABLE IF EXISTS refurbishment_cost_categories CASCADE;

-- Remove cost-related columns from testing_checklist_templates
-- These columns were used for the old cost configuration system
ALTER TABLE testing_checklist_templates
  DROP COLUMN IF EXISTS default_cost_category,
  DROP COLUMN IF EXISTS default_cost_amount,
  DROP COLUMN IF EXISTS trigger_result_options;
