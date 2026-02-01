# No Company Selected Issue - Analysis & Fix

**Date:** 2026-02-01
**Issue:** User sees "No company selected" after login and cannot create a company
**Status:** ✅ FIXED

---

## Problem Analysis

### User State
- **Email:** kamal@thinkrecycling.co
- **Account Status:** is_super_admin = true, role = 'admin'
- **Companies:** 0
- **Company Access:** 0

### The Issue

The authentication flow was working correctly, but the app had a critical gap in the company setup flow:

```
User Login Success
    ↓
CompanyProvider.fetchCompanies()
    ↓
Query returns 0 companies
    ↓
selectedCompany = null
    ↓
ModularAppShell renders
    ↓
❌ Shows broken UI with "No company selected"
```

### Root Cause

**ModularAppShell.tsx** only checked for onboarding status when a company was already selected:

```typescript
// OLD CODE - Only checks onboarding if company exists
const checkOnboarding = async () => {
  if (!selectedCompany) return; // ❌ Returns early if no company

  // Onboarding check code...
};
```

This meant:
1. Users with NO companies would see the main UI
2. The UI would show "No company selected" everywhere
3. There was no way to create a new company
4. The InitialSetup component existed but was never shown

---

## The Solution

### Changes Made

**1. Modified ModularAppShell.tsx**

Added logic to detect when user has zero companies and show the InitialSetup screen:

```typescript
// NEW CODE - Check for zero companies
if (loading) {
  return <LoadingScreen />;
}

// Show initial setup if user has no companies
if (companies.length === 0) {
  return <InitialSetup onComplete={handleOnboardingComplete} />;
}

// Continue with normal onboarding check...
```

**2. Enhanced InitialSetup.tsx**

Added proper trigger wait to ensure user_company_access is created:

```typescript
// Create company
const { data: company, error: companyError } = await supabase
  .from('companies')
  .insert([{
    name: companyName.trim(),
    created_by: user.id  // ✅ Triggers auto-grant
  }])
  .select()
  .single();

// Wait for auto-grant trigger to fire
await new Promise(resolve => setTimeout(resolve, 500));
```

**3. Updated LoginForm.tsx**

Added toggle between Sign In and Create Account modes with better error handling:

```typescript
// Better error messaging for existing accounts
if (signUpError.message.includes('already registered')) {
  setError('This email is already registered. Please use the "Sign in" option below.');
}

// Toggle button to switch modes
<button onClick={() => setIsFirstTimeSetup(false)}>
  Already have an account? Sign in
</button>
```

---

## Flow After Fix

### New User Flow (First Time Setup)

```
1. Visit App
   ↓
2. See "First Time Setup" form
   ↓
3. Enter: Company Name, Full Name, Email, Password
   ↓
4. Click "Create Super Admin Account"
   ↓
5. System creates:
   - auth.users record
   - profiles record (with is_super_admin=true)
   - companies record
   - user_company_access record (via trigger)
   ↓
6. Auto-login and redirect
   ↓
7. See "Welcome to Your ERP" setup wizard
   ↓
8. Select modules to enable
   ↓
9. Dashboard ready!
```

### Existing User Flow (No Company)

```
1. Sign In
   ↓
2. CompanyProvider checks companies
   ↓
3. Finds 0 companies
   ↓
4. ModularAppShell shows InitialSetup
   ↓
5. User enters Company Name
   ↓
6. Click "Create Company & Get Started"
   ↓
7. System creates:
   - companies record
   - user_company_access record (via trigger)
   - All enabled modules
   ↓
8. Redirects to module selection wizard
   ↓
9. Dashboard ready!
```

---

## Database Trigger

The system uses a database trigger to automatically grant company access:

**Migration:** `20260201231559_auto_grant_creator_company_access.sql`

```sql
CREATE OR REPLACE FUNCTION grant_creator_company_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_company_access (user_id, company_id, role)
  VALUES (NEW.created_by, NEW.id, 'admin')
  ON CONFLICT (user_id, company_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_grant_creator_access
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION grant_creator_company_access();
```

This ensures:
- ✅ Company creators automatically get admin access
- ✅ No orphaned companies
- ✅ Immediate access after creation
- ✅ No race conditions (ON CONFLICT)

---

## Testing Steps

### For New Users

1. Open the app in an incognito window
2. You should see "First Time Setup"
3. Fill in all fields and create account
4. You should be taken to the module selection wizard
5. Complete onboarding
6. You should see the dashboard

### For Existing Users (No Company)

1. Sign in with existing credentials
2. You should see "Welcome to Your ERP" setup screen
3. Enter a company name
4. Click "Create Company & Get Started"
5. Wait for modules to enable
6. You should see the module selection wizard
7. Complete setup
8. Dashboard should load

### For Existing Users (With Company)

1. Sign in
2. If onboarding incomplete: see module wizard
3. If onboarding complete: see dashboard
4. All features should work normally

---

## Key Files Modified

1. **src/components/layout/ModularAppShell.tsx**
   - Added check for zero companies
   - Shows InitialSetup when needed
   - Added loading state

2. **src/components/onboarding/InitialSetup.tsx**
   - Waits for auto-grant trigger
   - Better error handling
   - Proper module enablement

3. **src/components/auth/LoginForm.tsx**
   - Toggle between sign in/sign up
   - Better error messages
   - Clear user guidance

---

## What This Fixes

✅ Users with no companies now see setup wizard
✅ Cannot get stuck on "No company selected" screen
✅ Clear path to create first company
✅ Sign out button always available
✅ Toggle between login and signup modes
✅ Better error messages
✅ Proper trigger integration
✅ All existing flows still work

---

## Next Steps

1. ✅ Refresh your browser
2. ✅ Sign in with your existing account
3. ✅ You'll see the "Welcome to Your ERP" screen
4. ✅ Create your company
5. ✅ Select your modules
6. ✅ Start using the system!

---

## Additional Notes

- The InitialSetup component has a Sign Out button in the top-right
- Super admins can create multiple companies later from Settings
- The auto-grant trigger ensures no manual access setup needed
- Module selection can be changed later in Settings
- First user is automatically super admin
- Company creator always gets admin role on their company
