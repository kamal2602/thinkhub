/*
  # Create CMS Website Engine Tables

  This migration creates tables for the Website (CMS) Engine - a content management system
  for publishing public pages WITHOUT eCommerce functionality.

  ## Summary
  Creates a complete CMS system with pages, navigation menus, and content management.
  Extends existing website_settings table with CMS-specific fields.

  ## Tables Created
  1. **pages** - CMS pages with rich content
     - id, company_id, slug (unique per company)
     - title, content (jsonb for rich content blocks)
     - meta_description (SEO)
     - status (draft/published)
     - published_at, created_by
     - Full-text search on title and content

  2. **navigation_menus** - Menu containers (header, footer, etc.)
     - id, company_id, name (unique per company)
     - location (header/footer/sidebar)
     - is_active (toggle visibility)

  3. **navigation_items** - Menu links
     - id, menu_id, label
     - target_slug (internal pages)
     - external_url (external links)
     - parent_id (for nested menus)
     - sort_order (for ordering)

  ## Table Extensions
  - **website_settings** - Add CMS fields (custom_css, footer_text, header_html)

  ## Security (RLS)
  - **Admin Access:** Users with admin/manager role can manage all CMS content in their company
  - **Public Access:** Anonymous users can read published pages and active navigation menus
  - **Draft Protection:** Unpublished pages are hidden from public access

  ## Indexes
  - Optimized for slug lookups (company_id + slug)
  - Menu item ordering (menu_id + sort_order)
  - Published page queries (company_id + status)

  ## Important Notes
  - This is a CMS-only system (NO eCommerce, NO shopping carts, NO checkout)
  - Pages use JSONB content for flexibility (markdown, HTML, or structured blocks)
  - Navigation supports nested menus via parent_id
  - Public access is read-only for published content
  - Future-ready for Party integration (gated pages, customer accounts)
*/

-- =====================================================
-- 1. CREATE CMS TABLES
-- =====================================================

-- Create pages table
CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  content jsonb DEFAULT '[]'::jsonb,
  meta_description text,
  status text DEFAULT 'draft',
  published_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, slug),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'published'))
);

-- Create navigation_menus table
CREATE TABLE IF NOT EXISTS navigation_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  name text NOT NULL,
  location text DEFAULT 'header',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name),
  CONSTRAINT valid_location CHECK (location IN ('header', 'footer', 'sidebar'))
);

-- Create navigation_items table
CREATE TABLE IF NOT EXISTS navigation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid REFERENCES navigation_menus(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  target_slug text,
  external_url text,
  parent_id uuid REFERENCES navigation_items(id) ON DELETE CASCADE,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT has_target CHECK (target_slug IS NOT NULL OR external_url IS NOT NULL)
);

-- =====================================================
-- 2. EXTEND WEBSITE_SETTINGS FOR CMS
-- =====================================================

-- Add CMS-specific fields to website_settings (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'website_settings' AND column_name = 'custom_css'
  ) THEN
    ALTER TABLE website_settings ADD COLUMN custom_css text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'website_settings' AND column_name = 'footer_text'
  ) THEN
    ALTER TABLE website_settings ADD COLUMN footer_text text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'website_settings' AND column_name = 'header_html'
  ) THEN
    ALTER TABLE website_settings ADD COLUMN header_html text;
  END IF;
END $$;

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES - PAGES (Admin + Public)
-- =====================================================

-- Admin: View all pages in their company
CREATE POLICY "Users can view pages in their company"
  ON pages FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

-- Admin: Create pages in their company
CREATE POLICY "Admins can create pages"
  ON pages FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Admin: Update pages in their company
CREATE POLICY "Admins can update pages"
  ON pages FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Admin: Delete pages in their company
CREATE POLICY "Admins can delete pages"
  ON pages FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Public: View published pages only (anonymous access)
CREATE POLICY "Public can view published pages"
  ON pages FOR SELECT
  TO anon
  USING (status = 'published');

-- =====================================================
-- 5. RLS POLICIES - NAVIGATION_MENUS (Admin + Public)
-- =====================================================

-- Admin: View all menus in their company
CREATE POLICY "Users can view navigation menus in their company"
  ON navigation_menus FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

