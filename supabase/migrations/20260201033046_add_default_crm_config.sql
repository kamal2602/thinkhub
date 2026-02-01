/*
  # Add Default CRM Configuration

  This migration adds default opportunity stages and lead sources to make the CRM functional out of the box.

  ## Changes

  1. **Default Opportunity Stages**
     - Prospecting
     - Qualification
     - Proposal
     - Negotiation
     - Closed Won
     - Closed Lost

  2. **Default Lead Sources**
     - Website
     - Referral
     - Cold Call
     - Trade Show
     - Social Media
     - Email Campaign

  ## Notes
  - These are added only if the company doesn't already have custom stages/sources
  - This is done via a function that can be called during first-time setup
*/

-- Function to initialize default opportunity stages for a company
CREATE OR REPLACE FUNCTION initialize_default_opportunity_stages(p_company_id uuid)
RETURNS void AS $$
BEGIN
  -- Only add default stages if none exist for this company
  IF NOT EXISTS (
    SELECT 1 FROM opportunity_stages WHERE company_id = p_company_id
  ) THEN
    INSERT INTO opportunity_stages (company_id, name, sort_order, is_closed, is_won, color)
    VALUES
      (p_company_id, 'prospecting', 1, false, false, '#6B7280'),
      (p_company_id, 'qualification', 2, false, false, '#3B82F6'),
      (p_company_id, 'proposal', 3, false, false, '#EAB308'),
      (p_company_id, 'negotiation', 4, false, false, '#F97316'),
      (p_company_id, 'closed_won', 5, true, true, '#10B981'),
      (p_company_id, 'closed_lost', 6, true, false, '#EF4444');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize default lead sources for a company
CREATE OR REPLACE FUNCTION initialize_default_lead_sources(p_company_id uuid)
RETURNS void AS $$
BEGIN
  -- Only add default sources if none exist for this company
  IF NOT EXISTS (
    SELECT 1 FROM lead_sources WHERE company_id = p_company_id
  ) THEN
    INSERT INTO lead_sources (company_id, name, sort_order)
    VALUES
      (p_company_id, 'Website', 1),
      (p_company_id, 'Referral', 2),
      (p_company_id, 'Cold Call', 3),
      (p_company_id, 'Trade Show', 4),
      (p_company_id, 'Social Media', 5),
      (p_company_id, 'Email Campaign', 6);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-initialize CRM config when CRM is enabled for a company
CREATE OR REPLACE FUNCTION auto_initialize_crm_config()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.crm_enabled = true AND (OLD.crm_enabled IS NULL OR OLD.crm_enabled = false) THEN
    PERFORM initialize_default_opportunity_stages(NEW.id);
    PERFORM initialize_default_lead_sources(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on companies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_initialize_crm_config'
  ) THEN
    CREATE TRIGGER trigger_auto_initialize_crm_config
      AFTER INSERT OR UPDATE OF crm_enabled ON companies
      FOR EACH ROW
      EXECUTE FUNCTION auto_initialize_crm_config();
  END IF;
END $$;
