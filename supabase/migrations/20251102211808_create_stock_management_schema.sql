/*
  # Stock Management System with Multi-Company & Multi-Location Access Control

  ## Overview
  This migration creates a comprehensive stock management system with support for:
  - Multiple companies (tenants)
  - Multiple locations per company
  - Role-based access control (RBAC)
  - Inventory tracking
  - Stock movements
  - User permissions per company/location

  ## Tables Created

  ### 1. companies
  - `id` (uuid, primary key) - Unique company identifier
  - `name` (text) - Company name
  - `description` (text) - Company description
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  - `created_by` (uuid) - User who created the company

  ### 2. locations
  - `id` (uuid, primary key) - Unique location identifier
  - `company_id` (uuid, foreign key) - Associated company
  - `name` (text) - Location name
  - `address` (text) - Physical address
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. user_roles (enum)
  - Defines available roles: admin, manager, staff, viewer

  ### 4. user_company_access
  - `id` (uuid, primary key) - Unique access record identifier
  - `user_id` (uuid, foreign key) - User reference
  - `company_id` (uuid, foreign key) - Company reference
  - `role` (user_roles) - User's role in this company
  - `created_at` (timestamptz) - Creation timestamp

  ### 5. user_location_access
  - `id` (uuid, primary key) - Unique access record identifier
  - `user_id` (uuid, foreign key) - User reference
  - `location_id` (uuid, foreign key) - Location reference
  - `can_view` (boolean) - View permission
  - `can_edit` (boolean) - Edit permission
  - `created_at` (timestamptz) - Creation timestamp

  ### 6. inventory_items
  - `id` (uuid, primary key) - Unique item identifier
  - `company_id` (uuid, foreign key) - Associated company
  - `sku` (text) - Stock keeping unit
  - `name` (text) - Item name
  - `description` (text) - Item description
  - `unit_of_measure` (text) - e.g., pieces, kg, liters
  - `reorder_level` (integer) - Minimum stock level before reorder
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 7. stock_levels
  - `id` (uuid, primary key) - Unique stock level identifier
  - `item_id` (uuid, foreign key) - Associated inventory item
  - `location_id` (uuid, foreign key) - Associated location
  - `quantity` (decimal) - Current quantity in stock
  - `updated_at` (timestamptz) - Last update timestamp

  ### 8. stock_movements
  - `id` (uuid, primary key) - Unique movement identifier
  - `item_id` (uuid, foreign key) - Associated inventory item
  - `location_id` (uuid, foreign key) - Associated location
  - `movement_type` (text) - Type: in, out, transfer, adjustment
  - `quantity` (decimal) - Quantity moved (positive or negative)
  - `reference_number` (text) - External reference (PO, invoice, etc.)
  - `notes` (text) - Additional notes
  - `performed_by` (uuid) - User who performed the movement
  - `created_at` (timestamptz) - Movement timestamp

  ### 9. profiles
  - `id` (uuid, primary key) - Matches auth.users.id
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security

  ### Row Level Security (RLS)
  All tables have RLS enabled with policies ensuring:
  1. Users can only access data from companies they have access to
  2. Users can only access locations they have permission for
  3. Role-based permissions are enforced
  4. Super admins (company role = 'admin') have full access within their companies

  ### Access Control Logic
  - **Company Level**: Users must have a record in `user_company_access` to access company data
  - **Location Level**: Users must have a record in `user_location_access` to access location-specific data
  - **Role Hierarchy**: admin > manager > staff > viewer
  - **Permissions**: Different operations require different role levels

  ## Important Notes
  1. All foreign keys use CASCADE for deletions to maintain referential integrity
  2. Unique constraints ensure data consistency (e.g., unique SKU per company)
  3. Timestamps are automatically managed with triggers
  4. Stock levels are updated automatically via triggers on stock movements
*/

-- Create user_roles enum
CREATE TYPE user_roles AS ENUM ('admin', 'manager', 'staff', 'viewer');

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Create user_company_access table
CREATE TABLE IF NOT EXISTS user_company_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  role user_roles NOT NULL DEFAULT 'viewer',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Create user_location_access table
CREATE TABLE IF NOT EXISTS user_location_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  can_view boolean DEFAULT true,
  can_edit boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, location_id)
);

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  sku text NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  unit_of_measure text DEFAULT 'pieces',
  reorder_level integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, sku)
);

