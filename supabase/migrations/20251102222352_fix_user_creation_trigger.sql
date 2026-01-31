/*
  # Fix User Creation Trigger

  1. Changes
    - Update handle_new_user function to use SECURITY DEFINER properly
    - Ensure the function bypasses RLS when creating profiles
    - Add better error handling

  2. Notes
    - SECURITY DEFINER allows the function to bypass RLS
    - Function runs with privileges of the function owner (postgres)
*/

-- Drop and recreate the function with proper security
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count integer;
BEGIN
  -- Check if this is the first user in profiles table
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- Create profile and make first user super admin
  INSERT INTO profiles (id, is_super_admin)
  VALUES (
    NEW.id,
    CASE WHEN user_count = 0 THEN true ELSE false END
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user();