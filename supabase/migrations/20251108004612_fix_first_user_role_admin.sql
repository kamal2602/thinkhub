/*
  # Fix First User Auto Super Admin - Set Role to Admin

  1. Changes
    - Update the handle_new_user() trigger function to set role = 'admin' for the first user
    - First user gets: is_super_admin = true AND role = 'admin'
    - All subsequent users get: is_super_admin = false AND role = 'technician'
  
  2. Security
    - Only the very first user in the system will be auto-promoted to admin
    - All subsequent users will default to technician role
*/

-- Drop and recreate the function with first-user auto-promotion logic
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  is_first_user BOOLEAN;
BEGIN
  -- Count existing profiles
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Determine if this is the first user
  is_first_user := (user_count = 0);
  
  -- Insert new profile with appropriate role based on first user status
  INSERT INTO public.profiles (id, email, full_name, is_super_admin, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    is_first_user,  -- True if this is the first user, false otherwise
    CASE WHEN is_first_user THEN 'admin' ELSE 'technician' END
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
