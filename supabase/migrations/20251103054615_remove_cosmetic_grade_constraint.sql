/*
  # Remove Cosmetic Grade Check Constraint

  1. Changes
    - Drop the CHECK constraint on assets.cosmetic_grade
    - Allow any text value since cosmetic grades are configurable per company

  2. Notes
    - Companies can define their own cosmetic grades in the cosmetic_grades table
    - The hardcoded constraint was preventing the use of custom grades
*/

-- Drop the existing CHECK constraint
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_cosmetic_grade_check;
