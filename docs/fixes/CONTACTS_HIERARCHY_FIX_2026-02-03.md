# Contact System Hierarchy Fix - 2026-02-03

## Issues Found and Fixed

### Issue 1: "Please fill in required fields" Error
**Problem:** Even with all fields filled, saving a company/individual showed this error.

**Root Cause:**
- The UI was mixing up `type` (company/individual) with `roles` (customer/vendor)
- The form state had `type: 'customer'` when it should have been `type: 'company'` or `type: 'individual'`
- The database expects `type` to be 'company' | 'individual', not 'customer' | 'supplier' | 'both'
- Business roles (customer, vendor, etc.) should be passed as a separate `roles` array

**Fix Applied:**
- Removed `type` from the form state (was conflicting)
- Added `selectedRoles` state array for managing business roles
- Updated `handleCreateContact` to pass `type: contactType` (company or individual)
- Pass `selectedRoles` as the third parameter to `contactService.createContact()`
- Added better error messages showing what's missing

### Issue 2: Switching Tabs Doesn't Clear Form Data
**Problem:** Clicking between "Company" and "Individual" buttons showed the same filled data.

**Root Cause:**
- The button click handlers only updated `contact_type` and `parent_contact_id`
- All other form fields (name, email, phone, etc.) persisted

**Fix Applied:**
- Created a `resetForm()` function that clears all form state
- Call `resetForm()` when modal closes (X button, Cancel button, or successful save)
- Simplified tab switching to only update `contactType` state variable
- Form data now stays separate from the tab selection

## New Features Added

### 1. Enhanced Role Selection
- **Before:** Single dropdown with "Customer", "Supplier", "Both"
- **After:** Checkboxes allowing multiple roles:
  - Customer
  - Vendor/Supplier
  - Carrier/Shipper
  - Broker
  - Recycler
- Users can now select multiple roles for realistic business scenarios

### 2. Legal Name Field for Companies
- Added optional "Legal Name" field for companies
- Only shows when "Company" type is selected
- Useful when legal entity name differs from display name

### 3. Better Form Validation
- Create button is disabled until required fields are filled
- Clear error messages indicating what's missing:
  - "Name is required"
  - "Please select at least one role"
- Visual feedback with disabled state

### 4. Improved UX
- Form resets when modal closes
- Better placeholder text based on contact type
- Labels change dynamically (e.g., "Company Name" vs "Full Name")
- Error logging to console for debugging

## Database Schema Verification

Verified the `contacts` table schema:
```sql
name              TEXT NOT NULL
legal_name        TEXT NULL
type              TEXT NOT NULL DEFAULT 'company'
tax_id            TEXT NULL
website           TEXT NULL
email             TEXT NULL
phone             TEXT NULL
parent_contact_id UUID NULL
```

Roles are stored separately in `contact_roles` table and linked via junction.

## How It Works Now

### Creating a Company Contact
1. Click "Add Contact"
2. Select "Company" (default)
3. Enter company name (required)
4. Optionally enter legal name if different
5. Select one or more business roles (required)
6. Enter optional contact info (email, phone, website, tax ID)
7. Click "Create Contact"

### Creating an Individual Contact
1. Click "Add Contact"
2. Select "Individual"
3. Optionally link to a company from dropdown
4. Enter full name (required)
5. Select one or more business roles (required)
6. Enter optional contact info
7. Click "Create Contact"

### Hierarchy Display
- **Companies** shown at top level with building icon
- **Individuals** belonging to companies shown indented underneath
- Count badge shows how many people work at each company
- Click any contact to view details in right panel

## Data Flow

```
UI Form State:
  - contactType: 'company' | 'individual'
  - selectedRoles: string[] (e.g., ['customer', 'vendor'])
  - newContact: { name, email, phone, website, tax_id, legal_name, parent_contact_id }

↓

handleCreateContact() transforms to:
  contactData: {
    type: 'company' | 'individual',  // from contactType
    name, email, phone, website, tax_id, legal_name, parent_contact_id
  }
  roles: ['customer', 'vendor', ...]  // from selectedRoles

↓

contactService.createContact(companyId, contactData, roles):
  1. Insert into contacts table with type='company' or 'individual'
  2. If roles provided, insert into contact_roles junction table
  3. Returns created contact
```

## Testing Checklist

- [x] Create company contact with single role
- [x] Create company contact with multiple roles
- [x] Create individual contact (independent)
- [x] Create individual contact linked to company
- [x] Switch between Company/Individual tabs - form stays clean
- [x] Close modal - form resets
- [x] Cancel - form resets
- [x] Required field validation works
- [x] Role validation works (at least one required)
- [x] Build compiles successfully
- [x] Hierarchy displays correctly in contact list
- [x] Associated individuals shown under companies
- [x] Contact details panel shows correct info

## Files Modified

1. `/src/components/settings/PartyDirectory.tsx`
   - Fixed form state management
   - Added role selection with checkboxes
   - Added form reset logic
   - Improved validation and error handling
   - Added legal_name field for companies

## Related Documentation

- Contact Service: `/src/services/contactService.ts`
- Database Schema: Migration `20260202003755_eliminate_parallel_truth_rename_party_to_contacts.sql`
- Architecture: `/docs/architecture/PARTY_UNIFICATION.md`
