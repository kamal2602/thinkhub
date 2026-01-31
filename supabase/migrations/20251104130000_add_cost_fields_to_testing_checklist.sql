/*
  # Testing Checklist Cost Integration

  ## Overview
  Adds cost tracking fields to testing checklist templates, enabling automatic
  refurbishment cost suggestions when tests fail or need repair.

  ## Changes

  1. **testing_checklist_templates table**
     - Add `default_cost_category` - suggested category when test fails
     - Add `default_cost_amount` - suggested cost amount
     - Add `trigger_result_options` - which test results trigger cost prompt (jsonb array)

  ## Features
  - Pre-configure costs for common test failures
  - Different costs can be suggested for different result types
  - Tech can accept suggestion or enter custom amount
  - Speeds up refurbishment cost tracking workflow

  ## Example Usage
  ```
  Checklist Item: "Screen"
  - Trigger Results: ["Fail", "Needs Repair"]
  - Default Category: "Screen Replacement"
  - Default Cost: $120.00

  When tech marks Screen as "Fail":
  → System prompts: "Add Screen Replacement cost ($120)?"
  ```

  ## Security
  - No new tables, only columns added
  - Existing RLS policies apply
*/

-- Add cost-related fields to testing checklist templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'testing_checklist_templates' AND column_name = 'default_cost_category'
  ) THEN
    ALTER TABLE testing_checklist_templates
      ADD COLUMN default_cost_category text,
      ADD COLUMN default_cost_amount decimal(10,2) DEFAULT 0,
      ADD COLUMN trigger_result_options jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add helpful comment
COMMENT ON COLUMN testing_checklist_templates.default_cost_category IS 'Suggested refurbishment cost category when test triggers cost prompt';
COMMENT ON COLUMN testing_checklist_templates.default_cost_amount IS 'Suggested cost amount (can be overridden by tech)';
COMMENT ON COLUMN testing_checklist_templates.trigger_result_options IS 'Array of result option names that trigger cost prompt (e.g., ["Fail", "Needs Repair"])';
