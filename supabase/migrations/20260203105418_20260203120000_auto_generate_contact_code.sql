/*
  # Auto-generate contact_code for contacts
  
  1. Changes
    - Creates function to auto-generate contact_code (format: CONT-000001, CONT-000002, etc.)
    - Creates trigger to populate contact_code on insert if not provided
    
  2. Notes
    - Contact code is unique per company
    - Format: CONT-{6-digit-number}
    - If contact_code is manually provided, it will be preserved
*/

-- Function to generate next contact code for a company
CREATE OR REPLACE FUNCTION generate_contact_code(p_company_id uuid)
RETURNS text AS $$
DECLARE
  next_num integer;
  new_code text;
BEGIN
  -- Get the next number by finding the max existing code
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(contact_code FROM 'CONT-([0-9]+)')
        AS integer
      )
    ), 0
  ) + 1
  INTO next_num
  FROM contacts
  WHERE company_id = p_company_id
  AND contact_code ~ '^CONT-[0-9]+$';
  
  -- Format as CONT-000001
  new_code := 'CONT-' || LPAD(next_num::text, 6, '0');
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-populate contact_code
CREATE OR REPLACE FUNCTION trigger_generate_contact_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if contact_code is not provided
  IF NEW.contact_code IS NULL OR NEW.contact_code = '' THEN
    NEW.contact_code := generate_contact_code(NEW.company_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_contact_code ON contacts;
CREATE TRIGGER trigger_auto_contact_code
  BEFORE INSERT ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_contact_code();
