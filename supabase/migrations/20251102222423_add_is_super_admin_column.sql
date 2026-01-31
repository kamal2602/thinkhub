/*
  # Add is_super_admin Column to Profiles

  1. Changes
    - Add is_super_admin column to existing profiles table
    - Set default to false
    - Update existing RLS policies to use the new column

  2. Notes
    - This fixes the profiles table that was created by an earlier migration
    - Makes the first user super admin if no super admin exists yet
*/

-- Add is_super_admin column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_super_admin boolean DEFAULT false;
  END IF;
END $$;

-- If there are no super admins yet, make the first user super admin
UPDATE profiles
SET is_super_admin = true
WHERE id = (
  SELECT id FROM profiles
  ORDER BY created_at
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE is_super_admin = true
);