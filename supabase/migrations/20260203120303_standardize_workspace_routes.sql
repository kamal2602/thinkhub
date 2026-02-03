-- Standardize Workspace Routes
-- Update all engines to use consistent workspace_route pattern: '/' || key
-- Ensures launcher navigation matches EngineRouter expectations
-- No custom routes like '/smart-receiving' - use '/receiving' instead

-- Standardize all workspace routes to match engine key
UPDATE engines
SET workspace_route = '/' || key
WHERE workspace_route IS NULL
   OR workspace_route != '/' || key;
