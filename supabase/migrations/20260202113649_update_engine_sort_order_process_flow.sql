/*
  # Update Engine Sort Order for Process Flow

  Updates the sort_order of all engines to follow a logical process flow:
  
  1. Procurement & Intake (1-10)
     - Contacts: Business directory
     - Purchases: Purchase orders
     - Receiving: Receiving workflow
  
  2. Operations (11-30)
     - Processing: Asset processing
     - Inventory: Stock management
     - Purchase Lots: Lot tracking
     - Repairs: Repair workflows
  
  3. Sales Channels (31-40)
     - Reseller: Wholesale sales
     - Auction: Auction marketplace
     - Website: E-commerce
  
  4. Financial (41-50)
     - Invoices: Billing
     - Payments: Payment tracking
     - Accounting: Financial records
  
  5. Specialized Workflows (51-60)
     - ITAD: Compliance workflows
     - Recycling: Recycling processes
     - CRM: Customer relationships
  
  6. Compliance & Reporting (61-70)
     - ESG Reporting: Environmental compliance
     - Reports: Business intelligence
  
  7. Administration (71-80)
     - Users & Roles: User management
     - Company: Company settings
     - Automation: Workflow automation
     - Apps: App management
     - Settings: System configuration
*/

UPDATE engines SET sort_order = 1 WHERE key = 'contacts';
UPDATE engines SET sort_order = 5 WHERE key = 'orders';
UPDATE engines SET sort_order = 10 WHERE key = 'receiving';

UPDATE engines SET sort_order = 15 WHERE key = 'processing';
UPDATE engines SET sort_order = 20 WHERE key = 'inventory';
UPDATE engines SET sort_order = 25 WHERE key = 'lots';
UPDATE engines SET sort_order = 30 WHERE key = 'repairs';

UPDATE engines SET sort_order = 31 WHERE key = 'reseller';
UPDATE engines SET sort_order = 32 WHERE key = 'auction';
UPDATE engines SET sort_order = 33 WHERE key = 'website';

UPDATE engines SET sort_order = 41 WHERE key = 'invoices';
UPDATE engines SET sort_order = 45 WHERE key = 'payments';
UPDATE engines SET sort_order = 50 WHERE key = 'accounting';

UPDATE engines SET sort_order = 51 WHERE key = 'itad';
UPDATE engines SET sort_order = 55 WHERE key = 'recycling';
UPDATE engines SET sort_order = 60 WHERE key = 'crm';

UPDATE engines SET sort_order = 65 WHERE key = 'esg';
UPDATE engines SET sort_order = 70 WHERE key = 'reports';

UPDATE engines SET sort_order = 71 WHERE key = 'users';
UPDATE engines SET sort_order = 75 WHERE key = 'company';
UPDATE engines SET sort_order = 76 WHERE key = 'automation';
UPDATE engines SET sort_order = 77 WHERE key = 'apps';
UPDATE engines SET sort_order = 80 WHERE key = 'settings';
