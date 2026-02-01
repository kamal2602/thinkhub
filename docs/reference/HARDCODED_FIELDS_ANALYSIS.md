# 📘 Understanding AUTO_MAP_RULES (Intelligent Mapping)

**Question:** What was `AUTO_MAP_RULES` and is it still available?

**Answer:** YES! The intelligent mapping system is **still fully functional**, just moved from hardcoded to database-driven.

---

## 🔍 What AUTO_MAP_RULES Was

### **The Hardcoded Version (REMOVED):**

```typescript
const AUTO_MAP_RULES: Record<string, string[]> = {
  brand: ['brand', 'manufacturer', 'mfr', 'make', 'vendor'],
  model: ['model', 'part', 'part number', 'sku'],
  serial_number: ['serial', 'serial number', 's/n', 'sn'],
  // ... 19 fields with keywords
};
```

### **What It Did:**

**Example Scenario:**
1. You upload a CSV file with column header: **"Manufacturer"**
2. System checks `AUTO_MAP_RULES`
3. Finds "manufacturer" in the `brand` keywords array
4. Auto-selects **"Brand"** in the dropdown for that column
5. User doesn't have to manually map it!

**This is the "Smart Mapping" / "Intelligent Mapping" feature**

---

## ✅ Current System (Database-Driven)

### **Same Feature, Different Source:**

Now the keywords come from the **database** instead of hardcoded constants.

### **Database Table: `import_field_mappings`**

```sql
CREATE TABLE import_field_mappings (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES companies,
  field_name text,              -- e.g., 'brand'
  field_label text,             -- e.g., 'Brand'
  auto_map_keywords jsonb,      -- ← THE KEYWORDS!
  is_active boolean,
  sort_order integer
);
```

### **Example Database Record:**

```json
{
  "id": "abc-123",
  "company_id": "xyz-789",
  "field_name": "brand",
  "field_label": "Brand",
  "auto_map_keywords": [
    "brand",
    "manufacturer",
    "mfr",
    "make",
    "vendor",
    "oem"
  ],
  "is_active": true,
  "sort_order": 2
}
```

---

## 🔄 How It Works Now

### **Step-by-Step Process:**

#### **1. Load Keywords from Database:**

```typescript
// In SmartPOImport.tsx and SmartReceivingWorkflow.tsx
const loadCustomFields = async () => {
  const { data } = await supabase
    .from('import_field_mappings')
    .select('*')
    .eq('company_id', selectedCompany?.id);

  // Build the mapping rules from database
  const customRules: Record<string, string[]> = {};
  data.forEach(field => {
    if (field.auto_map_keywords && Array.isArray(field.auto_map_keywords)) {
      customRules[field.field_name] = field.auto_map_keywords;
    }
  });

  setAutoMapRules(customRules);
};
```

**Result:**
```typescript
autoMapRules = {
  brand: ['brand', 'manufacturer', 'mfr', 'make', 'vendor'],
  model: ['model', 'part', 'part number', 'sku'],
  // ... from database
}
```

#### **2. Use Keywords for Auto-Mapping:**

```typescript
// When CSV is uploaded, auto-suggest mappings
const autoSuggestMapping = (header: string) => {
  const headerLower = header.toLowerCase().trim();

  // Check each field's keywords
  for (const [fieldName, keywords] of Object.entries(autoMapRules)) {
    if (keywords.some(keyword => headerLower.includes(keyword))) {
      return fieldName; // ← Found a match!
    }
  }

  return ''; // No match, user must manually select
};
```

#### **3. Apply to Each Column:**

```typescript
// CSV header: "Manufacturer"
autoSuggestMapping("Manufacturer")
// → Returns: "brand" ✅

// CSV header: "S/N"
autoSuggestMapping("S/N")
// → Returns: "serial_number" ✅

// CSV header: "Unknown Column"
autoSuggestMapping("Unknown Column")
// → Returns: "" (user must select manually)
```

---

## 🎯 Where to Manage Keywords

### **Settings > Import Intelligence**

Go to: **Settings → Import Intelligence**

