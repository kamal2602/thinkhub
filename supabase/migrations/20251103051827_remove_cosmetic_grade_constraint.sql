/*
  # Remove Hardcoded Cosmetic Grade Constraint

  ## Overview
  Removes the hardcoded CHECK constraint on assets.cosmetic_grade to allow
  users to define custom cosmetic grades in the cosmetic_grades table.

  ## Changes
  1. Drop the CHECK constraint on assets.cosmetic_grade
  2. This allows any text value, which should match entries in cosmetic_grades table
  
  ## Notes
  - Application logic should validate against cosmetic_grades table
  - Users can now add custom grades like "Grade D", "Pristine", etc.
*/

-- Drop the CHECK constraint on cosmetic_grade
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_cosmetic_grade_check;
