/*
  # Allow Admins to View All Companies

  1. Changes
    - Add SELECT policy for users with role='admin' in profiles table
    - Allows admins to see all companies when creating users
    
  2. Security
    - Only users with profiles.role = 'admin' can view all companies
    - Super admins already have access via existing policy
    - Regular staff still restricted to their assigned companies
*/

-- Add policy to allow admins to view all companies
CREATE POLICY "Admins can view all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add comment
COMMENT ON POLICY "Admins can view all companies" ON companies IS 'Allows users with admin role to view all companies for user management';
