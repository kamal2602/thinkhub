/*
  # Remove Hardcoded Processing Stage Constraint
  
  1. Changes
    - Drop the CHECK constraint on assets.processing_stage
    - Allow any processing stage value to support dynamic stage management
  
  2. Reasoning
    - The system now uses the processing_stages table for stage management
    - Hardcoded CHECK constraint prevents using new stages like 'awaiting_parts', 'scrapped'
    - Validation is better handled at application level with reference to processing_stages table
  
  3. Impact
    - Enables full dynamic processing stage workflow
    - Users can add custom stages without database migration
    - Existing assets remain unchanged
*/

-- Drop the hardcoded CHECK constraint
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_processing_stage_check;

-- Add a foreign key-like validation comment for documentation
COMMENT ON COLUMN assets.processing_stage IS 'References processing_stages.stage_key - validated at application level';
