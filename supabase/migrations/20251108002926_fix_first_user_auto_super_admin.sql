/*
  # Auto-promote First User to Super Admin

  1. Changes
    - Update the handle_new_user() trigger function to automatically set is_super_admin = true for the first user
    - Check if there are any existing profiles before setting super admin status
  
  2. Security
    - Only the very first user in the system will be auto-promoted
    - All subsequent users will default to is_super_admin = false
*/

-- Drop and recreate the function with first-user auto-promotion logic
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing profiles
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Insert new profile, setting is_super_admin = true if this is the first user
  INSERT INTO public.profiles (id, email, full_name, is_super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    (user_count = 0)  -- True if this is the first user, false otherwise
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
