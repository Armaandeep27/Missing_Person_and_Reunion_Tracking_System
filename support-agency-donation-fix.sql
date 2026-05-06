-- Fix whole-agency support donations so they do not point to a random person.
-- Run this once if your support_programs table already has target_type columns.

USE defaultdb;

ALTER TABLE support_programs
  MODIFY COLUMN person_id INT NULL;

UPDATE support_programs
SET person_id = NULL
WHERE target_type = 'Whole Agency';

SELECT 'Whole-agency support donation fix applied' AS status;
