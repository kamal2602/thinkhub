/*
  # Populate Engine Display Fields for App Launcher

  1. Changes
    - Update existing engines with appropriate icons (lucide-react names)
    - Set sort_order for controlling display order in launcher
    - Add descriptions for tile display
    - Ensure Purchase (orders) engine exists

  2. Purpose
    - Enable Odoo-style app launcher with rich tile display
    - Provide sorting control for better UX
    - Add descriptions for user guidance
*/

-- Update existing engines with appropriate icons, sort order, and descriptions
UPDATE engines SET 
  icon = 'Package',
  sort_order = 10,
  description = 'Manage IT asset disposal, compliance, and data sanitization',
  title = 'ITAD'
WHERE key = 'itad';

UPDATE engines SET 
  icon = 'Settings',
  sort_order = 20,
  description = 'Asset processing, testing, and refurbishment workflows',
  title = 'Processing'
WHERE key = 'processing';

UPDATE engines SET 
  icon = 'PackageCheck',
  sort_order = 30,
  description = 'Receive incoming shipments and purchase orders',
  title = 'Receiving'
WHERE key = 'receiving';

UPDATE engines SET 
  icon = 'Boxes',
  sort_order = 40,
  description = 'Track inventory, assets, and stock levels',
  title = 'Inventory'
WHERE key = 'inventory';

UPDATE engines SET 
  icon = 'ShoppingBag',
  sort_order = 45,
  description = 'Purchase orders and supplier management',
  title = 'Purchases'
WHERE key = 'orders';

UPDATE engines SET 
  icon = 'ShoppingCart',
  sort_order = 50,
  description = 'Sell refurbished inventory and manage sales orders',
  title = 'Resale'
WHERE key = 'resale';

UPDATE engines SET 
  icon = 'Wallet',
  sort_order = 51,
  description = 'Purchase lot tracking and profitability analysis',
  title = 'Purchase Lots'
WHERE key = 'lots';

UPDATE engines SET 
  icon = 'Recycle',
  sort_order = 60,
  description = 'Waste management, recycling orders, and ESG compliance',
  title = 'Recycling'
WHERE key = 'recycling';

UPDATE engines SET 
  icon = 'Users',
  sort_order = 70,
  description = 'Unified contact directory for customers, suppliers, and partners',
  title = 'Contacts'
WHERE key = 'contacts';

UPDATE engines SET 
  icon = 'TrendingUp',
  sort_order = 80,
  description = 'Customer relationship management, leads, and opportunities',
  title = 'CRM'
WHERE key = 'crm';

UPDATE engines SET 
  icon = 'Globe',
  sort_order = 90,
  description = 'Website content management and public pages',
  title = 'Website'
WHERE key = 'website';

UPDATE engines SET 
  icon = 'DollarSign',
  sort_order = 100,
  description = 'Chart of accounts, journal entries, and financial reporting',
  title = 'Accounting'
WHERE key = 'accounting';

UPDATE engines SET 
  icon = 'Gavel',
  sort_order = 130,
  description = 'Online auctions for surplus equipment',
  title = 'Auctions'
WHERE key = 'auctions';
