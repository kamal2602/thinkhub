# 🚀 First-Time Setup Guide

## Welcome to StockPro!

This guide will help you set up your system after registering your first account.

---

## 📝 Step 1: Create Your Super Admin Account

### What You'll See
When you visit the app for the first time, the registration form will detect that you're the **first user**.

### Registration Form Fields
1. **Company Name** ⭐ (Only shown to first user)
   - Enter your company name
   - This will be your organization in the system

2. **Full Name**
   - Your name as it will appear in the system

3. **Email Address**
   - Your login email (must be unique)

4. **Password**
   - Minimum 6 characters

5. **Confirm Password**
   - Must match your password

### What Happens Behind the Scenes
When you click "Create Company & Admin Account":
1. ✅ User account created in auth system
2. ✅ Company record created with your company name
3. ✅ Profile created and linked to company
4. ✅ Super admin privileges granted
5. ✅ Auto-login and redirect to dashboard

---

## 🏗️ Step 2: Essential Master Data Setup

After logging in, you'll need to create the following master data. Navigate through **Settings** or the main menu to set these up.

### 1️⃣ Product Types (REQUIRED)
**Location:** Settings > Product Types

**Purpose:** Categories for your inventory (Laptops, Desktops, Servers, etc.)

**What to Create:**
```
- Laptops
- Desktops
- Macbooks
- Servers
- Tablets
- Monitors
- Networking Products
- Peripherals
```

**Important:**
- Each product type can have its own testing checklist
- Add **Aliases** for import matching (e.g., "notebook" → "Laptops")

---

### 2️⃣ Cosmetic Grades (REQUIRED)
**Location:** Settings > Grades & Conditions

**Purpose:** Define physical condition ratings

**What to Create:**
```
Grade A - Excellent (Minor/no signs of wear)
Grade B - Good (Light wear, fully functional)
Grade C - Fair (Moderate wear, fully functional)
Grade D - Poor (Heavy wear, may have damage)
```

**Options to Configure:**
- Display name
- Description
- Color for visual identification

---

### 3️⃣ Functional Statuses (REQUIRED)
**Location:** Settings > Grades & Conditions

**Purpose:** Testing/functionality status

**What to Create:**
```
Fully Functional - Working perfectly
Minor Issues - Works with small problems
Major Issues - Significant problems
Not Working - Does not power on / boot
Untested - Not tested yet
```

---

### 4️⃣ Processing Stages (REQUIRED)
**Location:** Settings > Processing Stages

**Purpose:** Workflow stages for asset processing

**What to Create:**
```
1. Received - Just received, not processed
2. Inspection - Being inspected
3. Testing - Under testing
4. Refurbishment - Being refurbished/repaired
5. Grading - Final grading
6. Ready for Sale - Completed and ready
7. Sold - Sold to customer
8. Scrapped - Harvested for parts
```

**Note:**
- Order matters! Drag to reorder
- Use for kanban workflow tracking

---

### 5️⃣ Warranty Types (REQUIRED)
**Location:** Settings > Warranty Types

**Purpose:** Warranty options for sales

**What to Create:**
```
No Warranty - Sold as-is
30 Days - 30-day return/exchange
90 Days - 90-day warranty
1 Year - One year warranty
```

---

### 6️⃣ Suppliers (RECOMMENDED)
**Location:** Suppliers

**Purpose:** Vendors you purchase from

**What to Add:**
- Supplier name
- Contact details
- Payment terms (optional)
- Notes

---

### 7️⃣ Customers (RECOMMENDED)
**Location:** Customers

**Purpose:** Clients you sell to

**What to Add:**
- Customer name
- Contact details
- Billing/shipping addresses
- Payment terms

---

### 8️⃣ Locations (OPTIONAL)
**Location:** Locations

**Purpose:** Physical locations for inventory tracking

**Examples:**
```
- Warehouse A
- Repair Bay
- Testing Area
- Shipping Dock
```

---

## 🎨 Step 3: Optional Advanced Setup

### Testing Checklists (Per Product Type)
**Location:** Settings > Product Types > [Select Type] > Testing Tab

**Purpose:** Standardized testing procedures

**Example for Laptops:**
```
☑ Power On Test
☑ Display Test
☑ Keyboard Test
☑ Trackpad Test
☑ WiFi Test
☑ Battery Health
☑ Ports Test
☑ Camera/Microphone
```

**Benefits:**
- Consistent testing across team
- Track pass/fail per test
- Auto-calculate refurb costs per test result

---

### Product Type Aliases
**Location:** Settings > Product Types > Aliases Tab

**Purpose:** Smart import matching

**Example:**
```
For "Laptops" product type:
- notebook
- laptop
- nb
- notebooks
```

**When importing:** CSV value "NoteBook" automatically matches to "Laptops"

---

### Import Field Mappings
**Location:** Settings > Import Field Mappings

**Purpose:** Auto-map CSV columns during import

**Already Pre-Configured!** ✅

The system comes with smart defaults for:
- Brand, Model, Serial Number
- Product Type, Quantity, Price
- CPU, RAM, Storage specs
- And more...

