/*
  # Add Source File Storage to Purchase Orders

  1. Changes
    - Add `source_file_name` column to store original filename
    - Add `source_file_data` column to store parsed file data (headers, rows)
    - Add `source_file_mappings` column to store the column mappings used
    
  2. Purpose
    - Allow Smart Receiving to reuse the same file uploaded during PO creation
    - Eliminate redundant file uploads
    - Preserve original data for auditing and re-import

  3. Notes
    - File data stored as JSONB for efficient querying
    - Optional fields (can be null for older POs)
    - Compressed storage for large datasets
*/

-- Add source file storage columns to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS source_file_name TEXT,
ADD COLUMN IF NOT EXISTS source_file_data JSONB,
ADD COLUMN IF NOT EXISTS source_file_mappings JSONB;