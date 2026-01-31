/*
  # Allow First User to Set Super Admin Status

  1. Changes
    - Add policy to allow users to set their own is_super_admin status ONLY if no other super admins exist
    - This enables the first-time setup flow where the first user can become super admin

  2. Security
    - Policy only allows setting is_super_admin = true when:
      - The user is updating their own profile
      - There are currently zero super admins in the system
    - After the first super admin is created, this policy will no longer allow self-promotion
*/

-- Allow users to set themselves as super admin ONLY if no super admins exist yet
CREATE POLICY "Allow first user to become super admin"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    AND NOT EXISTS (
      SELECT 1 FROM profiles WHERE is_super_admin = true
    )
  )
  WITH CHECK (
    auth.uid() = id
    AND NOT EXISTS (
      SELECT 1 FROM profiles WHERE is_super_admin = true
    )
  );
