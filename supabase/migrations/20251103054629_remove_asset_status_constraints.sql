/*
  # Remove Asset Status Check Constraints

  1. Changes
    - Drop CHECK constraints on assets.status and assets.refurbishment_status
    - Allow any text value since these are configurable per company

  2. Notes
    - Companies can define their own asset statuses in asset_statuses table
    - Refurbishment statuses should be flexible
    - The hardcoded constraints were preventing custom status values
*/

-- Drop the existing CHECK constraints
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_status_check;
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_refurbishment_status_check;
