/*
  # Fix certificate issued_by to reference profiles instead of auth.users

  1. Changes
    - Drop existing foreign keys from data_destruction_certificates.issued_by to auth.users
    - Drop existing foreign keys from recycling_certificates.issued_by to auth.users
    - Add new foreign keys to profiles.id instead
    - This aligns with the component's query expectations
  
  2. Security
    - No changes to RLS policies
*/

-- Fix data_destruction_certificates
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'data_destruction_certificates_issued_by_fkey'
    AND table_name = 'data_destruction_certificates'
  ) THEN
    ALTER TABLE data_destruction_certificates
    DROP CONSTRAINT data_destruction_certificates_issued_by_fkey;
  END IF;
END $$;

-- Add new constraint pointing to profiles
ALTER TABLE data_destruction_certificates
ADD CONSTRAINT data_destruction_certificates_issued_by_fkey
FOREIGN KEY (issued_by) REFERENCES profiles(id) ON DELETE RESTRICT;

-- Fix recycling_certificates
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'recycling_certificates_issued_by_fkey'
    AND table_name = 'recycling_certificates'
  ) THEN
    ALTER TABLE recycling_certificates
    DROP CONSTRAINT recycling_certificates_issued_by_fkey;
  END IF;
END $$;

-- Add new constraint pointing to profiles
ALTER TABLE recycling_certificates
ADD CONSTRAINT recycling_certificates_issued_by_fkey
FOREIGN KEY (issued_by) REFERENCES profiles(id) ON DELETE RESTRICT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
