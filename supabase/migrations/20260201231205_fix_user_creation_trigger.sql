/*
  # Fix User Creation Trigger
  
  The handle_new_user() function was failing because:
  1. It wasn't properly bypassing RLS on the profiles table
  2. The function wasn't setting the role field correctly for the first user
  
  This migration:
  - Recreates the handle_new_user() function with proper RLS bypass
  - Ensures the first user gets is_super_admin = true and role = 'admin'
  - Subsequent users get is_super_admin = false and role = 'technician' (default)
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Create the function with proper RLS bypass
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  new_is_super_admin BOOLEAN;
  new_role TEXT;
BEGIN
  -- Count existing profiles (within the function's security context)
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Determine values for first user
  IF user_count = 0 THEN
    new_is_super_admin := TRUE;
    new_role := 'admin';
  ELSE
    new_is_super_admin := FALSE;
    new_role := 'technician';
  END IF;
  
  -- Insert new profile with RLS bypassed (SECURITY DEFINER context)
  INSERT INTO public.profiles (id, email, full_name, is_super_admin, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    new_is_super_admin,
    new_role
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
