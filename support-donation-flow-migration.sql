-- Support donation flow migration
-- Run this once on an existing Missing Track database.
-- Do not run it again after the columns already exist.

USE defaultdb;

ALTER TABLE support_programs
  MODIFY COLUMN person_id INT NULL,
  ADD COLUMN target_type ENUM('Single Person','Multiple People','Whole Agency') NOT NULL DEFAULT 'Single Person' AFTER person_id,
  ADD COLUMN target_agency_id INT NULL AFTER target_type,
  ADD COLUMN donation_group_id VARCHAR(36) NULL AFTER target_agency_id,
  ADD INDEX idx_support_group (donation_group_id),
  ADD CONSTRAINT fk_support_target_agency FOREIGN KEY (target_agency_id) REFERENCES agencies(id) ON DELETE SET NULL;

SELECT 'Support donation flow migration applied' AS status;
