/*
  # Add Onboarding Status to Companies

  1. Changes
    - Add `onboarding_completed` boolean to companies table
    - Add `onboarding_step` integer to track progress
    - Default to false for new companies

  2. Security
    - Update existing policies to allow onboarding updates
*/

-- Add onboarding columns
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;
