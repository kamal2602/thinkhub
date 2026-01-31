/*
  # Add Stock Pro Features - Invoicing, Repairs, Returns, Suppliers & Customers

  ## Overview
  This migration extends the stock management system with comprehensive features:
  - Suppliers and Customers management
  - Purchase and Sales Invoicing with payment tracking
  - Returns management (sales and purchase returns)
  - Repairs/Service tracking
  - Enhanced inventory with categories and barcodes
  - Profit tracking

  ## New Tables

  ### 1. categories
  - `id` (uuid, primary key) - Unique category identifier
  - `company_id` (uuid, foreign key) - Associated company
  - `name` (text) - Category name
  - `parent_id` (uuid, nullable) - For subcategories
  - `created_at` (timestamptz) - Creation timestamp

  ### 2. suppliers
  - `id` (uuid, primary key) - Unique supplier identifier
  - `company_id` (uuid, foreign key) - Associated company
  - `name` (text) - Supplier/company name
  - `contact_person` (text) - Contact person name
  - `phone` (text) - Phone number
  - `email` (text) - Email address
  - `address` (text) - Physical address
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. customers
  - `id` (uuid, primary key) - Unique customer identifier
  - `company_id` (uuid, foreign key) - Associated company
  - `name` (text) - Customer name
  - `phone` (text) - Phone number
  - `email` (text) - Email address
  - `address` (text) - Physical address
  - `created_at` (timestamptz) - Creation timestamp

  ### 4. purchase_invoices
  - `id` (uuid, primary key) - Unique invoice identifier
  - `company_id` (uuid, foreign key) - Associated company
  - `supplier_id` (uuid, foreign key) - Associated supplier
  - `invoice_number` (text) - Invoice number
  - `invoice_date` (date) - Invoice date
  - `total_amount` (decimal) - Total invoice amount
  - `paid_amount` (decimal) - Amount paid
  - `payment_status` (text) - paid, partial, unpaid
  - `notes` (text) - Additional notes
  - `created_by` (uuid) - User who created invoice
  - `created_at` (timestamptz) - Creation timestamp

  ### 5. purchase_invoice_items
  - `id` (uuid, primary key) - Unique item identifier
  - `invoice_id` (uuid, foreign key) - Associated invoice
  - `item_id` (uuid, foreign key) - Associated inventory item
  - `location_id` (uuid, foreign key) - Stock location
  - `quantity` (decimal) - Quantity purchased
  - `unit_price` (decimal) - Price per unit
  - `total_price` (decimal) - Line total

  ### 6. sales_invoices
  - `id` (uuid, primary key) - Unique invoice identifier
  - `company_id` (uuid, foreign key) - Associated company
  - `customer_id` (uuid, foreign key) - Associated customer
  - `invoice_number` (text) - Invoice number
  - `invoice_date` (date) - Invoice date
  - `total_amount` (decimal) - Total invoice amount
  - `paid_amount` (decimal) - Amount paid
  - `payment_status` (text) - paid, partial, unpaid
  - `notes` (text) - Additional notes
  - `created_by` (uuid) - User who created invoice
  - `created_at` (timestamptz) - Creation timestamp

  ### 7. sales_invoice_items
  - `id` (uuid, primary key) - Unique item identifier
  - `invoice_id` (uuid, foreign key) - Associated invoice
  - `item_id` (uuid, foreign key) - Associated inventory item
  - `location_id` (uuid, foreign key) - Stock location
  - `quantity` (decimal) - Quantity sold
  - `unit_price` (decimal) - Selling price per unit
  - `cost_price` (decimal) - Cost price for profit calculation
  - `total_price` (decimal) - Line total

  ### 8. returns
  - `id` (uuid, primary key) - Unique return identifier
  - `company_id` (uuid, foreign key) - Associated company
  - `return_type` (text) - sales_return or purchase_return
  - `invoice_id` (uuid, nullable) - Original invoice reference
  - `reference_number` (text) - Return reference number
  - `return_date` (date) - Return date
  - `total_amount` (decimal) - Total return amount
  - `refund_amount` (decimal) - Amount refunded
  - `refund_method` (text) - cash, credit, exchange
  - `reason` (text) - Return reason
  - `notes` (text) - Additional notes
  - `created_by` (uuid) - User who processed return
  - `created_at` (timestamptz) - Creation timestamp

  ### 9. return_items
  - `id` (uuid, primary key) - Unique item identifier
  - `return_id` (uuid, foreign key) - Associated return
  - `item_id` (uuid, foreign key) - Associated inventory item
  - `location_id` (uuid, foreign key) - Stock location
  - `quantity` (decimal) - Quantity returned
  - `unit_price` (decimal) - Price per unit
  - `total_price` (decimal) - Line total

  ### 10. repairs
  - `id` (uuid, primary key) - Unique repair identifier
  - `company_id` (uuid, foreign key) - Associated company
  - `customer_id` (uuid, foreign key) - Associated customer
  - `item_id` (uuid, foreign key) - Item being repaired
  - `serial_number` (text) - Product serial number
  - `issue_description` (text) - Problem description
  - `repair_status` (text) - pending, in_progress, completed, returned
  - `repair_cost` (decimal) - Repair cost
  - `expected_completion` (date) - Expected completion date
  - `actual_completion` (date) - Actual completion date
  - `repair_notes` (text) - Work performed notes
  - `technician` (text) - Assigned technician
  - `created_by` (uuid) - User who created repair
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Table Modifications

  ### inventory_items - Add new fields
  - `category_id` (uuid) - Product category
  - `barcode` (text) - Barcode/SKU for scanning
  - `cost_price` (decimal) - Purchase cost
  - `selling_price` (decimal) - Selling price
  - `image_url` (text) - Product image URL

  ## Security
  All tables have RLS enabled with appropriate policies based on company access.

  ## Important Notes
  1. Invoice numbers are generated automatically with company prefix
  2. Payment status is calculated based on paid vs total amounts
  3. Stock movements are created automatically from invoice items
  4. Profit is calculated as (selling_price - cost_price) * quantity
  5. Returns adjust stock levels automatically
  6. Repair items are flagged and tracked separately
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  contact_person text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  address text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  address text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchase_invoices table
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT NOT NULL,
  invoice_number text NOT NULL,
  invoice_date date DEFAULT CURRENT_DATE,
  total_amount decimal(15, 2) DEFAULT 0,
  paid_amount decimal(15, 2) DEFAULT 0,
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, invoice_number)
);

-- Create purchase_invoice_items table
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES purchase_invoices(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES inventory_items(id) ON DELETE RESTRICT NOT NULL,
  location_id uuid REFERENCES locations(id) ON DELETE RESTRICT NOT NULL,
  quantity decimal(15, 2) NOT NULL CHECK (quantity > 0),
  unit_price decimal(15, 2) NOT NULL CHECK (unit_price >= 0),
  total_price decimal(15, 2) NOT NULL
);

-- Create sales_invoices table
CREATE TABLE IF NOT EXISTS sales_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT NOT NULL,
  invoice_number text NOT NULL,
  invoice_date date DEFAULT CURRENT_DATE,
  total_amount decimal(15, 2) DEFAULT 0,
  paid_amount decimal(15, 2) DEFAULT 0,
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, invoice_number)
);

-- Create sales_invoice_items table
CREATE TABLE IF NOT EXISTS sales_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES sales_invoices(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES inventory_items(id) ON DELETE RESTRICT NOT NULL,
  location_id uuid REFERENCES locations(id) ON DELETE RESTRICT NOT NULL,
  quantity decimal(15, 2) NOT NULL CHECK (quantity > 0),
  unit_price decimal(15, 2) NOT NULL CHECK (unit_price >= 0),
  cost_price decimal(15, 2) DEFAULT 0,
  total_price decimal(15, 2) NOT NULL
);

-- Create returns table
CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  return_type text NOT NULL CHECK (return_type IN ('sales_return', 'purchase_return')),
  invoice_id uuid,
  reference_number text NOT NULL,
  return_date date DEFAULT CURRENT_DATE,
  total_amount decimal(15, 2) DEFAULT 0,
  refund_amount decimal(15, 2) DEFAULT 0,
  refund_method text DEFAULT 'cash' CHECK (refund_method IN ('cash', 'credit', 'exchange')),
  reason text DEFAULT '',
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, reference_number)
);

-- Create return_items table
CREATE TABLE IF NOT EXISTS return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid REFERENCES returns(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES inventory_items(id) ON DELETE RESTRICT NOT NULL,
  location_id uuid REFERENCES locations(id) ON DELETE RESTRICT NOT NULL,
  quantity decimal(15, 2) NOT NULL CHECK (quantity > 0),
  unit_price decimal(15, 2) NOT NULL CHECK (unit_price >= 0),
  total_price decimal(15, 2) NOT NULL
);

-- Create repairs table
CREATE TABLE IF NOT EXISTS repairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT,
  item_id uuid REFERENCES inventory_items(id) ON DELETE RESTRICT NOT NULL,
  serial_number text DEFAULT '',
  issue_description text NOT NULL,
  repair_status text DEFAULT 'pending' CHECK (repair_status IN ('pending', 'in_progress', 'completed', 'returned')),
  repair_cost decimal(15, 2) DEFAULT 0,
  expected_completion date,
  actual_completion date,
  repair_notes text DEFAULT '',
  technician text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns to inventory_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'category_id') THEN
    ALTER TABLE inventory_items ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'barcode') THEN
    ALTER TABLE inventory_items ADD COLUMN barcode text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'cost_price') THEN
    ALTER TABLE inventory_items ADD COLUMN cost_price decimal(15, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'selling_price') THEN
    ALTER TABLE inventory_items ADD COLUMN selling_price decimal(15, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'image_url') THEN
    ALTER TABLE inventory_items ADD COLUMN image_url text DEFAULT '';
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Users can view categories in their companies"
  ON categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = categories.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = categories.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- RLS Policies for suppliers
CREATE POLICY "Users can view suppliers in their companies"
  ON suppliers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = suppliers.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage suppliers"
  ON suppliers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = suppliers.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- RLS Policies for customers
CREATE POLICY "Users can view customers in their companies"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = customers.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = customers.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- RLS Policies for purchase_invoices
CREATE POLICY "Users can view purchase invoices in their companies"
  ON purchase_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = purchase_invoices.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage purchase invoices"
  ON purchase_invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = purchase_invoices.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- RLS Policies for purchase_invoice_items
CREATE POLICY "Users can view purchase invoice items"
  ON purchase_invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_invoices pi
      JOIN user_company_access uca ON uca.company_id = pi.company_id
      WHERE pi.id = purchase_invoice_items.invoice_id
      AND uca.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage purchase invoice items"
  ON purchase_invoice_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_invoices pi
      JOIN user_company_access uca ON uca.company_id = pi.company_id
      WHERE pi.id = purchase_invoice_items.invoice_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager', 'staff')
    )
  );

-- RLS Policies for sales_invoices
CREATE POLICY "Users can view sales invoices in their companies"
  ON sales_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = sales_invoices.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage sales invoices"
  ON sales_invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = sales_invoices.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- RLS Policies for sales_invoice_items
CREATE POLICY "Users can view sales invoice items"
  ON sales_invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales_invoices si
      JOIN user_company_access uca ON uca.company_id = si.company_id
      WHERE si.id = sales_invoice_items.invoice_id
      AND uca.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage sales invoice items"
  ON sales_invoice_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales_invoices si
      JOIN user_company_access uca ON uca.company_id = si.company_id
      WHERE si.id = sales_invoice_items.invoice_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager', 'staff')
    )
  );

-- RLS Policies for returns
CREATE POLICY "Users can view returns in their companies"
  ON returns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = returns.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage returns"
  ON returns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = returns.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- RLS Policies for return_items
CREATE POLICY "Users can view return items"
  ON return_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM returns r
      JOIN user_company_access uca ON uca.company_id = r.company_id
      WHERE r.id = return_items.return_id
      AND uca.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage return items"
  ON return_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM returns r
      JOIN user_company_access uca ON uca.company_id = r.company_id
      WHERE r.id = return_items.return_id
      AND uca.user_id = auth.uid()
      AND uca.role IN ('admin', 'manager', 'staff')
    )
  );

-- RLS Policies for repairs
CREATE POLICY "Users can view repairs in their companies"
  ON repairs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = repairs.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage repairs"
  ON repairs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = repairs.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repairs_updated_at
  BEFORE UPDATE ON repairs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create stock movements from purchase invoice
CREATE OR REPLACE FUNCTION create_stock_movement_from_purchase()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stock_movements (
    item_id,
    location_id,
    movement_type,
    quantity,
    reference_number,
    notes,
    performed_by
  )
  SELECT
    NEW.item_id,
    NEW.location_id,
    'in',
    NEW.quantity,
    (SELECT invoice_number FROM purchase_invoices WHERE id = NEW.invoice_id),
    'Purchase Invoice',
    (SELECT created_by FROM purchase_invoices WHERE id = NEW.invoice_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create stock movements from sales invoice
CREATE OR REPLACE FUNCTION create_stock_movement_from_sales()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stock_movements (
    item_id,
    location_id,
    movement_type,
    quantity,
    reference_number,
    notes,
    performed_by
  )
  SELECT
    NEW.item_id,
    NEW.location_id,
    'out',
    -NEW.quantity,
    (SELECT invoice_number FROM sales_invoices WHERE id = NEW.invoice_id),
    'Sales Invoice',
    (SELECT created_by FROM sales_invoices WHERE id = NEW.invoice_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create stock movements from returns
CREATE OR REPLACE FUNCTION create_stock_movement_from_return()
RETURNS TRIGGER AS $$
DECLARE
  return_type_val text;
  movement_type_val text;
  quantity_val decimal;
BEGIN
  SELECT return_type INTO return_type_val FROM returns WHERE id = NEW.return_id;
  
  IF return_type_val = 'sales_return' THEN
    movement_type_val := 'in';
    quantity_val := NEW.quantity;
  ELSE
    movement_type_val := 'out';
    quantity_val := -NEW.quantity;
  END IF;
  
  INSERT INTO stock_movements (
    item_id,
    location_id,
    movement_type,
    quantity,
    reference_number,
    notes,
    performed_by
  )
  SELECT
    NEW.item_id,
    NEW.location_id,
    movement_type_val,
    quantity_val,
    (SELECT reference_number FROM returns WHERE id = NEW.return_id),
    'Return',
    (SELECT created_by FROM returns WHERE id = NEW.return_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic stock movements
CREATE TRIGGER create_movement_from_purchase_item
  AFTER INSERT ON purchase_invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION create_stock_movement_from_purchase();

CREATE TRIGGER create_movement_from_sales_item
  AFTER INSERT ON sales_invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION create_stock_movement_from_sales();

CREATE TRIGGER create_movement_from_return_item
  AFTER INSERT ON return_items
  FOR EACH ROW
  EXECUTE FUNCTION create_stock_movement_from_return();