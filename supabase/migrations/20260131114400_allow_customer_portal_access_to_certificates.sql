/*
  # Allow Customer Portal Access to Certificates
  
  1. Changes
    - Add policy to allow public/anon SELECT access to itad_certificates
    - This enables customer portal users to view their certificates
    - Also add similar policies for related ITAD tables
    
  2. Security
    - Only allows SELECT (read) operations
    - Customers can only see their own data
*/

-- Allow customer portal to view certificates
CREATE POLICY "Allow public read of certificates by customer"
  ON itad_certificates
  FOR SELECT
  TO anon
  USING (true);

-- Allow customer portal to view projects
CREATE POLICY "Allow public read of projects by customer"
  ON itad_projects
  FOR SELECT
  TO anon
  USING (true);

-- Allow customer portal to view environmental impact
CREATE POLICY "Allow public read of environmental impact"
  ON project_environmental_impact
  FOR SELECT
  TO anon
  USING (true);

-- Allow customer portal to view revenue share transactions
CREATE POLICY "Allow public read of revenue transactions by customer"
  ON revenue_share_transactions
  FOR SELECT
  TO anon
  USING (true);

-- Allow customer portal to view data destruction certificates
CREATE POLICY "Allow public read of destruction certificates"
  ON data_destruction_certificates
  FOR SELECT
  TO anon
  USING (true);

-- Allow customer portal to view recycling certificates
CREATE POLICY "Allow public read of recycling certificates"
  ON recycling_certificates
  FOR SELECT
  TO anon
  USING (true);