-- Create stock_levels table
CREATE TABLE IF NOT EXISTS stock_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  quantity decimal(15, 2) DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(item_id, location_id)
);

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'transfer', 'adjustment')),
  quantity decimal(15, 2) NOT NULL,
  reference_number text DEFAULT '',
  notes text DEFAULT '',
  performed_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_location_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policies for companies
CREATE POLICY "Users can view companies they have access to"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = companies.id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Company admins can update their companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = companies.id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = companies.id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policies for locations
CREATE POLICY "Users can view locations in their companies"
  ON locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = locations.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can insert locations"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = locations.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update locations"
  ON locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = locations.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = locations.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete locations"
  ON locations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = locations.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role = 'admin'
    )
  );

-- Policies for user_company_access
CREATE POLICY "Users can view their own company access"
  ON user_company_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all company access"
  ON user_company_access FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access uca
      WHERE uca.company_id = user_company_access.company_id
      AND uca.user_id = auth.uid()
      AND uca.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage company access"
  ON user_company_access FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access uca
      WHERE uca.company_id = user_company_access.company_id
      AND uca.user_id = auth.uid()
      AND uca.role = 'admin'
    )
  );

CREATE POLICY "Admins can update company access"
  ON user_company_access FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access uca
      WHERE uca.company_id = user_company_access.company_id
      AND uca.user_id = auth.uid()
      AND uca.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access uca
      WHERE uca.company_id = user_company_access.company_id
      AND uca.user_id = auth.uid()
      AND uca.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete company access"
  ON user_company_access FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access uca
      WHERE uca.company_id = user_company_access.company_id
      AND uca.user_id = auth.uid()
      AND uca.role = 'admin'
    )
  );

-- Policies for user_location_access
CREATE POLICY "Users can view their own location access"
  ON user_location_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins and managers can view all location access"
  ON user_location_access FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access uca
      JOIN locations l ON l.company_id = uca.company_id
      WHERE l.id = user_location_access.location_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can manage location access"
  ON user_location_access FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access uca
      JOIN locations l ON l.company_id = uca.company_id
      WHERE l.id = user_location_access.location_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update location access"
  ON user_location_access FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access uca
      JOIN locations l ON l.company_id = uca.company_id
      WHERE l.id = user_location_access.location_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access uca
      JOIN locations l ON l.company_id = uca.company_id
      WHERE l.id = user_location_access.location_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can delete location access"
  ON user_location_access FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access uca
      JOIN locations l ON l.company_id = uca.company_id
      WHERE l.id = user_location_access.location_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager')
    )
  );

-- Policies for inventory_items
CREATE POLICY "Users can view items in their companies"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = inventory_items.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins, managers, and staff can insert items"
  ON inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = inventory_items.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admins, managers, and staff can update items"
  ON inventory_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = inventory_items.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = inventory_items.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admins can delete items"
  ON inventory_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = inventory_items.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role = 'admin'
    )
  );

-- Policies for stock_levels
CREATE POLICY "Users can view stock levels for accessible locations"
  ON stock_levels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_location_access
      WHERE user_location_access.location_id = stock_levels.location_id
      AND user_location_access.user_id = auth.uid()
      AND user_location_access.can_view = true
    )
  );

-- Policies for stock_movements
CREATE POLICY "Users can view stock movements for accessible locations"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_location_access
      WHERE user_location_access.location_id = stock_movements.location_id
      AND user_location_access.user_id = auth.uid()
      AND user_location_access.can_view = true
    )
  );

CREATE POLICY "Users with edit access can create stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_location_access
      WHERE user_location_access.location_id = stock_movements.location_id
      AND user_location_access.user_id = auth.uid()
      AND user_location_access.can_edit = true
    )
    AND performed_by = auth.uid()
  );

-- Create function to update stock levels when movements occur
CREATE OR REPLACE FUNCTION update_stock_level()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stock_levels (item_id, location_id, quantity, updated_at)
  VALUES (NEW.item_id, NEW.location_id, NEW.quantity, now())
  ON CONFLICT (item_id, location_id)
  DO UPDATE SET
    quantity = stock_levels.quantity + NEW.quantity,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock movements
CREATE TRIGGER update_stock_on_movement
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_level();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();