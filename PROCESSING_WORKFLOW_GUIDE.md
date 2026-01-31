# Processing Workflow Guide

## Overview
The Processing workflow is designed for IT resellers and refurbishment operations to track devices from receiving through testing, refurbishment, quality control, and final grading until they're ready for sale.

---

## Workflow Stages

### 1. **Received** (Initial Stage)
- **When**: Assets arrive from Smart Receiving or manual entry
- **Default Stage**: All new assets start here automatically
- **Actions**:
  - Review incoming devices
  - Assign technician for initial processing
  - Mark priority items (urgent/high-value)
  - Add processing notes

### 2. **Testing** (Diagnostic Phase)
- **Purpose**: Identify functionality issues and test components
- **Activities**:
  - Power on/boot tests
  - Hardware diagnostics (CPU, RAM, storage, ports, battery, screen)
  - Software testing
  - Network connectivity tests
  - Document test results using checklists
- **Outcomes**: Pass/Fail/Partial results logged

### 3. **Refurbishing** (Repair Phase)
- **Purpose**: Fix issues, clean, and prepare device
- **Activities**:
  - Replace faulty components
  - Clean device (inside/outside)
  - Update/reinstall OS
  - Apply cosmetic fixes
  - Track refurbishment costs per item
- **Cost Tracking**: All parts and labor logged automatically

### 4. **QC/Grading** (Quality Control & Cosmetic Assessment)
- **Purpose**: Final inspection and grade assignment
- **Activities**:
  - Final functional verification
  - Cosmetic condition assessment (A, B, C, D grades)
  - Assign final selling price based on condition
  - Take photos (if applicable)
- **Outcome**: Device graded and priced

### 5. **Ready** (Complete)
- **Purpose**: Device is inventory-ready for sale
- **Activities**:
  - Move to active inventory
  - Available for sales quotes
  - Ready for customer orders
- **Final State**: Asset can now appear on sales invoices

---

## How Technicians/Engineers Use the System

### Viewing Your Work Queue
**Option 1: Kanban Board View (Recommended)**
1. Navigate to **Processing** tab
2. View the 5-column board showing all stages
3. See all assets in each stage with:
   - Device details (brand, model, serial)
   - Cosmetic grade badge
   - Days in current stage
   - Total cost (purchase + refurb)
   - Assigned technician name (if assigned)
   - Priority flag (red indicator)

**Option 2: Table/Grid View**
- Click view toggle buttons to switch between Kanban, Table, or Grid
- Table view shows detailed list with filters
- Grid view shows card layout

### Self-Assignment Workflow

#### Method 1: Claim from Board (Drag & Drop)
1. Go to **Processing** Kanban board
2. Find an unassigned device in "Received" or "Testing"
3. **Drag the card** to the stage you're working on (e.g., Testing → Refurbishing)
4. Click the card to open details
5. Assign yourself from the technician dropdown
6. Add processing notes if needed

#### Method 2: Assign from Asset Details
1. Click any asset card from the Kanban board
2. Asset details panel opens
3. At the top, you'll see:
   - **Current Stage** with dropdown to change
   - **Assigned Technician** dropdown
   - **Priority** toggle
   - **Processing Notes** field
4. Select your name from "Assign Technician" dropdown
5. Optionally add notes about the work plan
6. Start working!

### Working on an Asset

**Step-by-Step Process:**

1. **Claim the Asset**
   - Open the asset in "Received" stage
   - Assign yourself as the technician
   - Mark as priority if urgent
   - Move to "Testing" stage

2. **Testing Phase**
   - Move asset to "Testing" (drag or use dropdown)
   - Use the **Testing Checklist** section:
     - Select checklist template (if available)
     - Test each item: Pass/Fail/N/A
     - Results auto-save
   - Log any issues found

3. **Refurbishment Phase**
   - Move asset to "Refurbishing"
   - In the **Refurbishment Costs** section:
     - Click "Add Cost"
     - Select category (Parts, Labor, Cleaning, etc.)
     - Enter cost amount
     - Add description (e.g., "Replaced battery")
     - Costs automatically calculate total
   - Add processing notes for repairs done

4. **QC/Grading Phase**
   - Move asset to "QC/Grading"
   - Edit asset to set:
     - **Cosmetic Grade** (A/B/C/D with color coding)
     - **Functional Status** (Fully Functional, Minor Issues, etc.)
     - **Selling Price** based on condition
   - Review total cost = purchase price + all refurb costs
   - Review profit margin

5. **Mark as Ready**
   - Move asset to "Ready" stage
   - Asset now appears in main Inventory
   - Available for sales quotes and invoices

### Monitoring Your Work

**Dashboard Metrics (top of Processing page):**
- Count per stage (Received, Testing, Refurbishing, QC, Ready)
- Total value in pipeline
- Average days in processing
- **Stale items** (over 7 days in one stage - red flag)
- Priority count

**Personal Tracking:**
- Filter by your name to see only your assigned assets
- Use search to find specific serial numbers
- Watch for stale items you're assigned to

---

