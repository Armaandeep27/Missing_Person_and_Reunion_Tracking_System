
USE defaultdb;

ALTER TABLE support_programs
  MODIFY COLUMN person_id INT NULL;

UPDATE support_programs
SET person_id = NULL
WHERE target_type = 'Whole Agency';

SELECT 'Whole-agency support donation fix applied' AS status;
