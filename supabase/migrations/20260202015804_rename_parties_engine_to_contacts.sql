/*
  # Rename Parties Engine to Contacts

  1. Updates
    - Rename engine key from "parties" to "contacts"
    - Update workspace route to "/contacts"
    - Update title to "Contacts"
    - Update dependencies in other engines

  2. Notes
    - contacts table already exists with proper structure
    - This aligns engine registry with actual DB table name
    - Maintains backward compatibility during transition
*/

-- Update the parties engine to contacts
UPDATE engines
SET
  key = 'contacts',
  title = 'Contacts',
  workspace_route = '/contacts',
  description = 'Manage companies and individuals (customers, suppliers, vendors, etc.)',
  updated_at = now()
WHERE key = 'parties';

-- Update dependencies in other engines that depend on parties
-- First, we need to replace 'parties' with 'contacts' in the JSONB array
UPDATE engines
SET
  depends_on = (
    SELECT jsonb_agg(
      CASE 
        WHEN elem::text = '"parties"' THEN '"contacts"'::jsonb
        ELSE elem
      END
    )
    FROM jsonb_array_elements(depends_on) AS elem
  ),
  updated_at = now()
WHERE depends_on ? 'parties';
