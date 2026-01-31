/*
  # Add Color and Default Flag to Cosmetic Grades

  1. Changes
    - Add color column to cosmetic_grades table
    - Add is_default column to cosmetic_grades table
    - Set default colors for standard grades

  2. Notes
    - Colors use Tailwind color hex codes for consistency
    - Grade A: Green (#10B981)
    - Grade B: Blue (#3B82F6)
    - Grade C: Yellow (#F59E0B)
    - For Parts: Red (#EF4444)
*/

-- Add color column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cosmetic_grades' AND column_name = 'color'
  ) THEN
    ALTER TABLE cosmetic_grades ADD COLUMN color text DEFAULT '#6B7280';
  END IF;
END $$;

-- Add is_default column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cosmetic_grades' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE cosmetic_grades ADD COLUMN is_default boolean DEFAULT false;
  END IF;
END $$;

-- Update existing grades with appropriate colors
UPDATE cosmetic_grades SET color = '#10B981' WHERE grade = 'A' OR grade = 'Grade A';
UPDATE cosmetic_grades SET color = '#3B82F6' WHERE grade = 'B' OR grade = 'Grade B';
UPDATE cosmetic_grades SET color = '#F59E0B' WHERE grade = 'C' OR grade = 'Grade C';
UPDATE cosmetic_grades SET color = '#EF4444' WHERE grade = 'For Parts';
