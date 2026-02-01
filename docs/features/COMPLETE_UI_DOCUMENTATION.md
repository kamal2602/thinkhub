# Complete UI Documentation

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Navigation](#navigation)
4. [Dashboard](#dashboard)
5. [Processing Workflow](#processing-workflow)
6. [Inventory Management](#inventory-management)
7. [Purchase Management](#purchase-management)
8. [Sales Management](#sales-management)
9. [ITAD Compliance](#itad-compliance)
10. [Settings & Configuration](#settings--configuration)
11. [Keyboard Shortcuts](#keyboard-shortcuts)
12. [Best Practices](#best-practices)

---

## Overview

This is a comprehensive IT Asset Disposition (ITAD) and inventory management system designed for IT resellers and refurbishers. The application provides end-to-end workflow management from purchase order creation through processing, sales, and compliance tracking.

### Key Features

- **Multi-company Support** - Manage multiple companies with role-based access
- **Smart Import Intelligence** - Automated field mapping and data normalization
- **Kanban Processing** - Visual workflow management with drag-and-drop
- **Component Tracking** - Harvest and track individual components
- **Purchase Lot Profitability** - Real-time P&L by purchase lot
- **ITAD Compliance** - Data sanitization, certificates, environmental tracking
- **Unified Sales** - Sell complete assets or individual components
- **Real-time Collaboration** - Activity feeds and comments on assets

---

## Getting Started

### First Time Setup

1. **Register an Account**
   - Navigate to the login page
   - Click "Create Account"
   - Enter email and password
   - First user automatically becomes Super Admin

2. **Create Your Company**
   - After login, you'll be prompted to create a company
   - Enter company name and details
   - Company is automatically selected as your active context

3. **Run Initial Setup Wizard** (Recommended)
   - Navigate to Settings → Setup Wizard
   - Configure:
     - Product Types (Laptop, Desktop, Server, etc.)
     - Processing Stages (Receiving, Testing, Refurbishment, etc.)
     - Cosmetic Grades (Grade A, B, C, etc.)
     - Suppliers and Customers
     - Locations

4. **Configure Import Intelligence**
   - Settings → Import Intelligence
   - Set up field mapping rules for Excel imports
   - Configure entity normalization (brands, models)
   - Add product type aliases

### User Roles

- **Super Admin** - System-wide access, manages all companies
- **Admin** - Full access to company data and settings
- **Manager** - Manage inventory, processing, sales
- **Staff** - Create and edit assets, process inventory
- **Viewer** - Read-only access to company data

---

## Navigation

### Top Navigation (AppBar)

The main navigation bar provides access to all modules:

**Inventory Section:**
- Dashboard - Overview metrics and quick stats
- Processing - Kanban board for asset workflow
- Inventory - All assets view
- Saleable Inventory - Assets ready for sale
- Harvested Components - Component inventory
- Component Sales - Component sales tracking

**Purchasing:**
- Purchase Orders - Create and manage POs
- Receiving - Smart receiving workflow
- Purchase Lots - Lot tracking and profitability

**Sales:**
- Sales Invoices - Invoice management
- Sales Catalog - Unified sales interface
- Returns - Return management

**ITAD Compliance:**
- Data Sanitization - Wipe tracking
- Certificates - Generate compliance certificates
- Environmental - Environmental compliance tracking
- Projects - ITAD project management

**Master Data:**
- Product Types - Device type configuration
- Suppliers - Vendor management
- Customers - Customer database
- Locations - Warehouse/location tracking
- Stock Movements - Inventory movement history

**Admin:**
- Companies - Multi-company management
- Users - User management (Super Admin only)
- Company Users - Company-level user management

**Settings:**
- Grades & Conditions - Configure grading system
- Processing Stages - Workflow stage configuration
- Payment Terms - Payment term templates
- Return Reasons - Return reason catalog
- Warranty Types - Warranty type definitions
- Import Mappings - Excel field mapping rules
- Import Intelligence - AI-powered import rules
- Model Aliases - Model normalization rules
- Component Prices - Component market pricing
- Test Result Options - Testing checklist configuration

### Command Palette (⌘K / Ctrl+K)

Quick access to any page:

1. Press `⌘K` (Mac) or `Ctrl+K` (Windows)
2. Start typing to filter commands
3. Use arrow keys to navigate
4. Press Enter to go to selected page
5. Press Escape to close

**Available Commands:**
- Navigate to Dashboard
- Navigate to Processing
- Navigate to Purchase Orders
- Navigate to Receiving
- Navigate to Sales Invoices
- Navigate to Saleable Inventory
- And 20+ more...

### Breadcrumbs

Located below the header, breadcrumbs show your current location and allow quick navigation back to parent pages.

### Search Bar

Context-aware search across the current module. Searches by:
- Serial numbers
- Brands and models
- Asset tags
- Customer names
- Product types

---

## Dashboard

### Overview Widgets

The dashboard displays 8 key metrics in a grid layout:

1. **Total Assets** - Count of all assets in the system
2. **In Processing** - Assets currently being processed
3. **Ready for Sale** - Assets available for sale
4. **Total Inventory Value** - Sum of all asset values
5. **Avg Processing Time** - Average days in processing
6. **Priority Items** - High-priority assets requiring attention
7. **Stale Items** - Assets not updated in 7+ days
8. **Received Today** - Assets received in last 24 hours

**Widget Features:**
- Real-time updates
- Click to drill down into detailed views
- Color-coded status indicators
- Trend indicators (coming soon)

### Recent Activity

Displays recent system activity including:
- New assets created
- Status changes
- Sales completed
- User actions

---

## Processing Workflow

The Processing module is the heart of the system, providing a Kanban-style workflow for managing assets through their lifecycle.

### View Modes

Switch between three view modes using the View Switcher:

1. **Kanban View** - Visual board with drag-and-drop
2. **Grid View** - Dense grid of asset cards
3. **Table View** - Detailed spreadsheet-style table

### Kanban View

**Layout:**
- Columns represent processing stages
- Cards represent individual assets
- Drag cards between columns to update stage
- Counter shows asset count per stage

**Card Information:**
- Asset thumbnail/icon
- Serial number
- Brand and model
- Product type
- Cosmetic grade indicator
- Priority badge (if high priority)
- Age indicator (days in processing)
- Quick action buttons (hover to reveal)

**Card Actions (Hover):**
- 👁️ View Details
- ✏️ Edit Asset
- 🔄 Clone Asset
- ⭐ Toggle Priority

**Card Color Coding:**
- Blue border - Normal priority
- Red border - High priority
- Gray text - Stale (7+ days)

**Component Specs Display:**
- CPU icon and details
- RAM icon and capacity
- Storage icon and capacity

### Grid View

Displays assets in a compact grid format:
- 4 columns on large screens
- Responsive layout
- Same card design as Kanban
- Better for viewing many assets at once

### Table View

Spreadsheet-style view with columns:
- Serial Number
- Brand & Model
- Product Type
- Stage
- Grade
- Purchase Cost
- Target Price
- Assigned To
- Created Date
- Actions

**Table Features:**
- Sortable columns
- Inline editing (coming soon)
- Bulk selection
- Export to Excel (coming soon)

### Action Bar

Located at the top of the Processing view, provides bulk operations:

**Bulk Update Menu:**
1. Update Stage - Move multiple assets to a new stage
2. Update Grade - Set cosmetic grade for multiple assets
3. Assign Technician - Assign assets to a user
4. Set Priority - Mark assets as high/normal priority
5. Bulk Delete - Delete multiple assets
6. Bulk Clone - Duplicate assets

**How to Use:**
1. Select assets using checkboxes
2. Click "Bulk Update" button
3. Choose operation from dropdown
4. Fill in details in modal
5. Confirm action

### Filter Panel

Advanced filtering system with multiple criteria:

**Search Filters:**
- Text search (serial, brand, model)
- Serial number exact match
- Brand filter
- Model filter

**Category Filters:**
- Product Types (multi-select)
- Cosmetic Grades (multi-select)
- Processing Stages (multi-select)
- Assigned Technician
- Purchase Lot

**Status Filters:**
- Priority Level (All, High, Normal)
- Stale Items (Not updated in 7+ days)
- Date Range (Created between dates)

**Filter Display:**
- Active filter count badge
- Clear all filters button
- Collapsible panel
- Persists during session

### Scanner Bar

Quick barcode/serial number scanning:

1. Click in scanner input (or auto-focus on page load)
2. Scan barcode or type serial number
3. Press Enter
4. Asset opens in details panel if found
5. Shows error if not found

**Supported Formats:**
- Any text-based serial number
- UPC barcodes
- Custom asset tags

### Asset Details Panel

Slide-out panel showing complete asset information:

**Tabs:**
1. **Details** - All asset fields
2. **History** - Audit log of all changes
3. **Components** - Attached components
4. **Activity** - Comments and chatter

**Actions:**
- Edit Asset
- Clone Asset
- Delete Asset
- Change Stage
- Mark as Priority

**Activity Feed:**
- Add comments
- @ mention users (coming soon)
- View change history
- Delete own comments
- Real-time updates

### Asset Form

Create or edit assets using the comprehensive form:

**Tab 1: Basic Info**
- Serial Number (required)
- Asset Tag
- Brand (searchable dropdown)
- Model (searchable dropdown)
- Product Type (dropdown)
- Processing Stage
- Assigned To
- Priority Level

**Tab 2: Specifications**
- CPU (type, generation, speed)
- RAM (type, capacity, speed)
- Storage (type, capacity, interface)
- GPU (model, memory)
- Display (size, resolution)
- Battery Health
- Keyboard Layout
- Custom specifications (free text)

**Tab 3: Pricing**
- Purchase Cost
- Refurbishment Cost
- Target Sell Price
- Actual Sell Price
- Currency
- Auto-calculate margins

**Tab 4: Dates & Warranty**
- Received Date
- Manufactured Date
- Purchase Date
- Warranty Expiry
- Warranty Type
- Days in Warranty
- Warranty Provider

**Tab 5: Compliance**
- Data Wipe Status
- Wipe Method
- Certificate Number
- ITAD Project
- Environmental Certification
- Compliance Notes

**Tab 6: Notes**
- General Notes
- Processing Notes
- Internal Comments
- Private notes (not visible to customers)

**Form Features:**
- Auto-save draft (coming soon)
- Required field validation
- Dropdown search and filtering
- Smart defaults from settings
- Duplicate detection

### Bulk Import

Import multiple assets from Excel:

**Process:**
1. Click "Import from Excel" button
2. Select Excel file
3. Choose worksheet (if multiple)
4. Map columns to fields
5. Review smart suggestions
6. Confirm import
7. View success/error report

**Smart Features:**
- Automatic field detection
- Brand/model normalization
- Product type auto-assignment
- Duplicate detection
- Error validation
- Batch processing

**Supported Fields:**
- All asset fields
- Custom specifications
- Components
- Pricing
- Dates

---

## Inventory Management

### Saleable Inventory

View and manage assets ready for sale:

**Display:**
- Grid of asset cards
- Filterable by product type
- Searchable by serial/model
- Sortable by price, date

**Actions:**
- Quick add to sales order
- Update pricing
- Mark as sold
- Reserve for customer
- Generate listing (coming soon)

### Harvested Components

Track individual components removed from assets:

**Component Types:**
- CPU
- RAM
- Storage
- GPU
- Display
- Battery
- Other

**Information Displayed:**
- Component name/model
- Serial number (if available)
- Capacity/specifications
- Source asset
- Market value at harvest
- Current status (available, sold, installed)
- Location

**Actions:**
- Sell to customer
- Install into another asset
- Mark as scrapped
- Update market price
- Transfer location

**Status Management:**
- Available - In inventory
- Sold - Sold to customer
- Installed - Installed in asset
- Reserved - Reserved for order
- Scrapped - Disposed/recycled

### Component Sales

Track sales of individual components:

**Sales Information:**
- Component details
- Customer
- Sale price
- Cost basis
- Profit margin
- Sale date
- Invoice reference

**Reports:**
- Sales by component type
- Profit by component
- Best-selling components
- Component turnover rate

---

## Purchase Management

### Purchase Orders

Create and manage purchase orders:

**PO Creation:**
1. Click "Create PO" button
2. Enter PO details:
   - PO Number
   - Supplier
   - Order Date
   - Expected Delivery
   - Payment Terms
   - Currency
3. Add line items:
   - Product Type
   - Quantity
   - Unit Price
   - Description
4. Review totals
5. Save as draft or submit

**PO Status:**
- Draft - Being created
- Submitted - Sent to supplier
- Partially Received - Some items received
- Received - All items received
- Closed - PO completed

**PO Actions:**
- Edit (draft only)
- Submit to supplier
- Receive items
- Close PO
- View receiving history
- Print/export

**Smart PO Import:**
1. Upload supplier's PO file (Excel/CSV)
2. System detects format automatically
3. Maps fields using import intelligence
4. Creates PO with line items
5. Review and submit

**Features:**
- Auto-create purchase lot
- Multiple currencies
- Payment term templates
- Supplier history
- Duplicate detection

### Receiving Workflow

Smart receiving process with automatic asset creation:

**Process:**
1. Select Purchase Order
2. Review expected items
3. Scan or enter serial numbers
4. System auto-creates assets
5. Assigns to purchase lot
6. Updates PO status
7. Generates receiving log

**Features:**
- Barcode scanning support
- Auto-fill from PO data
- Bulk receiving
- Component detection
- Quality check notes
- Photo upload (coming soon)

**Expected vs Received:**
- Green indicator - All received
- Yellow indicator - Partial
- Red indicator - Missing items
- Overage detection

### Purchase Lots

Track profitability by purchase lot:

**Lot Information:**
- Lot number
- Purchase order reference
- Supplier
- Purchase date
- Total cost
- Item count
- Status

**Profitability Metrics:**
- Total cost (purchase + refurb)
- Revenue (assets sold)
- Component revenue
- Scrap value
- Total profit
- ROI percentage
- Profit margin

**Asset Breakdown:**
- Assets in lot
- Assets sold
- Assets in process
- Components harvested
- Scrap items

**Actions:**
- View all assets in lot
- Close lot
- Generate P&L report
- Export to Excel

---

## Sales Management

### Unified Sales Catalog

Sell complete assets and components from one interface:

**Catalog View:**
- Tabs: Complete Assets / Components
- Search and filters
- Product type filtering
- Price range filter
- Availability status

**Asset Cards:**
- Product image/icon
- Brand and model
- Specifications
- Cosmetic grade
- Price
- Add to order button

**Component Cards:**
- Component type and name
- Specifications
- Condition
- Price
- Quantity available
- Add to order button

**Shopping Cart:**
- Review selected items
- Adjust quantities
- Apply discounts
- See totals
- Select customer
- Create invoice

### Sales Invoices

Manage customer invoices:

**Invoice Creation:**
1. Select customer
2. Add items (from catalog or manual)
3. Set pricing
4. Apply discounts
5. Add payment terms
6. Save as draft or finalize

**Invoice Details:**
- Invoice number
- Customer information
- Line items
- Subtotal
- Discounts
- Tax
- Total
- Payment status
- Due date

**Invoice Actions:**
- Edit (draft only)
- Send to customer
- Record payment
- Void invoice
- Print/download PDF
- Email invoice

**Payment Tracking:**
- Unpaid
- Partially paid
- Paid
- Overdue
- Payment history

### Returns Management

Handle customer returns:

**Return Process:**
1. Select original invoice
2. Choose items to return
3. Select return reason
4. Issue credit or refund
5. Update inventory
6. Create return log

**Return Reasons:**
- Defective item
- Wrong item shipped
- Customer changed mind
- Not as described
- Damaged in shipping

**Actions:**
- Return to inventory
- Scrap item
- Send to refurbishment
- Replace item
- Issue credit memo

---

## ITAD Compliance

### Data Sanitization

Track data wipe operations for compliance:

**Wipe Methods:**
- DoD 5220.22-M
- NIST 800-88
- Secure Erase
- Physical Destruction
- Degaussing

**Recording Wipes:**
1. Select asset
2. Choose wipe method
3. Enter certificate number
4. Upload wipe report (optional)
5. Mark date and technician
6. Save record

**Compliance Reports:**
- Wipes by date range
- Wipes by method
- Outstanding wipes
- Certificate tracking
- Audit trail

### Certificates

Generate compliance certificates:

**Certificate Types:**
- Data Destruction Certificate
- Certificate of Recycling
- Environmental Compliance Certificate
- Chain of Custody

**Generation:**
1. Select assets
2. Choose certificate type
3. Add customer details
4. Review certificate
5. Generate PDF
6. Email to customer
7. Store in system

**Features:**
- Company branding
- Digital signatures
- Serial number listing
- Wipe details
- Compliance statements

### Environmental Compliance

Track environmental metrics:

**Metrics:**
- E-waste diverted from landfill (kg)
- CO2 emissions avoided
- Material recovery rate
- Recycling percentages
- Reuse vs. recycle ratio

**Reporting:**
- Monthly summaries
- Annual reports
- Customer reports
- Regulatory compliance
- Export to Excel

### ITAD Projects

Manage large ITAD projects:

**Project Information:**
- Project name
- Customer
- Start/end dates
- Asset count
- Project status
- Project manager

**Project Assets:**
- Link assets to project
- Track project progress
- Generate project reports
- Certificate generation
- Billing tracking

**Status Tracking:**
- Quoted
- In Progress
- Completed
- Invoiced
- Closed

---

## Settings & Configuration

### Product Types

Define device categories:

**Configuration:**
- Type name (Laptop, Desktop, etc.)
- Sort order
- Active/inactive status
- Default specifications
- Aliases (for import)

**Aliases:**
- Add variations (NB = Notebook = Laptop)
- Auto-detection during import
- Case-insensitive matching

### Processing Stages

Configure workflow stages:

**Stage Setup:**
- Stage name
- Sort order
- Color coding
- Default stage (receiving)
- Active/inactive

**Default Stages:**
- Receiving
- Testing
- Refurbishment
- Quality Check
- Ready for Sale
- Sold
- Scrapped

### Grades & Conditions

Define cosmetic grading system:

**Grade Configuration:**
- Grade name (Grade A, B, C)
- Color indicator
- Description
- Sort order
- Active/inactive

**Functional Status:**
- Fully Functional
- Minor Issues
- Major Issues
- Not Working
- For Parts

### Import Intelligence

AI-powered import configuration:

**Field Mapping Rules:**
- Map Excel columns to system fields
- Keywords for detection
- Priority/confidence scoring
- Active/inactive rules

**Entity Normalization:**
- Brand name variations
- Model name cleanup
- Product type detection
- Component parsing

**Smart Features:**
- Auto-learn from imports
- Suggest new rules
- Handle variations
- Case-insensitive

### Model Aliases

Normalize model names:

**Configuration:**
- Canonical model name
- Alias variations
- Auto-merge during import
- Brand association

**Example:**
- Canonical: ThinkPad T480
- Aliases: T480, 20L5, 20L6, T480-20L5

### Component Market Prices

Set component pricing for harvesting:

**Price Configuration:**
- Component type
- Component name
- Market value
- Last updated
- Active/inactive

**Used For:**
- Harvest value calculation
- Component sales pricing
- Purchase lot profitability
- Scrap value estimation

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open Command Palette |
| `Esc` | Close modal/panel |
| `/` | Focus search bar |
| `?` | Show keyboard shortcuts (coming soon) |

### Command Palette

| Shortcut | Action |
|----------|--------|
| `↑` | Navigate up |
| `↓` | Navigate down |
| `Enter` | Select command |
| `Esc` | Close palette |
| Type | Filter commands |

### Processing View

| Shortcut | Action |
|----------|--------|
| `N` | New asset |
| `F` | Open filters |
| `S` | Focus scanner |
| `G` | Switch to grid view |
| `K` | Switch to kanban view |
| `T` | Switch to table view |

### Asset Form

| Shortcut | Action |
|----------|--------|
| `⌘S` / `Ctrl+S` | Save asset |
| `Esc` | Cancel/close form |
| `Tab` | Next field |
| `Shift+Tab` | Previous field |

---

## Best Practices

### Asset Management

1. **Use Consistent Naming**
   - Establish brand/model conventions
   - Use model aliases for variations
   - Keep serial numbers exact

2. **Regular Updates**
   - Update asset status daily
   - Clear stale items weekly
   - Review priority items

3. **Accurate Specifications**
   - Verify component specs during testing
   - Use standard formats (8GB, 256GB SSD)
   - Document unique features

4. **Pricing Strategy**
   - Set target prices based on grades
   - Update based on market conditions
   - Track actual vs. target

### Import Best Practices

1. **Prepare Excel Files**
   - Use consistent headers
   - Remove empty rows
   - One product type per import
   - Include serial numbers

2. **Configure Import Intelligence**
   - Add supplier-specific mappings
   - Update after each import
   - Review suggestions

3. **Review Before Confirming**
   - Check field mappings
   - Verify product types
   - Look for duplicates

### Processing Workflow

1. **Stage Management**
   - Move assets promptly
   - Don't skip stages
   - Use notes for issues
   - Assign technicians

2. **Priority Management**
   - Mark urgent items
   - Review daily
   - Clear priorities when done

3. **Quality Control**
   - Use testing checklist
   - Document issues
   - Take photos of damage
   - Record test results

### Sales Process

1. **Inventory Accuracy**
   - Keep grades current
   - Update pricing regularly
   - Mark sold immediately
   - Remove unavailable items

2. **Customer Communication**
   - Send invoices promptly
   - Include specifications
   - Provide certificates
   - Track warranties

3. **Component Sales**
   - Harvest valuable components
   - Set market prices
   - Track source assets
   - Update status when sold

### Compliance

1. **Data Sanitization**
   - Wipe all devices
   - Use approved methods
   - Record certificates
   - Store reports

2. **Documentation**
   - Generate certificates
   - Keep audit trail
   - Track chain of custody
   - Archive records

3. **Environmental**
   - Track metrics
   - Report regularly
   - Follow regulations
   - Maximize reuse

### Performance Tips

1. **Use Filters**
   - Filter before searching
   - Save common filters
   - Clear when done

2. **Bulk Operations**
   - Group similar updates
   - Use bulk update for speed
   - Review before confirming

3. **Regular Maintenance**
   - Close old purchase lots
   - Archive sold assets
   - Clean up drafts
   - Review stale items

---

## Troubleshooting

### Common Issues

**Assets Not Appearing:**
- Check company selection
- Verify filters are cleared
- Check user permissions
- Refresh the page

**Import Failures:**
- Verify Excel format
- Check required fields
- Look for duplicate serials
- Review error messages

**Slow Performance:**
- Clear filters
- Reduce date range
- Close unused tabs
- Check internet connection

**Permission Errors:**
- Verify user role
- Check company access
- Contact administrator
- Log out and back in

### Getting Help

1. **In-App Help**
   - Hover tooltips
   - Field descriptions
   - Validation messages

2. **Documentation**
   - This guide
   - Setup guides
   - Video tutorials (coming soon)

3. **Support**
   - Contact administrator
   - Submit feedback
   - Report bugs
   - Request features

---

## Mobile Experience

### Mobile Layout

The application is responsive and works on tablets and phones:

**Optimizations:**
- Simplified navigation
- Touch-friendly buttons
- Swipe gestures
- Mobile scanner support

**Best Mobile Features:**
- Scanner bar for quick lookups
- Asset quick view
- Photo upload
- Barcode scanning

**Limitations:**
- Bulk operations limited
- Some reports desktop-only
- Complex imports better on desktop

---

## Future Features

### Coming Soon

- Advanced reporting dashboard
- Email notifications
- Mobile app (native)
- Customer portal
- API access
- Advanced analytics
- AI-powered pricing
- Multi-warehouse support
- Shipping integration
- Accounting integration

---

## Appendix

### Technical Requirements

**Browser Support:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Screen Resolution:**
- Minimum: 1280x720
- Recommended: 1920x1080
- Mobile: 375px width minimum

**Internet Connection:**
- Minimum: 5 Mbps
- Recommended: 25 Mbps
- Offline mode: Coming soon

### Data Limits

- Assets: Unlimited
- Users per company: Unlimited
- File uploads: 10MB per file
- Bulk import: 1000 rows recommended
- Excel sheets: Any size (parsed in chunks)

### Security

**Data Protection:**
- Encrypted at rest
- Encrypted in transit (SSL)
- Role-based access control
- Row-level security
- Audit logging

**Authentication:**
- Email/password
- Session management
- Automatic logout
- Password requirements

**Compliance:**
- GDPR compliant
- SOC 2 compliant
- ISO 27001 aligned
- Regular backups

---

## Glossary

**Asset** - A device being tracked in the system (laptop, desktop, etc.)

**Purchase Lot** - A group of assets from the same purchase order

**Processing Stage** - A step in the refurbishment workflow

**Cosmetic Grade** - Visual condition rating (Grade A, B, C)

**Harvested Component** - A part removed from an asset for separate sale

**Import Intelligence** - AI-powered system for mapping Excel imports

**Entity Normalization** - Standardizing brand/model names automatically

**RLS** - Row Level Security - Database security model

**ITAD** - IT Asset Disposition - Process of disposing of IT equipment

**COD** - Certificate of Destruction - Compliance document

**DoD 5220.22-M** - Department of Defense data wipe standard

**NIST 800-88** - National Institute of Standards data sanitization guideline

---

## Version History

**Version 2.0** (Current)
- Added command palette
- Enhanced kanban cards with specs
- Bulk operations in action bar
- Advanced filter panel
- Activity feed on assets
- Dashboard widgets
- Tabbed asset form
- Component sales tracking
- ITAD compliance features
- Import intelligence improvements

**Version 1.0**
- Initial release
- Basic asset management
- Purchase orders
- Sales invoices
- Processing workflow

---

*Last Updated: January 2026*
*Document Version: 2.0*