**You can customize:**
- Add/remove fields
- Modify keywords for auto-matching
- Reorder fields

---

### Payment Terms
**Location:** Settings > Payment Terms

**Purpose:** Standard payment terms for customers/suppliers

**Examples:**
```
- Net 30 (30 days after invoice)
- Net 60 (60 days after invoice)
- Due on Receipt (immediate payment)
- 50% Deposit, 50% on Delivery
```

---

### Model Aliases
**Location:** Settings > Model Aliases

**Purpose:** Normalize model names during import

**Example:**
```
Variations:       → Normalized To:
- MacBook Pro 13"  → MacBook Pro 13
- MBP 13          → MacBook Pro 13
- MacBook Pro 13  → MacBook Pro 13
```

---

## 🧪 Step 4: Test The System

### Quick Test Workflow

#### 1. Create a Purchase Order
**Navigation:** Purchases > Purchase Orders > New PO

**Test:**
- Select supplier
- Add a few line items
- Submit for receiving

---

#### 2. Receive Inventory
**Navigation:** Receiving > Smart Receiving

**Test:**
- Select your PO
- Mark items as received
- Enter serial numbers
- Assets auto-created!

---

#### 3. Process Assets
**Navigation:** Processing

**Test:**
- See your received assets
- Click an asset to open details
- Update processing stage
- Add testing results
- Add components (if harvesting parts)

---

#### 4. Create a Sale
**Navigation:** Sales > Create Invoice

**Test:**
- Select customer
- Add completed assets
- Generate invoice
- Mark as paid

---

## 📊 Understanding the Dashboard

After setup, your dashboard shows:

### Quick Stats
- 📦 Total Assets
- 💰 Total Value
- 🔄 Assets by Stage
- 📈 Recent Activity

### Workflow Views
- **Processing Kanban** - Drag assets through stages
- **Inventory** - All assets table view
- **Purchase Orders** - Manage purchasing
- **Sales** - Invoicing and sales tracking

---

## 🎯 Recommended First Actions

### Week 1: Foundation
1. ✅ Create all required master data (see Step 2)
2. ✅ Add 2-3 suppliers
3. ✅ Add 1-2 customers for testing
4. ✅ Set up product type aliases
5. ✅ Configure testing checklists

### Week 2: Testing
1. ✅ Create test purchase order
2. ✅ Receive and process test assets
3. ✅ Test the processing workflow
4. ✅ Create test sales invoice
5. ✅ Train your team on the workflow

### Week 3: Go Live
1. ✅ Import real purchase orders
2. ✅ Start receiving real inventory
3. ✅ Begin processing workflow
4. ✅ Start selling from processed inventory

---

## 🔧 Advanced Features (Optional)

### Import Intelligence (Coming Soon)
Smart CSV importing with:
- Automatic value lookup
- Component parsing (2x8GB → two 8GB RAM sticks)
- Brand/Model normalization
- Multi-supplier format support

### Lot Tracking
- Group purchases by lot
- Track lot profitability
- Close lots when complete
- Scrap tracking per lot

### Component Harvesting
- Extract components from broken assets
- Track harvested inventory
- Set market prices
- Sell individual components

### Advanced Reporting
- Profit by lot
- Processing efficiency
- Test result analytics
- Sales reports

---

## 🆘 Troubleshooting

### "No Product Types Found"
**Solution:** Go to Settings > Product Types and create at least one product type

### "Cannot Create PO - No Suppliers"
**Solution:** Go to Suppliers and add at least one supplier

### "Import Not Working"
**Solution:**
1. Check Import Field Mappings are configured
2. Ensure CSV has headers in first row
3. Check column names match keywords

### "Assets Not Showing in Sales"
**Solution:** Assets must be in "Ready for Sale" processing stage

---

## 📚 Additional Resources

### System Architecture
- **Companies** - Multi-tenant support (you can add more companies later)
- **Profiles** - Users linked to companies with roles
- **RLS (Row Level Security)** - Each company only sees their own data

### User Roles
- **Super Admin** - Full system access, manage companies
- **Admin** - Full company access, manage users
- **Manager** - View and edit data, limited settings
- **Technician** - Process assets, limited access

### Best Practices
1. **Product Types First** - Everything relies on product types
2. **Consistent Naming** - Use standardized model names
3. **Testing Checklists** - Create detailed checklists for quality
4. **Aliases** - Add variations for smooth importing
5. **Regular Backups** - Export data periodically

---

## 🎉 You're Ready!

You've completed the basic setup. Your system is now ready for:
- 📦 Receiving inventory
- 🔧 Processing and testing
- 💰 Selling and invoicing
- 📊 Tracking and reporting

### Next Steps:
1. Create your first real purchase order
2. Receive your first batch of inventory
3. Process assets through the workflow
4. Generate your first sales invoice

### Need Help?
- Check the in-app tooltips (hover over field labels)
- Review this guide for reference
- Contact support for assistance

---

**Welcome aboard! Let's start managing your inventory! 🚀**
