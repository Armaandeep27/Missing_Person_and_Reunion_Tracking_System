-- ============================================================
-- Missing Persons & Re-Union Tracking System
-- MySQL 8.x / Aiven compatible. Run this in MySQL Workbench.
-- ============================================================

CREATE DATABASE IF NOT EXISTS defaultdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE defaultdb;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS reunions;
DROP TABLE IF EXISTS support_programs;
DROP TABLE IF EXISTS rehabilitation_records;
DROP TABLE IF EXISTS sightings;
DROP TABLE IF EXISTS missing_persons;
DROP TABLE IF EXISTS agencies;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  username VARCHAR(60) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  password_hash VARCHAR(64) DEFAULT NULL,
  role ENUM('admin','agency','sponsor') NOT NULL DEFAULT 'admin',
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agencies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agency_code VARCHAR(30) NOT NULL UNIQUE,
  agency_name VARCHAR(160) NOT NULL,
  agency_type ENUM('Police Station','NGO','Shelter','Hospital','Child Welfare','Other') NOT NULL,
  contact_person VARCHAR(120),
  phone VARCHAR(30),
  email VARCHAR(160),
  address VARCHAR(255),
  city VARCHAR(80),
  state VARCHAR(80),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE missing_persons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  case_no VARCHAR(40) NOT NULL UNIQUE,
  full_name VARCHAR(140) NOT NULL,
  gender ENUM('Male','Female','Other','Unknown') NOT NULL DEFAULT 'Unknown',
  age INT,
  guardian_name VARCHAR(140),
  guardian_phone VARCHAR(30),
  last_seen_date DATE,
  last_seen_location VARCHAR(220),
  identifying_marks TEXT,
  photo_url VARCHAR(500),
  status ENUM('Missing','Sighted','Reunited','Closed') NOT NULL DEFAULT 'Missing',
  rehabilitation_status ENUM('Not Started','In Progress','Completed') NOT NULL DEFAULT 'Not Started',
  assigned_agency_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_agency_id) REFERENCES agencies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sightings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  reported_by_name VARCHAR(140) NOT NULL,
  reporter_phone VARCHAR(30),
  location VARCHAR(220) NOT NULL,
  sighting_date DATETIME NOT NULL,
  confidence ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  status ENUM('New','Under Verification','Verified','Rejected') NOT NULL DEFAULT 'New',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES missing_persons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE rehabilitation_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  person_id INT NOT NULL,
  shelter_name VARCHAR(160),
  health_status VARCHAR(160),
  counselling_status VARCHAR(160),
  education_support VARCHAR(160),
  status ENUM('Pending','In Progress','Completed') NOT NULL DEFAULT 'Pending',
  notes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (person_id) REFERENCES missing_persons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE support_programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  person_id INT,
  target_type ENUM('Single Person','Multiple People','Whole Agency') NOT NULL DEFAULT 'Single Person',
  target_agency_id INT,
  donation_group_id VARCHAR(36),
  sponsor_name VARCHAR(140) NOT NULL,
  sponsor_phone VARCHAR(30),
  support_type ENUM('Sponsorship','Scholarship','Medical Aid','Shelter Aid','Food Support','Other') NOT NULL,
  amount DECIMAL(10,2) DEFAULT 0,
  start_date DATE,
  status ENUM('Planned','Active','Completed','Paused') NOT NULL DEFAULT 'Planned',
  notes TEXT,
  FOREIGN KEY (person_id) REFERENCES missing_persons(id) ON DELETE CASCADE,
  FOREIGN KEY (target_agency_id) REFERENCES agencies(id) ON DELETE SET NULL,
  INDEX idx_support_group (donation_group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reunions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  person_id INT NOT NULL,
  reunion_date DATE NOT NULL,
  family_contact VARCHAR(160) NOT NULL,
  verified_by VARCHAR(140),
  outcome ENUM('Reunited','Follow-up Required','Closed') NOT NULL DEFAULT 'Reunited',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (person_id) REFERENCES missing_persons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  entity_type VARCHAR(60) NOT NULL,
  entity_id INT,
  action VARCHAR(80) NOT NULL,
  details TEXT,
  action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DELIMITER $$
CREATE TRIGGER trg_sighting_verified
AFTER UPDATE ON sightings
FOR EACH ROW
BEGIN
  IF NEW.status = 'Verified' THEN
    UPDATE missing_persons SET status = 'Sighted' WHERE id = NEW.case_id AND status = 'Missing';
  END IF;
END$$

CREATE TRIGGER trg_reunion_insert
AFTER INSERT ON reunions
FOR EACH ROW
BEGIN
  IF NEW.outcome = 'Reunited' THEN
    UPDATE missing_persons SET status = 'Reunited', rehabilitation_status = 'In Progress' WHERE id = NEW.person_id;
  END IF;
END$$

CREATE PROCEDURE mark_case_reunited(IN p_person_id INT, IN p_family_contact VARCHAR(160), IN p_verified_by VARCHAR(140), IN p_notes TEXT)
BEGIN
  INSERT INTO reunions(person_id, reunion_date, family_contact, verified_by, outcome, notes)
  VALUES (p_person_id, CURDATE(), p_family_contact, p_verified_by, 'Reunited', p_notes);
END$$
DELIMITER ;

INSERT INTO users(full_name,email,username,password,password_hash,role) VALUES
('System Administrator','admin@missingtrack.local','admin','admin123',SHA2('admin123',256),'admin'),
('Agency Officer','agency@missingtrack.local','agency','agency123',SHA2('agency123',256),'agency'),
('Support Partner','sponsor@missingtrack.local','sponsor','sponsor123',SHA2('sponsor123',256),'sponsor');

INSERT INTO agencies(agency_code,agency_name,agency_type,contact_person,phone,email,address,city,state) VALUES
('POL-CHD-01','Central Police Station','Police Station','Inspector Meera Singh','9876501111','central-police@example.com','Sector 17','Chandigarh','Chandigarh'),
('NGO-HOPE','Hope Reconnect Foundation','NGO','Ravi Malhotra','9876502222','hope@example.com','Civil Lines','Delhi','Delhi'),
('SHL-SAFE','Safe Haven Shelter','Shelter','Anita Rao','9876503333','safehaven@example.com','Model Town','Ludhiana','Punjab');

INSERT INTO missing_persons(case_no,full_name,gender,age,guardian_name,guardian_phone,last_seen_date,last_seen_location,identifying_marks,status,rehabilitation_status,assigned_agency_id) VALUES
('MP-2026-001','Aarav Sharma','Male',12,'Sunita Sharma','9811100001','2026-04-11','ISBT Chandigarh','Small scar near left eyebrow','Sighted','Not Started',1),
('MP-2026-002','Nisha Kumari','Female',16,'Pooja Kumari','9811100002','2026-04-17','Delhi Railway Station','Blue school bag, mole on right cheek','Missing','Not Started',2),
('MP-2026-003','Rahul Verma','Male',10,'Sanjay Verma','9811100003','2026-03-29','Ludhiana Bus Stand','Red thread bracelet','Reunited','In Progress',3);

INSERT INTO sightings(case_id,reported_by_name,reporter_phone,location,sighting_date,confidence,status,notes) VALUES
(1,'Bus Depot Volunteer','9811199991','Sector 43 Bus Stand','2026-04-13 17:20:00','High','Verified','Matched clothing and guardian confirmed identity.'),
(2,'Railway Helpdesk','9811199992','Platform 5, New Delhi','2026-04-18 10:05:00','Medium','Under Verification','Possible match from CCTV desk.');

INSERT INTO rehabilitation_records(person_id,shelter_name,health_status,counselling_status,education_support,status,notes) VALUES
(3,'Safe Haven Shelter','Healthy after checkup','Weekly counselling scheduled','Scholarship assessment pending','In Progress','Family follow-up visit planned.');

INSERT INTO support_programs(person_id,sponsor_name,sponsor_phone,support_type,amount,start_date,status,notes) VALUES
(3,'Bright Future Trust','9811188888','Scholarship',15000.00,'2026-05-01','Active','Education kit and term support approved.');

INSERT INTO reunions(person_id,reunion_date,family_contact,verified_by,outcome,notes) VALUES
(3,'2026-04-25','Sanjay Verma / 9811100003','Safe Haven Shelter','Reunited','Identity verified through guardian documents.');

-- Existing database update for the support donation flow:
-- Run these ALTER statements once if you already created the database before this update.
-- ALTER TABLE support_programs
--   MODIFY COLUMN person_id INT NULL,
--   ADD COLUMN target_type ENUM('Single Person','Multiple People','Whole Agency') NOT NULL DEFAULT 'Single Person' AFTER person_id,
--   ADD COLUMN target_agency_id INT NULL AFTER target_type,
--   ADD COLUMN donation_group_id VARCHAR(36) NULL AFTER target_agency_id,
--   ADD INDEX idx_support_group (donation_group_id),
--   ADD CONSTRAINT fk_support_target_agency FOREIGN KEY (target_agency_id) REFERENCES agencies(id) ON DELETE SET NULL;
-- UPDATE support_programs SET person_id = NULL WHERE target_type = 'Whole Agency';

SELECT 'Missing Persons & Re-Union database created successfully' AS status;
SHOW TABLES;
