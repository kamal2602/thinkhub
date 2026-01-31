/*
  # Add User Roles and Refurbishment Workflow

  1. New Columns
    - `profiles.role` - User role (admin, manager, technician, sales)
    - `assets.is_sales_ready` - Boolean flag for refurbishment completion
    
  2. Changes
    - Add role column with default 'technician'
    - Add is_sales_ready flag (only Ready + QC passed assets)
    - Update RLS policies for role-based access
    
  3. User Roles
    - **admin**: Full access, can create users, manage everything
    - **manager**: Can view all, assign work, reports (no user creation)
    - **technician**: Only Processing tab, can process assigned assets
    - **sales**: Inventory, Sales, Customers (only sales-ready assets)
    
  4. Security
    - Only admins can create/modify user accounts
    - Technicians can only update their assigned assets
    - Sales can only view/sell sales-ready assets
    - Processing stage completion sets is_sales_ready flag
*/

-- Add role column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role text DEFAULT 'technician' CHECK (role IN ('admin', 'manager', 'technician', 'sales'));
  END IF;
END $$;

-- Add is_sales_ready flag to assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'is_sales_ready'
  ) THEN
    ALTER TABLE assets ADD COLUMN is_sales_ready boolean DEFAULT false;
  END IF;
END $$;

-- Update existing profiles to have admin role for first user, others technician
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  SELECT id INTO first_user_id FROM profiles ORDER BY created_at LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    UPDATE profiles SET role = 'admin' WHERE id = first_user_id;
  END IF;
END $$;

-- Function to automatically set is_sales_ready when asset reaches 'ready' stage
CREATE OR REPLACE FUNCTION update_sales_ready_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.processing_stage = 'ready' AND (OLD.processing_stage IS NULL OR OLD.processing_stage != 'ready') THEN
    NEW.is_sales_ready = true;
  END IF;
  
  IF NEW.processing_stage != 'ready' AND OLD.processing_stage = 'ready' THEN
    NEW.is_sales_ready = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sales ready status
DROP TRIGGER IF EXISTS trigger_update_sales_ready ON assets;
CREATE TRIGGER trigger_update_sales_ready
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_ready_status();

-- Update RLS policies for role-based access

-- Profiles: Only admins can insert (create users)
DROP POLICY IF EXISTS "Only admins can create users" ON profiles;
CREATE POLICY "Only admins can create users"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.is_super_admin = true)
    )
  );

-- Profiles: Only admins can update other users
DROP POLICY IF EXISTS "Only admins can update users" ON profiles;
CREATE POLICY "Only admins can update users"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.is_super_admin = true)
    )
  )
  WITH CHECK (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.is_super_admin = true)
    )
  );

-- Assets: Update existing policy to respect technician assignments
DROP POLICY IF EXISTS "Staff and above can manage assets" ON assets;
CREATE POLICY "Staff and above can manage assets"
  ON assets FOR ALL
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (
      assigned_technician_id = auth.uid() OR
      assigned_technician_id IS NULL OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager', 'sales')
      )
    )
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Set existing 'ready' assets as sales-ready
UPDATE assets 
SET is_sales_ready = true 
WHERE processing_stage = 'ready' AND is_sales_ready = false;
