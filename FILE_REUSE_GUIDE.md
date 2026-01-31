# Automatic File Reuse from PO to Smart Receiving

## Overview
When you create a Purchase Order using Smart PO Import, the system automatically saves the uploaded file data. When you later go to Smart Receiving for that PO, **you don't need to upload the file again** - it's automatically loaded!

## How It Works

### Step 1: Create PO with Smart Import
1. Go to **Purchases → Create PO**
2. Click "Bulk Import from Supplier File"
3. Upload supplier file (CSV/Excel)
4. Map columns to system fields
5. Review and save PO

**Behind the scenes:**
- ✅ File data is saved to the Purchase Order
- ✅ Column mappings are stored
- ✅ Original filename is preserved

### Step 2: Smart Receiving Auto-Loads File
1. Go to **Purchases → Smart Receiving**
2. Select the same Purchase Order
3. **File automatically loads!** ⚡ (no upload needed)
4. See green banner: "✓ Auto-loaded from PO: [filename]"
5. Mappings are pre-filled from PO creation
6. Review mappings and click "Start Receiving"

## Visual Workflow

```
Create PO                          Smart Receiving
---------                          ---------------
Upload File ────────────────────► File Auto-Loads!
    ↓                                    ↓
Map Columns ─────────────────────► Mappings Pre-Filled!
    ↓                                    ↓
Save PO                            Start Receiving
```

## Benefits

### 1. No Double Upload
- **Upload once** during PO creation
- File **automatically reused** in receiving
- Saves time and prevents errors

### 2. Consistency Guaranteed
- **Same file** used for PO and receiving
- **Same column mappings** applied
- Reduces mapping mistakes
- Eliminates version confusion

### 3. Streamlined Workflow
- Skip upload step entirely
- Jump straight to mapping review
- One less step to complete
- Faster receiving process

## When File Reuse Works

### ✅ Auto-loads when:
- PO was created using **Smart PO Import**
- File was uploaded during PO creation
- PO has saved file data

### ❌ Manual upload needed when:
- PO was created **manually** (line by line entry)
- PO was created before this feature was added
- You want to use a **different file** (e.g., updated packing list from supplier)

## Override Option

### Using a Different File

If the auto-loaded file is wrong, outdated, or you received an updated packing list:

1. You'll see the auto-loaded file with green banner
2. Click **"Back"** button
3. Upload your new/updated file
4. Map columns as needed
5. New file data replaces the auto-loaded version

## Example Scenario

**Monday: Create PO**
```
1. Supplier emails: "laptop_shipment_jan2025.xlsx"
2. Create PO using Smart Import
3. Upload laptop_shipment_jan2025.xlsx
4. Map: Serial → Serial Number, Brand → Brand, etc.
5. Save PO
```

**Wednesday: Shipment Arrives**
```
1. Open Smart Receiving
2. Select PO created Monday
3. ✓ System auto-loads: laptop_shipment_jan2025.xlsx
4. ✓ Mappings already set: Serial → Serial Number, etc.
5. Click "Start Receiving"
6. Begin scanning items
```

**Time Saved:** 2-3 minutes per receiving session!

## Technical Details

### What's Stored in the PO

When you import a file during PO creation, these are saved:

1. **File Name:** Original filename (e.g., "supplier_list.xlsx")
2. **File Data:** Parsed headers and rows
3. **Column Mappings:** Your field mappings (e.g., "Serial" → "serial_number")

### Database Storage

```sql
-- New columns in purchase_orders table:
source_file_name      TEXT      -- Original filename
source_file_data      JSONB     -- Parsed file content
source_file_mappings  JSONB     -- Column mapping configuration
```

### Data Size

- File data is stored efficiently in JSONB format
- Only headers and row data stored (not binary file)
- Typical storage: 5-50 KB per PO (very small)

## Compatibility

### Works With:
- ✅ CSV files (.csv)
- ✅ Excel files (.xlsx, .xls)
- ✅ All 18 configurable fields
- ✅ Custom field mappings
- ✅ Saved templates

### Limitations:
- Only stores files uploaded via Smart PO Import
- Doesn't work for manually entered PO lines
- File must be re-uploaded if PO created before this feature

## Tips & Best Practices

### 1. Always Use Smart Import
- When creating POs, use Smart PO Import whenever possible
- Even if you receive the file before creating the PO
- Enables automatic file reuse in receiving

### 2. Keep Supplier Files
- Save supplier files locally as backup
- Useful if you need to re-upload
- Good practice for auditing

### 3. Verify Auto-Loaded Data
- Always review the green banner confirmation
- Check that the filename matches your shipment
- Verify mappings are still correct

### 4. Update When Needed
- If supplier sends updated packing list, use "Back" button
- Upload the new version
- System will use the updated data

## FAQ

**Q: What if I created the PO manually?**
A: You'll need to upload the packing list manually in Smart Receiving. The auto-load only works for POs created with Smart Import.

**Q: Can I change the mappings?**
A: Yes! Even with auto-loaded files, you can adjust any column mapping before starting receiving.

**Q: What if the file is updated after PO creation?**
A: Click "Back" and upload the new version. The system will use your new file instead.

**Q: Does this work with the append columns feature?**
A: Yes! After auto-loading and starting receiving, you can still use "Add Missing Columns" to append additional data.

**Q: Is the file data secure?**
A: Yes, file data is stored in your company's database with Row Level Security. Only your company users can access it.

**Q: How much storage does this use?**
A: Very little - typically 5-50 KB per PO. It's just the text data from the spreadsheet, not the binary file.

## Related Features

- **Smart Column Appending:** Add missing columns during receiving (see SMART_COLUMN_APPENDING.md)
- **Smart PO Import:** Bulk import PO lines from supplier files
- **Import Field Mappings:** Customize which fields are available for mapping
