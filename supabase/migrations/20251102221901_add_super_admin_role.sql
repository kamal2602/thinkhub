/*
  # Add Super Admin Role

  1. Changes
    - Create profiles table to track super admin status
    - Add function to check if user is super admin
    - Create trigger to make first user super admin automatically
    - Update RLS policies for super admin access

  2. Security
    - Super admins have unrestricted access to all companies
    - Super admins can assign company access to any user
    - Only super admins can manage other users' permissions
*/

-- Create profiles table to track super admin status
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_super_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Function to check if user is super admin (needed for policies)
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Super admins can read all profiles
CREATE POLICY "Super admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Policy: Super admins can update all profiles
CREATE POLICY "Super admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Function to create profile for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_count integer;
BEGIN
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- Create profile and make first user super admin
  INSERT INTO profiles (id, is_super_admin)
  VALUES (
    NEW.id,
    CASE WHEN user_count = 0 THEN true ELSE false END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update user_company_access policies to allow super admin access
DROP POLICY IF EXISTS "Super admins can manage all user access" ON user_company_access;
CREATE POLICY "Super admins can manage all user access"
  ON user_company_access
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Update companies table to allow super admin full access
DROP POLICY IF EXISTS "Super admins can manage all companies" ON companies;
CREATE POLICY "Super admins can manage all companies"
  ON companies
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));