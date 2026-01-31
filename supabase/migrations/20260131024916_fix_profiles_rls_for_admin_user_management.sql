/*
  # Fix Profiles RLS for Admin User Management

  ## Problem
  Admins cannot view user profiles when managing users in their company because
  the profiles table only allows users to view their own profile.

  ## Solution
  Add a policy allowing admins to view profiles of all users who have access
  to their company.

  ## Changes
  1. Add policy: "Admins can view profiles of users in their company"
     - Allows admins to see profiles for user management purposes
     - Restricted to users who have access to the admin's company
*/

-- Allow admins to view profiles of users in their company
CREATE POLICY "Admins can view profiles of users in their company"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access uca1
      WHERE uca1.user_id = auth.uid()
      AND uca1.role = 'admin'
      AND EXISTS (
        SELECT 1 FROM user_company_access uca2
        WHERE uca2.user_id = profiles.id
        AND uca2.company_id = uca1.company_id
      )
    )
  );
