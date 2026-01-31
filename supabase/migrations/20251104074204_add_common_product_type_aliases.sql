/*
  # Add Common Product Type Aliases

  1. Purpose
    - Add common alternative names for product types to improve import matching
    - Supports case-insensitive matching via lowercase aliases

  2. Changes
    - Add aliases for common product type variations:
      - NOTEBOOKS, NB, NOTEBOOK → Laptops
      - LAPTOP → Laptops
      - DESKTOP, PC, DESKTOPS → Desktops
      - MACBOOK, MAC → Macbooks
      - SERVER → Servers
      - NETWORK, NETWORKING → Networking Products

  3. Notes
    - All aliases are stored in lowercase for consistent matching
    - Additional aliases can be added via Settings > Product Type Aliases UI
*/

-- Add aliases for Laptops
INSERT INTO product_type_aliases (company_id, product_type_id, alias)
SELECT 
  pt.company_id,
  pt.id,
  alias_value
FROM product_types pt
CROSS JOIN (
  VALUES 
    ('notebooks'),
    ('notebook'),
    ('nb'),
    ('laptop')
) AS aliases(alias_value)
WHERE pt.name = 'Laptops'
ON CONFLICT DO NOTHING;

-- Add aliases for Desktops
INSERT INTO product_type_aliases (company_id, product_type_id, alias)
SELECT 
  pt.company_id,
  pt.id,
  alias_value
FROM product_types pt
CROSS JOIN (
  VALUES 
    ('desktop'),
    ('pc'),
    ('desktops')
) AS aliases(alias_value)
WHERE pt.name = 'Desktops'
ON CONFLICT DO NOTHING;

-- Add aliases for Macbooks
INSERT INTO product_type_aliases (company_id, product_type_id, alias)
SELECT 
  pt.company_id,
  pt.id,
  alias_value
FROM product_types pt
CROSS JOIN (
  VALUES 
    ('macbook'),
    ('mac')
) AS aliases(alias_value)
WHERE pt.name = 'Macbooks'
ON CONFLICT DO NOTHING;

-- Add aliases for Servers
INSERT INTO product_type_aliases (company_id, product_type_id, alias)
SELECT 
  pt.company_id,
  pt.id,
  alias_value
FROM product_types pt
CROSS JOIN (
  VALUES 
    ('server')
) AS aliases(alias_value)
WHERE pt.name = 'Servers'
ON CONFLICT DO NOTHING;

-- Add aliases for Networking Products
INSERT INTO product_type_aliases (company_id, product_type_id, alias)
SELECT 
  pt.company_id,
  pt.id,
  alias_value
FROM product_types pt
CROSS JOIN (
  VALUES 
    ('network'),
    ('networking')
) AS aliases(alias_value)
WHERE pt.name = 'Networking Products'
ON CONFLICT DO NOTHING;
