-- Update table_code to be sequential numbers for active tables
-- This fixes the issue where all tables have the same table_code

SET @row_number = 0;

UPDATE tables_master
SET table_code = CAST((@row_number:=@row_number + 1) AS CHAR)
WHERE is_active = 1
ORDER BY id;

-- Verify the update
SELECT id, table_code, table_name FROM tables_master WHERE is_active = 1 ORDER BY id;
