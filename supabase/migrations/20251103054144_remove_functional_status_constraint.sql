/*
  # Remove Functional Status Check Constraint

  1. Changes
    - Drop the CHECK constraint on assets.functional_status
    - Allow any text value since functional statuses are configurable per company

  2. Notes
    - Companies can define their own functional statuses in the functional_statuses table
    - The hardcoded constraint was preventing the use of custom statuses
*/

-- Drop the existing CHECK constraint
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_functional_status_check;