## Team Management View

### For Managers/Supervisors

**Monitoring Team Performance:**
1. View Kanban to see bottlenecks (too many in one stage)
2. Identify stale items (>7 days indicator)
3. Check unassigned assets (no technician name shown)
4. Review priority items (red flag)
5. Monitor average processing time

**Reassigning Work:**
1. Click any asset card
2. Change assigned technician in dropdown
3. Add note explaining reassignment
4. Asset shows new technician name on Kanban

**Tracking Costs:**
- Each asset shows total cost (purchase + refurb)
- Stage columns show total value
- Click asset to see detailed cost breakdown
- Use for pricing decisions

---

## Key Features

### Drag-and-Drop Stage Changes
- **Grab** any asset card on the Kanban board
- **Drag** to a different stage column
- **Drop** to update stage automatically
- Visual feedback: card becomes transparent, drop zone highlights blue
- Changes save immediately to database

### Automatic Time Tracking
- System tracks when asset enters each stage
- Displays "days in stage" on each card
- Flags stale items (>7 days) in red
- Use to identify bottlenecks

### Cost Tracking
- Purchase price imported from receiving
- Add refurbishment costs as you work
- Categories: Parts, Labor, Cleaning, Software, Other
- Auto-calculates total invested
- Compare to selling price for profit margin

### History & Audit Trail
- Every stage change logged with timestamp
- Shows who made changes and when
- View complete asset history in details panel
- Track time spent in each stage

### Priority Management
- Mark urgent/high-value items as priority
- Red "PRIORITY" flag on Kanban cards
- Priority count in dashboard
- Helps team focus on critical items

---

## Best Practices

### For Technicians:
1. **Self-assign** assets when you start work
2. **Update stage** as you progress (don't wait)
3. **Log all costs** immediately (parts, time)
4. **Use testing checklists** for consistency
5. **Add notes** when issues arise
6. **Don't let items go stale** (>7 days)

### For Managers:
1. **Review dashboard daily** for bottlenecks
2. **Monitor stale items** and reassign if needed
3. **Balance workload** across technicians
4. **Set pricing standards** per grade
5. **Review cost patterns** to optimize

### For Quality:
1. **Consistent grading** (use same criteria)
2. **Document test results** thoroughly
3. **Double-check** before marking Ready
4. **Price appropriately** for grade and cost

---

## Example Workflow

**Scenario: HP EliteBook arrives from supplier**

1. **Receiving Team** processes it via Smart Receiving
   - Asset auto-created in "Received" stage
   - Purchase price: $350
   - Serial number, model captured

2. **Technician John** claims it
   - Opens asset from Kanban
   - Assigns himself
   - Marks as priority (customer waiting)
   - Drags to "Testing"

3. **Testing** (Day 1)
   - Uses checklist: Screen ✓, Keyboard ✓, Battery ✗, Ports ✓
   - Notes: "Battery needs replacement"
   - Drags to "Refurbishing"

4. **Refurbishing** (Day 2-3)
   - Adds cost: "Battery" - $45
   - Adds cost: "Labor" - $25
   - Cleans device thoroughly
   - Notes: "Replaced battery, cleaned, OS reinstalled"
   - Drags to "QC/Grading"

5. **QC/Grading** (Day 4)
   - Sets Cosmetic Grade: "B" (good condition, minor wear)
   - Functional Status: "Fully Functional"
   - Total cost: $350 + $45 + $25 = $420
   - Sets Selling Price: $599
   - Profit Margin: $179 (30%)
   - Drags to "Ready"

6. **Ready for Sale**
   - Asset appears in Inventory
   - Sales team can add to quotes
   - Total time: 4 days (excellent!)

---

## Tips for Efficiency

- **Batch similar tasks**: Test multiple devices in one session
- **Keep costs updated**: Don't wait until end of day
- **Use drag-and-drop**: Faster than dropdowns
- **Monitor your stale items**: Don't let work sit idle
- **Communicate via notes**: Keep team informed
- **Set realistic prices**: Consider total cost + market value

---

## Reporting & Insights

From the Processing workflow, you can track:
- **Throughput**: How many devices processed per week
- **Average time**: Days from Received to Ready
- **Bottlenecks**: Which stage has most items
- **Cost analysis**: Average refurb cost per device type
- **Profit margins**: By grade and device type
- **Technician productivity**: Items processed per person

---

## Getting Help

- **Search**: Use search bar to find specific serial numbers
- **Filters**: Filter by status, grade, or technician
- **Views**: Switch between Kanban/Table/Grid as needed
- **Details**: Click any asset for complete information
- **History**: View asset history for audit trail

---

## Summary

The Processing workflow turns your refurbishment operation into a **visual, trackable, and efficient system**. Every device moves through standardized stages, costs are tracked automatically, and team members always know what needs attention. The drag-and-drop Kanban board makes it fast and intuitive, while the detailed tracking ensures quality and profitability.

**Start using it now:**
1. Go to Processing tab
2. Find an asset in "Received"
3. Assign yourself
4. Start testing!
