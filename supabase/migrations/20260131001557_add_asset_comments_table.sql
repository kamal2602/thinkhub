/*
  # Add Asset Comments Table

  1. New Tables
    - `asset_comments`
      - `id` (uuid, primary key)
      - `asset_id` (uuid, foreign key to assets)
      - `content` (text, the comment content)
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `asset_comments` table
    - Add policies for authenticated users to:
      - Read comments for assets in their company
      - Create comments for assets in their company
      - Delete their own comments
*/

CREATE TABLE IF NOT EXISTS asset_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE asset_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read comments for assets in their company"
  ON asset_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assets
      WHERE assets.id = asset_comments.asset_id
      AND assets.company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create comments for assets in their company"
  ON asset_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM assets
      WHERE assets.id = asset_comments.asset_id
      AND assets.company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON asset_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_asset_comments_asset_id ON asset_comments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_created_by ON asset_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_asset_comments_created_at ON asset_comments(created_at DESC);
