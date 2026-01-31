# Component Tracking System Guide

## Overview

The component tracking system allows you to manage individual components (RAM sticks, HDDs, SSDs) within assets. This is essential for refurbishment workflows where you may harvest components from one device for reuse in another.

## Key Features

### 1. Automatic Component Detection

When assets are created (via PO import, receiving, or manual entry), the system automatically parses RAM and Storage fields and creates individual component records.

**Supported Patterns:**
- `8GB X2` → Creates 2x 8GB RAM sticks
- `8GB * 2` → Creates 2x 8GB RAM sticks
- `2x8GB` → Creates 2x 8GB RAM sticks
- `16GB (2x8GB)` → Creates 2x 8GB RAM sticks
- `256GB/1TB` → Creates 1x 256GB drive + 1x 1TB drive
- `256GB + 1TB` → Creates 1x 256GB drive + 1x 1TB drive
- `512GB SSD` → Creates 1x 512GB SSD

### 2. Component Tracking in Asset Details

When viewing an asset's details, you'll see a **Components** section that shows:
- All installed components grouped by type (RAM, HDD, SSD, NVMe)
- Component capacity and quantity
- Current status (installed, harvested, transferred)
- Installation date
- Optional manufacturer and model information

### 3. Harvesting Workflow

**When to Harvest:**
Harvesting is optional and should be done when:
- Removing components during refurbishment
- Upgrading a device and keeping the old component
- Salvaging parts from a device being scrapped
- Creating spare parts inventory

**How to Harvest:**
1. Open the asset details page
2. Scroll to the Components section
3. Find the component you want to harvest
4. Click the "Harvest" button
5. Confirm the action

**What Happens:**
- Component status changes from "installed" to "harvested"
- Component is added to the Harvested Components Inventory
- Transaction is logged for audit trail
- Asset now shows reduced component count

### 4. Harvested Components Inventory

Access via sidebar: **Harvested Components**

This page shows all loose components available for reuse:

**Features:**
- Search and filter by component type
- View available, reserved, and defective quantities
- See total inventory value
- Track component locations
- Manage component specifications

**Use Cases:**
- Find available RAM sticks for upgrades
- Track spare drives for replacements
- Manage component inventory for repairs
- Reserve components for upcoming jobs

### 5. Backfilled Existing Assets

When the migration runs, it automatically:
- Scans all existing assets that don't have components
- Parses their RAM and Storage fields
- Creates component records retroactively
- Maintains data integrity

## Component Types

The system tracks these component types:
- **RAM**: Memory modules (DDR3, DDR4, DDR5)
- **HDD**: Hard disk drives
- **SSD**: Solid state drives (SATA)
- **NVMe**: NVMe/M.2 drives
- **Battery**: Batteries (for future use)
- **Screen**: Display panels (for future use)
- **Keyboard**: Keyboards (for future use)
- **Other**: Custom component types

## Component Statuses

- **installed**: Currently in the asset
- **harvested**: Removed and in loose inventory
- **transferred**: Moved to another asset
- **disposed**: No longer usable
- **defective**: Not working

## Database Schema

### Tables

1. **asset_components**
   - Links to assets
   - Tracks installed/harvested status
   - Records component details

2. **harvested_components_inventory**
   - Loose component inventory
   - Quantity tracking
   - Location management

3. **component_transactions**
   - Audit log of all movements
   - Harvest/install/transfer history

## Best Practices

### For Receiving/Intake
- Import files with patterns like "8GB X2" work automatically
- No need to change supplier formats
- System parses during import

### For Refurbishment
- Only harvest when actually removing components
- Add notes about condition if needed
- Use harvested inventory for finding spare parts

### For Reporting
- Component transactions provide full audit trail
- Track component lifecycle from install to harvest
- Monitor harvested inventory value

## Examples

### Example 1: Laptop with Dual RAM
**Import:** `RAM: 16GB (2x8GB)`
**Result:** 2 separate 8GB RAM component records
**Action:** Harvest 1x8GB for another laptop
**Outcome:** Asset shows 1x8GB installed, 1x8GB in harvested inventory

### Example 2: Multiple Drives
**Import:** `Storage: 256GB SSD / 1TB HDD`
**Result:** 1x 256GB SSD + 1x 1TB HDD records
**Action:** Harvest the HDD, keep the SSD
**Outcome:** Asset has only SSD, HDD available for reuse

### Example 3: Memory Upgrade
**Import:** `RAM: 8GB`
**Result:** 1x 8GB RAM component
**Action:** Harvest the 8GB, install harvested 16GB stick
**Outcome:** Asset upgraded, 8GB stick available for other use

## Reporting & Analytics

The system provides insights through:
- Total harvested component value
- Component counts by type
- Available vs reserved quantities
- Transaction history
- Component lifecycle tracking

## Security & Permissions

- Admin/Manager: Full access to harvest and manage
- Technician: Can view and harvest components
- Sales: View only access
- All actions are logged with user attribution

## API Integration

Component data is available via Supabase queries:
```sql
-- Get all components for an asset
SELECT * FROM asset_components WHERE asset_id = 'xxx';

-- Get harvested inventory
SELECT * FROM harvested_components_inventory WHERE company_id = 'xxx';

-- Get transaction history
SELECT * FROM component_transactions WHERE company_id = 'xxx';
```

## Future Enhancements

Potential additions:
- Component reservation system
- Automatic component matching for repairs
- Component pricing and value tracking
- Serial number tracking for components
- Warranty tracking at component level
- Batch component operations
