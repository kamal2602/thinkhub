/*
  # Fix RLS Infinite Recursion Issue

  ## Changes
  1. Drop the problematic "Admins can view all company access" policy that causes infinite recursion
  2. Add a new policy for super admins to view all company access using the is_super_admin function

  ## Security
  - Users can still view their own company access records
  - Super admins can view all company access records (using the profiles table check instead of recursion)
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all company access" ON user_company_access;

-- Add a new policy for super admins to view all company access
CREATE POLICY "Super admins can view all company access"
  ON user_company_access FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));
