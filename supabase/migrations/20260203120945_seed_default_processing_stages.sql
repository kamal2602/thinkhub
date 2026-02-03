-- Seed Default Processing Stages
-- Ensures every company has default processing stages
-- Prevents "No stages configured" error on first run

-- Function to seed default processing stages for a company
CREATE OR REPLACE FUNCTION seed_default_processing_stages(p_company_id UUID)
RETURNS void AS $$
BEGIN
  -- Only seed if no stages exist for this company
  IF NOT EXISTS (
    SELECT 1 FROM processing_stages 
    WHERE company_id = p_company_id
  ) THEN
    INSERT INTO processing_stages (company_id, stage_name, stage_key, sort_order, color, is_terminal)
    VALUES
      (p_company_id, 'Received', 'received', 1, '#3b82f6', false),
      (p_company_id, 'Testing', 'testing', 2, '#f59e0b', false),
      (p_company_id, 'Repair/Refurb', 'repair', 3, '#ec4899', false),
      (p_company_id, 'Grading', 'grading', 4, '#8b5cf6', false),
      (p_company_id, 'QA', 'qa', 5, '#06b6d4', false),
      (p_company_id, 'Ready to Sell', 'ready_to_sell', 6, '#10b981', true);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-seed stages for new companies
CREATE OR REPLACE FUNCTION trigger_seed_processing_stages()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM seed_default_processing_stages(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'auto_seed_processing_stages'
  ) THEN
    CREATE TRIGGER auto_seed_processing_stages
      AFTER INSERT ON companies
      FOR EACH ROW
      EXECUTE FUNCTION trigger_seed_processing_stages();
  END IF;
END
$$;

-- Seed stages for all existing companies that don't have them
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    PERFORM seed_default_processing_stages(company_record.id);
  END LOOP;
END
$$;
