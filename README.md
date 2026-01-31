# Stock Pro - Smart Inventory & Billing Solution

A comprehensive stock management and billing platform with multi-company support and advanced access control.

## Features Implemented

### ✅ Core Features
- **Multi-Company Management** - Manage multiple businesses from one account
- **Multi-Location Support** - Track inventory across multiple warehouses/stores
- **Role-Based Access Control** - 4 levels: Admin, Manager, Staff, Viewer
- **Location-Level Permissions** - Control who can view/edit specific locations
- **Real-time Stock Tracking** - Automatic stock updates from all transactions
- **Authentication System** - Secure email/password authentication

### ✅ Inventory Management
- **Unlimited Products** - Add unlimited inventory items
- **Barcode Support** - Ready for barcode/SKU scanning
- **Categories** - Organize products (with subcategory support in database)
- **Cost & Selling Price** - Track both prices for profit calculation
- **Reorder Levels** - Low stock alerts and monitoring
- **Stock Levels** - Real-time quantity tracking per location
- **Stock Movements** - Complete audit trail of all stock changes

### ✅ Supplier & Customer Management
- **Suppliers** - Manage supplier database with contact info
- **Customers** - Customer database for sales tracking
- Contact information (phone, email, address)
- Quick add/edit/delete functionality

### ✅ User Management (Admin only)
- Invite users to companies
- Assign roles per company
- Set location-specific permissions (view/edit)
- Remove user access

### ✅ Dashboard & Reporting
- Key metrics overview
- Low stock alerts
- Recent activity tracking
- Company statistics

### 🚧 Features Ready (Database Schema Complete)
These features have full database support and are ready for UI implementation:

- **Purchase Invoices** - Record supplier purchases with line items
- **Sales Invoices** - Create sales orders with payment tracking
- **Returns Management** - Process sales and purchase returns
- **Repairs Tracking** - Service/repair management system
- **Advanced Reports** - Sales, purchases, profit/loss, stock valuation

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React

## Database Schema

### Core Tables
- `companies` - Business entities
- `locations` - Warehouse/store locations
- `user_company_access` - Company-level permissions
- `user_location_access` - Location-level permissions
- `profiles` - User profiles

### Inventory Tables
- `categories` - Product categories
- `inventory_items` - Product catalog
- `stock_levels` - Current stock by location
- `stock_movements` - Movement audit trail

### Business Tables
- `suppliers` - Supplier database
- `customers` - Customer database
- `purchase_invoices` + `purchase_invoice_items` - Purchase orders
- `sales_invoices` + `sales_invoice_items` - Sales orders
- `returns` + `return_items` - Return processing
- `repairs` - Repair/service tracking

## Security Features

### Row Level Security (RLS)
All tables have RLS policies enforcing:
- Company-based access control
- Role-based permissions
- Location-specific access rights

### Automatic Features
- Stock movements auto-created from invoices
- Stock levels auto-updated from movements
- Payment status auto-calculated
- Returns auto-adjust stock levels
- Timestamps auto-managed

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account

### Environment Variables
Create `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation
```bash
npm install
npm run dev
```

### Build for Production
```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── auth/           # Login & Registration
│   ├── companies/      # Company management
│   ├── customers/      # Customer management
│   ├── dashboard/      # Dashboard overview
│   ├── inventory/      # Inventory management
│   ├── layout/         # Header & Sidebar
│   ├── locations/      # Location management
│   ├── movements/      # Stock movements
│   ├── suppliers/      # Supplier management
│   └── users/          # User management
├── contexts/           # Auth & Company contexts
├── lib/               # Supabase client & types
└── pages/             # Auth & Dashboard pages
```

## User Roles

### Admin
- Full access to everything
- Manage users and permissions
- Delete records
- Manage companies

### Manager
- Manage inventory
- Manage locations
- Create invoices
- View reports

### Staff
- Edit inventory
- Create invoices
- Process returns
- Record movements

### Viewer
- View-only access
- Can see all data but cannot edit

## Access Control Flow

1. **Company Level** - User must have access to company
2. **Role Check** - User's role determines feature access
3. **Location Level** - For location-specific operations, check location permissions
4. **Database RLS** - All policies enforced at database level

## Next Steps for Full Implementation

To complete the Stock Pro feature set, implement these components:

### 1. Purchase Invoices Component (Priority 1)
- Select supplier
- Add line items (product, quantity, price)
- Calculate totals
- Track payment status
- Auto-generate invoice numbers

### 2. Sales Invoices Component (Priority 1)
- Select customer
- Add line items with cost price for profit tracking
- Payment tracking
- Print invoice feature

### 3. Returns Component (Priority 2)
- Select return type (sales/purchase)
- Reference original invoice (optional)
- Select items and quantities
- Choose refund method
- Auto-adjust stock

### 4. Repairs Component (Priority 2)
- Record item, customer, issue
- Status tracking workflow
- Repair cost and notes
- Completion date tracking

### 5. Reports Component (Priority 3)
- Sales reports (by date, product, customer)
- Purchase reports (by supplier, date)
- Profit/loss analysis
- Stock valuation reports
- Export to PDF

### 6. Barcode Scanning (Priority 4)
Options:
- Use `quagga2` for webcam scanning
- Support hardware barcode scanners (input field)
- Browser Barcode Detection API

### 7. Categories Management (Priority 4)
- Add/edit/delete categories
- Subcategory support
- Assign to products

## Database Query Examples

### Get Invoice with Full Details
```typescript
const { data } = await supabase
  .from('sales_invoices')
  .select(`
    *,
    customers(name, phone),
    sales_invoice_items(
      *,
      inventory_items(name, sku, cost_price),
      locations(name)
    )
  `)
  .eq('id', invoiceId)
  .single();
```

### Calculate Total Profit
```typescript
const { data } = await supabase
  .from('sales_invoice_items')
  .select('quantity, unit_price, cost_price');

const profit = data.reduce((sum, item) =>
  sum + (item.quantity * (item.unit_price - item.cost_price)), 0
);
```

### Stock Valuation
```typescript
const { data } = await supabase
  .from('stock_levels')
  .select(`
    quantity,
    inventory_items(cost_price)
  `);

const value = data.reduce((sum, item) =>
  sum + (item.quantity * item.inventory_items.cost_price), 0
);
```

## Support & Documentation

For detailed implementation guides, see:
- `STOCKPRO_IMPLEMENTATION.md` - Complete feature breakdown
- Database migration files in `supabase/migrations/`

## License

Proprietary - All rights reserved

## Contact

For inquiries about Stock Pro features or custom development:
📞 +971 50 1640519
