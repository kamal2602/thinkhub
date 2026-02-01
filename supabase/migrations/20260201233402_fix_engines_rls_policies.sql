/*
  # Fix Engines Table RLS Policies
  
  ## Problem
  The existing RLS policies reference profiles.company_id but the profiles table
  doesn't have a company_id column. The system uses user_company_access for 
  the many-to-many relationship between users and companies.
  
  ## Solution
  Update the RLS policies to correctly query user_company_access
  
  ## Changes
  - Drop existing policies
  - Create new policies using user_company_access
*/

-- Drop existing broken policies
DROP POLICY IF EXISTS "Users can view engines for their company" ON engines;
DROP POLICY IF EXISTS "Admins can manage engines" ON engines;

-- Create corrected policies
CREATE POLICY "Users can view engines for their companies"
  ON engines FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage engines for their companies"
  ON engines FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT uca.company_id FROM user_company_access uca
      INNER JOIN profiles p ON p.id = uca.user_id
      WHERE uca.user_id = auth.uid()
      AND (p.role IN ('admin', 'super_admin') OR p.is_super_admin = true)
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT uca.company_id FROM user_company_access uca
      INNER JOIN profiles p ON p.id = uca.user_id
      WHERE uca.user_id = auth.uid()
      AND (p.role IN ('admin', 'super_admin') OR p.is_super_admin = true)
    )
  );
