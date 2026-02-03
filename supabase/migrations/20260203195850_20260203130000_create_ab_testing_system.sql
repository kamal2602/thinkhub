/*
  # A/B Testing & Feature Flags System

  1. New Tables
    - `feature_flags`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `key` (text, unique identifier for the flag)
      - `name` (text, human-readable name)
      - `description` (text, what this flag controls)
      - `enabled` (boolean, is flag active)
      - `rollout_percentage` (integer, percentage of users who see this)
      - `target_user_roles` (text[], specific roles to target)
      - `metadata` (jsonb, additional configuration)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `ab_experiments`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `name` (text, experiment name)
      - `description` (text)
      - `feature_flag_id` (uuid, references feature_flags)
      - `status` (text, draft|running|paused|completed)
      - `variant_a_name` (text, control variant name)
      - `variant_b_name` (text, test variant name)
      - `variant_a_config` (jsonb, control configuration)
      - `variant_b_config` (jsonb, test configuration)
      - `traffic_split` (integer, percentage for variant B)
      - `target_metric` (text, what we're measuring)
      - `started_at` (timestamptz)
      - `ended_at` (timestamptz)
      - `created_at` (timestamptz)

    - `user_variant_assignments`
      - `id` (uuid, primary key)
      - `experiment_id` (uuid, references ab_experiments)
      - `user_id` (uuid, references profiles)
      - `variant` (text, 'A' or 'B')
      - `assigned_at` (timestamptz)

    - `experiment_events`
      - `id` (uuid, primary key)
      - `experiment_id` (uuid, references ab_experiments)
      - `user_id` (uuid, references profiles)
      - `variant` (text, 'A' or 'B')
      - `event_type` (text, e.g., 'view', 'click', 'conversion')
      - `event_name` (text, specific event identifier)
      - `event_data` (jsonb, additional event details)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Admin users can manage feature flags and experiments
    - All users can read their assigned variants
    - System tracks events for all authenticated users
*/

-- Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean DEFAULT false,
  rollout_percentage integer DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_user_roles text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, key)
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feature flags for their company"
  ON feature_flags FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage feature flags"
  ON feature_flags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = feature_flags.company_id
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = feature_flags.company_id
      AND role = 'admin'
    )
  );

-- A/B Experiments
CREATE TABLE IF NOT EXISTS ab_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  feature_flag_id uuid REFERENCES feature_flags(id) ON DELETE SET NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  variant_a_name text DEFAULT 'Control',
  variant_b_name text DEFAULT 'Test',
  variant_a_config jsonb DEFAULT '{}'::jsonb,
  variant_b_config jsonb DEFAULT '{}'::jsonb,
  traffic_split integer DEFAULT 50 CHECK (traffic_split >= 0 AND traffic_split <= 100),
  target_metric text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view experiments for their company"
  ON ab_experiments FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage experiments"
  ON ab_experiments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = ab_experiments.company_id
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = ab_experiments.company_id
      AND role = 'admin'
    )
  );

-- User Variant Assignments
CREATE TABLE IF NOT EXISTS user_variant_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid REFERENCES ab_experiments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  variant text NOT NULL CHECK (variant IN ('A', 'B')),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(experiment_id, user_id)
);

ALTER TABLE user_variant_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own variant assignments"
  ON user_variant_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can assign variants"
  ON user_variant_assignments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all variant assignments"
  ON user_variant_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ab_experiments
      JOIN user_company_access ON ab_experiments.company_id = user_company_access.company_id
      WHERE ab_experiments.id = user_variant_assignments.experiment_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role = 'admin'
    )
  );

-- Experiment Events
CREATE TABLE IF NOT EXISTS experiment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid REFERENCES ab_experiments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  variant text NOT NULL CHECK (variant IN ('A', 'B')),
  event_type text NOT NULL,
  event_name text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE experiment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log their own events"
  ON experiment_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all experiment events"
  ON experiment_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ab_experiments
      JOIN user_company_access ON ab_experiments.company_id = user_company_access.company_id
      WHERE ab_experiments.id = experiment_events.experiment_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_flags_company ON feature_flags(company_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_company ON ab_experiments(company_id);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON ab_experiments(status);
CREATE INDEX IF NOT EXISTS idx_user_variant_assignments_user ON user_variant_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_variant_assignments_experiment ON user_variant_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_experiment ON experiment_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_user ON experiment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_created ON experiment_events(created_at);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_feature_flag_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feature_flags_timestamp
BEFORE UPDATE ON feature_flags
FOR EACH ROW
EXECUTE FUNCTION update_feature_flag_timestamp();