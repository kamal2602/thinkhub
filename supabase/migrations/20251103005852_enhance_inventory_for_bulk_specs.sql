/*
  # Enhance Inventory System for Bulk Laptop Processing

  ## Overview
  Adds flexible specification tracking to support bulk import of diverse products
  like 500+ laptops with varying brands, processors, RAM, storage, etc.

  ## Changes to inventory_items

  1. **Product Classification**
     - `product_type_id` - Links to product types (Laptops, Desktops, etc.)
     - `brand` - Manufacturer (Dell, HP, Lenovo, Apple, etc.)
     - `model` - Model name/number
     - `category` - Sub-category for filtering

  2. **Pricing Fields**
     - `cost_price` - Average purchase cost
     - `selling_price` - Standard selling price
     - `msrp` - Manufacturer suggested retail price
     - `min_price` - Minimum acceptable price
     - `max_price` - Maximum price

  3. **Specification Storage**
     - `specifications` (jsonb) - Flexible JSON for any specs
       Example: {
         "cpu": "Intel i5-11th Gen",
         "ram": "16GB DDR4",
         "storage": "512GB NVMe SSD",
         "screen": "14\" FHD",
         "graphics": "Intel Iris Xe",
         "os": "Windows 11 Pro"
       }

  4. **Stock Management**
     - `total_quantity` - Total units (calculated from assets)
     - `available_quantity` - Available for sale
     - `reserved_quantity` - Reserved/pending
     - `sold_quantity` - Already sold

  5. **Status Flags**
     - `is_active` - Currently selling?
     - `is_discontinued` - No longer available?

  ## New Tables

  1. **bulk_import_logs**
     - Track bulk import operations
     - Store validation errors
     - Link to created items/assets

  2. **specification_templates**
     - Pre-defined spec fields per product type
     - Help standardize data entry
     - Support auto-complete

  ## Security
  - RLS enabled on all new tables
  - Company-based access control maintained
*/

-- Add new columns to inventory_items
ALTER TABLE inventory_items 
  ADD COLUMN IF NOT EXISTS product_type_id uuid REFERENCES product_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS cost_price decimal(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price decimal(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS msrp decimal(15,2),
  ADD COLUMN IF NOT EXISTS min_price decimal(15,2),
  ADD COLUMN IF NOT EXISTS max_price decimal(15,2),
  ADD COLUMN IF NOT EXISTS specifications jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS total_quantity int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_quantity int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserved_quantity int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_quantity int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_discontinued boolean DEFAULT false;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_brand ON inventory_items(company_id, brand);
CREATE INDEX IF NOT EXISTS idx_inventory_items_model ON inventory_items(company_id, model);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_type ON inventory_items(product_type_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_specifications ON inventory_items USING gin(specifications);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(company_id, is_active) WHERE is_active = true;

-- Bulk Import Logs
CREATE TABLE IF NOT EXISTS bulk_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  import_type text NOT NULL CHECK (import_type IN ('assets', 'inventory_items', 'mixed')),
  file_name text,
  total_rows int DEFAULT 0,
  successful_rows int DEFAULT 0,
  failed_rows int DEFAULT 0,
  errors jsonb DEFAULT '[]',
  created_items jsonb DEFAULT '[]',
  status text CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bulk_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view import logs in their companies"
  ON bulk_import_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = bulk_import_logs.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can create import logs"
  ON bulk_import_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = bulk_import_logs.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Specification Templates (help standardize spec entry)
CREATE TABLE IF NOT EXISTS specification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  product_type_id uuid REFERENCES product_types(id) ON DELETE CASCADE NOT NULL,
  template_name text NOT NULL,
  spec_fields jsonb NOT NULL DEFAULT '[]',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, product_type_id, template_name)
);

ALTER TABLE specification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view spec templates in their companies"
  ON specification_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = specification_templates.company_id
      AND user_company_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff and above can manage spec templates"
  ON specification_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = specification_templates.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Insert default specification templates for Laptops
INSERT INTO specification_templates (company_id, product_type_id, template_name, spec_fields, is_default)
SELECT 
  pt.company_id,
  pt.id,
  'Standard Laptop Specs',
  jsonb_build_array(
    jsonb_build_object('key', 'cpu', 'label', 'Processor', 'type', 'text', 'required', true),
    jsonb_build_object('key', 'ram', 'label', 'RAM', 'type', 'text', 'required', true),
    jsonb_build_object('key', 'storage', 'label', 'Storage', 'type', 'text', 'required', true),
    jsonb_build_object('key', 'screen', 'label', 'Screen Size', 'type', 'text', 'required', false),
    jsonb_build_object('key', 'graphics', 'label', 'Graphics', 'type', 'text', 'required', false),
    jsonb_build_object('key', 'os', 'label', 'Operating System', 'type', 'text', 'required', false),
    jsonb_build_object('key', 'battery', 'label', 'Battery Health', 'type', 'text', 'required', false),
    jsonb_build_object('key', 'ports', 'label', 'Ports', 'type', 'text', 'required', false)
  ),
  true
FROM product_types pt
WHERE LOWER(pt.name) LIKE '%laptop%'
ON CONFLICT (company_id, product_type_id, template_name) DO NOTHING;

-- Function to auto-calculate inventory quantities from assets
CREATE OR REPLACE FUNCTION update_inventory_quantities()
RETURNS TRIGGER AS $$
BEGIN
  -- Update inventory item quantities based on linked assets
  UPDATE inventory_items
  SET 
    total_quantity = (
      SELECT COUNT(*) 
      FROM assets 
      WHERE assets.inventory_item_id = NEW.inventory_item_id
    ),
    available_quantity = (
      SELECT COUNT(*) 
      FROM assets 
      WHERE assets.inventory_item_id = NEW.inventory_item_id
      AND assets.status IN ('In Stock', 'Listed')
    ),
    reserved_quantity = (
      SELECT COUNT(*) 
      FROM assets 
      WHERE assets.inventory_item_id = NEW.inventory_item_id
      AND assets.status = 'Reserved'
    ),
    sold_quantity = (
      SELECT COUNT(*) 
      FROM assets 
      WHERE assets.inventory_item_id = NEW.inventory_item_id
      AND assets.status = 'Sold'
    ),
    updated_at = now()
  WHERE id = NEW.inventory_item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update quantities when assets change
DROP TRIGGER IF EXISTS update_inventory_qty_on_asset_change ON assets;
CREATE TRIGGER update_inventory_qty_on_asset_change
  AFTER INSERT OR UPDATE OF status, inventory_item_id ON assets
  FOR EACH ROW
  WHEN (NEW.inventory_item_id IS NOT NULL)
  EXECUTE FUNCTION update_inventory_quantities();

-- Create indexes for bulk import logs
CREATE INDEX IF NOT EXISTS idx_bulk_import_logs_company ON bulk_import_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_import_logs_status ON bulk_import_logs(company_id, status);

-- Create index for specification templates
CREATE INDEX IF NOT EXISTS idx_spec_templates_product_type ON specification_templates(product_type_id);
