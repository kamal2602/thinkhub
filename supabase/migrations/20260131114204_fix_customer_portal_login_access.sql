/*
  # Fix Customer Portal Login Access
  
  1. Changes
    - Add policy to allow public SELECT access to customer_portal_users for login authentication
    - This allows the login form to query user credentials without requiring Supabase Auth
    
  2. Security
    - Only allows SELECT (read) operations
    - Password verification still happens in application code
    - Other operations still require proper authentication
*/

-- Allow public read access for customer portal login authentication
CREATE POLICY "Allow public read for customer portal authentication"
  ON customer_portal_users
  FOR SELECT
  TO anon
  USING (true);
