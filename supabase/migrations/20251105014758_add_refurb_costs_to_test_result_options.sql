/*
  # Add Refurbishment Costs to Test Result Options

  ## Overview
  Extends test result options to include refurbishment cost information.
  When a technician selects a test result (e.g., "Screen Cracked", "Battery Failed"),
  the system can automatically suggest or add the associated refurbishment cost.

  ## Changes

  1. **test_result_options table**
     - Add `refurb_cost_category` - The cost category name to use
     - Add `refurb_cost_amount` - Default cost amount for this result
     - Add `auto_add_cost` - Whether to automatically add the cost (vs just suggest)

  ## Use Cases

  ### Example 1: Screen Testing
  ```
  Checklist Item: "Screen Condition"
  Result Option: "Cracked Screen"
    - refurb_cost_category: "Screen Replacement"
    - refurb_cost_amount: 150.00
    - auto_add_cost: true
  
  When tech selects "Cracked Screen" → $150 Screen Replacement cost automatically added
  ```

  ### Example 2: Battery Testing
  ```
  Checklist Item: "Battery Health"
  Result Option: "Failed (< 50% capacity)"
    - refurb_cost_category: "Battery Replacement"
    - refurb_cost_amount: 45.00
    - auto_add_cost: true
  ```

  ### Example 3: Optional Costs
  ```
  Result Option: "Minor Scratches"
    - refurb_cost_category: "Cosmetic Touch-up"
    - refurb_cost_amount: 15.00
    - auto_add_cost: false (tech can decide whether to add)
  ```

  ## Benefits
  - Eliminates manual cost entry for common repairs
  - Ensures consistent pricing across technicians
  - Speeds up processing workflow
  - Tech can still override amounts if needed
  - Combines testing and costing in one action

  ## Security
  - No new tables created
  - Existing RLS policies apply to test_result_options
*/

-- Add refurbishment cost fields to test result options
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'test_result_options' AND column_name = 'refurb_cost_category'
  ) THEN
    ALTER TABLE test_result_options
      ADD COLUMN refurb_cost_category text,
      ADD COLUMN refurb_cost_amount decimal(10,2) DEFAULT 0,
      ADD COLUMN auto_add_cost boolean DEFAULT false;
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN test_result_options.refurb_cost_category IS 'Refurbishment cost category to add/suggest when this result is selected';
COMMENT ON COLUMN test_result_options.refurb_cost_amount IS 'Default cost amount for this test result (can be overridden)';
COMMENT ON COLUMN test_result_options.auto_add_cost IS 'If true, automatically add cost; if false, only suggest to technician';