-- Admin: Create menus in their company
CREATE POLICY "Admins can create navigation menus"
  ON navigation_menus FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Admin: Update menus in their company
CREATE POLICY "Admins can update navigation menus"
  ON navigation_menus FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Admin: Delete menus in their company
CREATE POLICY "Admins can delete navigation menus"
  ON navigation_menus FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Public: View active menus (anonymous access)
CREATE POLICY "Public can view active navigation menus"
  ON navigation_menus FOR SELECT
  TO anon
  USING (is_active = true);

-- =====================================================
-- 6. RLS POLICIES - NAVIGATION_ITEMS (Admin + Public)
-- =====================================================

-- Admin: View all navigation items in their company's menus
CREATE POLICY "Users can view navigation items in their company"
  ON navigation_items FOR SELECT
  TO authenticated
  USING (
    menu_id IN (
      SELECT id FROM navigation_menus
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_id = auth.uid()
      )
    )
  );

-- Admin: Create navigation items
CREATE POLICY "Admins can create navigation items"
  ON navigation_items FOR INSERT
  TO authenticated
  WITH CHECK (
    menu_id IN (
      SELECT id FROM navigation_menus
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager')
      )
    )
  );

-- Admin: Update navigation items
CREATE POLICY "Admins can update navigation items"
  ON navigation_items FOR UPDATE
  TO authenticated
  USING (
    menu_id IN (
      SELECT id FROM navigation_menus
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager')
      )
    )
  )
  WITH CHECK (
    menu_id IN (
      SELECT id FROM navigation_menus
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager')
      )
    )
  );

-- Admin: Delete navigation items
CREATE POLICY "Admins can delete navigation items"
  ON navigation_items FOR DELETE
  TO authenticated
  USING (
    menu_id IN (
      SELECT id FROM navigation_menus
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager')
      )
    )
  );

-- Public: View active navigation items in active menus (anonymous access)
CREATE POLICY "Public can view active navigation items"
  ON navigation_items FOR SELECT
  TO anon
  USING (
    is_active = true
    AND menu_id IN (
      SELECT id FROM navigation_menus WHERE is_active = true
    )
  );

-- =====================================================
-- 7. PUBLIC ACCESS FOR WEBSITE_SETTINGS
-- =====================================================

-- Public: View website settings (for site branding)
CREATE POLICY "Public can view website settings"
  ON website_settings FOR SELECT
  TO anon
  USING (true);

-- =====================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Pages indexes
CREATE INDEX IF NOT EXISTS idx_pages_company_id ON pages(company_id);
CREATE INDEX IF NOT EXISTS idx_pages_company_slug ON pages(company_id, slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_published ON pages(company_id, status) WHERE status = 'published';

-- Navigation menus indexes
CREATE INDEX IF NOT EXISTS idx_navigation_menus_company_id ON navigation_menus(company_id);
CREATE INDEX IF NOT EXISTS idx_navigation_menus_location ON navigation_menus(company_id, location);

-- Navigation items indexes
CREATE INDEX IF NOT EXISTS idx_navigation_items_menu_id ON navigation_items(menu_id);
CREATE INDEX IF NOT EXISTS idx_navigation_items_parent_id ON navigation_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_navigation_items_sort_order ON navigation_items(menu_id, sort_order);

-- =====================================================
-- 9. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger for pages updated_at
CREATE OR REPLACE FUNCTION update_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pages_updated_at_trigger
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION update_pages_updated_at();

-- Trigger for navigation_menus updated_at
CREATE OR REPLACE FUNCTION update_navigation_menus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER navigation_menus_updated_at_trigger
  BEFORE UPDATE ON navigation_menus
  FOR EACH ROW
  EXECUTE FUNCTION update_navigation_menus_updated_at();

-- =====================================================
-- 10. FUTURE-PROOFING COMMENTS
-- =====================================================

COMMENT ON TABLE pages IS 'CMS pages for public website. TODO (Phase 6): Add require_login and allowed_party_types for gated content.';
COMMENT ON TABLE navigation_menus IS 'Navigation menu containers. Can be extended with visibility rules based on authentication status.';
COMMENT ON COLUMN pages.content IS 'JSONB content blocks - flexible format supports markdown, HTML, or structured block editor content.';
