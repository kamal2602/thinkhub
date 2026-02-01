/*
  # Fix First User Auto Super Admin
  
  This migration ensures the first user to register automatically becomes a super admin.
  
  Changes:
  - Creates a trigger function that checks if this is the first user
  - If it's the first user (no other profiles exist), sets is_super_admin = true and role = 'admin'
  - This ensures the first user can create a company and access all features
*/

CREATE OR REPLACE FUNCTION make_first_user_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM profiles WHERE id != NEW.id) = 0 THEN
    NEW.is_super_admin := true;
    NEW.role := 'admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_first_user_is_super_admin ON profiles;

CREATE TRIGGER ensure_first_user_is_super_admin
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION make_first_user_super_admin();
