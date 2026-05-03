-- Run this before database.sql if triggers/procedure already exist.
-- Useful when re-running the schema in MySQL Workbench.

USE defaultdb;

DROP PROCEDURE IF EXISTS mark_case_reunited;
DROP TRIGGER IF EXISTS trg_sighting_verified;
DROP TRIGGER IF EXISTS trg_reunion_insert;
