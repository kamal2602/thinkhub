/*
  # Fix user_company_access Foreign Key to Profiles
  
  ## Changes
  - Add foreign key constraint from user_company_access.user_id to profiles.id
  - This allows PostgREST to properly join these tables in queries
  
  ## Notes
  - Uses IF NOT EXISTS pattern for safety
*/

DO $$
BEGIN
  -- Add foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_company_access_user_id_fkey' 
    AND table_name = 'user_company_access'
  ) THEN
    ALTER TABLE user_company_access 
    ADD CONSTRAINT user_company_access_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
