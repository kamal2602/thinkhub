/*
  # Add issued_by foreign key to recycling_certificates

  1. Changes
    - Add foreign key constraint from recycling_certificates.issued_by to profiles.id
    - This enables proper relationship tracking for both certificate types
  
  2. Security
    - No changes to RLS policies
*/

-- Add foreign key constraint for recycling_certificates if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'recycling_certificates_issued_by_fkey'
    AND table_name = 'recycling_certificates'
  ) THEN
    ALTER TABLE recycling_certificates
    ADD CONSTRAINT recycling_certificates_issued_by_fkey
    FOREIGN KEY (issued_by) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;
