/*
  # Fix data destruction certificates relationship to profiles

  1. Changes
    - Add foreign key constraint from data_destruction_certificates.issued_by to profiles.id
    - This enables proper relationship tracking between certificates and the users who issued them
  
  2. Security
    - No changes to RLS policies
*/

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'data_destruction_certificates_issued_by_fkey'
    AND table_name = 'data_destruction_certificates'
  ) THEN
    ALTER TABLE data_destruction_certificates
    ADD CONSTRAINT data_destruction_certificates_issued_by_fkey
    FOREIGN KEY (issued_by) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;
