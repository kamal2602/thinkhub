/*
  # Auto-grant Creator Company Access
  
  When a user creates a new company, they should automatically get admin access to it.
  This ensures that:
  1. First-time users who create their company during setup can see and select it
  2. Super admins or users creating additional companies get immediate access
  
  Changes:
  - Creates a trigger function that automatically adds a user_company_access record
  - Grants the company creator 'admin' role on their new company
  - Runs after company insert to ensure the company exists first
*/

-- Create function to grant creator access to their company
CREATE OR REPLACE FUNCTION grant_creator_company_access()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Automatically grant admin access to the company creator
  INSERT INTO public.user_company_access (user_id, company_id, role)
  VALUES (NEW.created_by, NEW.id, 'admin')
  ON CONFLICT (user_id, company_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS auto_grant_creator_access ON companies;

-- Create trigger to run after company creation
CREATE TRIGGER auto_grant_creator_access
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION grant_creator_company_access();
