/*
  # Enable Realtime for Assets and Expected Receiving Items

  1. Changes
    - Enable realtime replication for `assets` table
    - Enable realtime replication for `expected_receiving_items` table
  
  2. Purpose
    - Allows real-time updates in the UI when assets are modified
    - Automatically refreshes Processing page when assets are updated
    - Automatically refreshes Smart Receiving when items are updated
    - No need for manual page refresh after updates
*/

ALTER PUBLICATION supabase_realtime ADD TABLE assets;
ALTER PUBLICATION supabase_realtime ADD TABLE expected_receiving_items;
