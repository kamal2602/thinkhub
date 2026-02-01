# 🔧 Troubleshooting: First Run Registration

## Issue: "No Company Access" After Registration

### Symptom
After registering as the first user, you see:
```
No Company Access
You don't have access to any companies yet. Please contact your administrator to grant you access.
```

### Root Cause
The registration flow wasn't properly creating the company and linking it to the profile.

### ✅ Fixed in Latest Version
**Fix Applied:** 2025-11-08

The registration flow now:
1. Creates the user account
2. **Immediately signs in** to get authenticated session
3. Waits for profile trigger (1.5 seconds)
4. Creates the company
5. Updates profile with `company_id` and `is_super_admin`
6. Reloads page to refresh authentication context

### How to Test
1. Navigate to registration page
2. You should see "Company Name" field (confirms you're first user)
3. Fill in all fields including Company Name
4. Click "Create Company & Admin Account"
5. Wait for success message: "Company and super admin account created!"
6. Page automatically reloads
7. You should land on dashboard with access

### If Still Experiencing Issues

#### Issue 1: Already Registered Before Fix
**Problem:** You registered before the fix was applied

**Solution:**
1. Clear the database again (data was already cleared)
2. Register fresh with new account

#### Issue 2: Profile Not Created
**Check:**
```sql
SELECT id, email, company_id, is_super_admin, role FROM profiles;
```

**Expected:** One row with your email, company_id should NOT be null, is_super_admin = true

**If profile missing company_id:**
```sql
-- Manually fix (replace with your IDs)
UPDATE profiles
SET company_id = '<your-company-id>',
    is_super_admin = true,
    role = 'super_admin'
WHERE id = '<your-user-id>';
```

#### Issue 3: Company Not Created
**Check:**
```sql
SELECT id, name FROM companies;
```

**Expected:** One row with your company name

**If company missing:**
```sql
-- Create company manually
INSERT INTO companies (name) VALUES ('Your Company Name');

-- Then update profile (from Issue 2 solution)
```

#### Issue 4: RLS Policies Blocking
**Check:**
```sql
-- Should return true
SELECT EXISTS (SELECT 1 FROM profiles WHERE is_super_admin = true);
```

**If false:** RLS policy for first user setup should allow it

**Manual override (temporary, for testing):**
```sql
-- Disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Update profile
UPDATE profiles
SET company_id = '<company-id>',
    is_super_admin = true,
    role = 'super_admin'
WHERE id = '<user-id>';

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### Debug Checklist

Run these queries to diagnose:

```sql
-- 1. Check if you're authenticated
SELECT auth.uid();
-- Should return your user ID

-- 2. Check profile exists
SELECT * FROM profiles WHERE id = auth.uid();
-- Should return your profile

-- 3. Check company exists
SELECT * FROM companies;
-- Should have at least one company

-- 4. Check if profile has company_id
SELECT id, email, company_id, is_super_admin FROM profiles WHERE id = auth.uid();
-- company_id should NOT be null

-- 5. For super admins, check if companies are visible
SELECT * FROM companies;
-- Should see all companies (super admin bypass)
```

### Expected Database State After First Registration

```sql
-- profiles table
id: <uuid>
email: your@email.com
full_name: Your Name
company_id: <company-uuid>
is_super_admin: true
role: super_admin
created_at: <timestamp>

-- companies table
id: <uuid>
name: Your Company Name
created_at: <timestamp>
```

### Testing the Fix

#### Manual Test Steps
1. Open browser DevTools → Network tab
2. Register with company name
3. Watch for these requests:
   - `POST /auth/v1/signup` → Should succeed
   - `POST /auth/v1/token?grant_type=password` → Should succeed (sign in)
   - `POST /rest/v1/companies` → Should succeed (company created)
   - `PATCH /rest/v1/profiles` → Should succeed (profile updated)
4. Page should reload automatically
5. Dashboard should appear with company name in header

#### Console Checks
Open browser console, should NOT see:
- "Error creating company"
- "Error updating profile"
- "Error signing in after registration"

Should see (in order):
1. No errors during registration
2. Page reload
3. Company name appears in header

### Still Having Issues?

1. **Clear browser cache and cookies**
2. **Try incognito/private browsing**
3. **Check browser console for errors**
4. **Verify database connection** (check .env file)
5. **Confirm migrations ran** (check supabase dashboard)

### Contact Support

If none of the above helps, provide:
- Browser console logs
- Network tab HAR file
- Database query results from Debug Checklist
- Screenshot of error message

---

## Prevention

This issue has been fixed in the codebase. Future registrations will:
- ✅ Automatically create company
- ✅ Automatically set super admin
- ✅ Automatically link profile to company
- ✅ No manual intervention needed

---

**Last Updated:** 2025-11-08
**Status:** Fixed in latest version
