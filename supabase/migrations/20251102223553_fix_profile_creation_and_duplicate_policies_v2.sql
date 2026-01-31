/*
  # Fix Profile Creation and Duplicate Policies

  ## Changes
  1. Update the trigger to properly extract full_name from auth metadata
  2. Remove duplicate SELECT policy on profiles table
  
  ## Security
  - Maintains existing RLS policies
  - Ensures proper user profile creation
*/

-- Drop the duplicate "Users can read own profile" policy (keeping "Users can view own profile")
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Drop triggers and function in correct order
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Create improved function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