**UI Features:**
- Add new fields with keywords
- Edit existing keywords
- Set field types (direct vs specification)
- Set sort order
- Enable/disable fields
- Add "Quick Click" preset keyword combinations

**Example UI Workflow:**

1. **Add New Field:**
   ```
   Field Name: brand
   Field Label: Brand
   Field Type: Direct
   Keywords: brand, manufacturer, mfr, make, vendor
   ```

2. **Edit Keywords:**
   - Click edit on existing field
   - Add/remove keywords
   - Keywords are comma-separated
   - Saved to `auto_map_keywords` column

3. **Test Import:**
   - Upload CSV with "Manufacturer" column
   - System auto-selects "Brand"
   - Based on your keywords!

---

## 📊 Comparison: Before vs After

| Aspect | Hardcoded `AUTO_MAP_RULES` | Database `import_field_mappings` |
|--------|---------------------------|----------------------------------|
| **Location** | Constants in code | Database table |
| **Customizable?** | ❌ No (need code change) | ✅ Yes (via Settings UI) |
| **Per Company?** | ❌ Same for all | ✅ Each company different |
| **Add Keywords** | ❌ Edit code, rebuild | ✅ Add via UI instantly |
| **Add Fields** | ❌ Edit code, rebuild | ✅ Add via UI instantly |
| **Functionality** | ✅ Auto-mapping works | ✅ Auto-mapping works |

---

## 🚀 Benefits of Database-Driven

### **1. Fully Customizable Per Company**

**Company A (IT Reseller):**
```json
{
  "field_name": "brand",
  "auto_map_keywords": ["brand", "manufacturer", "mfr", "oem"]
}
```

**Company B (Refurbisher):**
```json
{
  "field_name": "brand",
  "auto_map_keywords": ["make", "vendor", "supplier"]
}
```

### **2. Add Custom Fields**

Want to track "Battery Health"?
- Add field via Settings UI
- Add keywords: `battery, batt, battery health, battery %`
- Upload CSV with "Battery" column
- Auto-maps instantly!

### **3. Learn from Imports**

Future enhancement possibilities:
- Track which columns users manually map
- Suggest new keywords based on patterns
- Auto-add keywords when user corrects mapping

### **4. Multi-Language Support**

**English Company:**
```json
["brand", "manufacturer", "mfr"]
```

**Arabic Company:**
```json
["العلامة التجارية", "brand", "manufacturer"]
```

---

## ✅ Summary

### **Q: Was AUTO_MAP_RULES removed?**
**A:** YES - the hardcoded constant was removed.

### **Q: Is intelligent mapping still available?**
**A:** YES - it works exactly the same way, just from database.

### **Q: Where are keywords stored now?**
**A:** `import_field_mappings.auto_map_keywords` column (JSONB array)

### **Q: How do I manage keywords?**
**A:** Settings > Import Intelligence (UI)

### **Q: Will my imports still auto-map?**
**A:** YES - as long as you have keywords configured in the database

### **Q: What if no keywords configured?**
**A:** User must manually select dropdown for each column (no auto-mapping)

---

## 🎯 Next Steps for Testing

### **1. Check Existing Keywords:**

```sql
SELECT
  field_name,
  field_label,
  auto_map_keywords
FROM import_field_mappings
WHERE company_id = 'your-company-id'
ORDER BY sort_order;
```

### **2. Add Missing Keywords:**

If any fields have empty `auto_map_keywords`, add them via:
- Settings > Import Intelligence
- Edit field
- Add comma-separated keywords

### **3. Test Import:**

- Upload CSV with various column names
- Verify intelligent mapping still works
- System should auto-select correct fields based on keywords

---

## 📝 Files That Use This System

1. **SmartPOImport.tsx** - Purchase Order imports
2. **SmartReceivingWorkflow.tsx** - Receiving workflow imports
3. **ImportFieldMappings.tsx** - Settings UI to manage keywords
4. **ImportIntelligence.tsx** - Advanced import intelligence UI

All four files now use database-driven keywords instead of hardcoded ones.

---

**END OF ANALYSIS**
