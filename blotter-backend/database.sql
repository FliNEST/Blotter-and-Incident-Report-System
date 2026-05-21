-- ============================================================
--  BARANGAY BLOTTER & INCIDENT REPORT SYSTEM — DATABASE SCHEMA
--  Engine: MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS blotter_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE blotter_db;

-- ────────────────────────────────────────────────────────────
-- 1. USERS  (4 roles: admin | captain | kagawad | resident)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(10)  UNIQUE NOT NULL,          -- e.g. U001
  full_name   VARCHAR(150) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,                 -- bcrypt hash
  role        ENUM('admin','captain','kagawad','resident') NOT NULL DEFAULT 'resident',
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  phone       VARCHAR(20),
  address     TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────────────────
-- 2. BLOTTER RECORDS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blotter_records (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  blotter_id            VARCHAR(20) UNIQUE NOT NULL,   -- BLT-2026-0001
  -- Complainant
  complainant_id        INT,                           -- FK to users (if registered)
  complainant_name      VARCHAR(150) NOT NULL,
  complainant_phone     VARCHAR(20),
  complainant_address   TEXT,
  complainant_relation  VARCHAR(100),                  -- biktima, saksi, etc.
  -- Respondent
  respondent_name       VARCHAR(150) NOT NULL,
  respondent_phone      VARCHAR(20),
  respondent_address    TEXT,
  -- Incident details
  incident_type         VARCHAR(100) NOT NULL,
  incident_location     TEXT,
  incident_datetime     DATETIME,
  incident_description  TEXT,
  -- Status & assignment
  status                ENUM('pending','investigating','resolved','archived') DEFAULT 'pending',
  assigned_to           INT,                           -- FK to users (kagawad/captain)
  updated_by            INT,                           -- FK to users
  -- Official signature
  official_name         VARCHAR(150),
  official_signature    VARCHAR(255),                  -- file path
  complainant_signature VARCHAR(255),                  -- file path
  -- Timestamps
  reported_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (complainant_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to)   REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by)    REFERENCES users(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- 3. INCIDENT TYPES (checkboxes)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blotter_incident_types (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  blotter_id  INT NOT NULL,
  type_name   VARCHAR(100) NOT NULL,
  FOREIGN KEY (blotter_id) REFERENCES blotter_records(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 4. BARANGAY ACTIONS (aksyon ng opisyal)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS barangay_actions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  blotter_id  INT NOT NULL,
  action_name VARCHAR(150) NOT NULL,
  FOREIGN KEY (blotter_id) REFERENCES blotter_records(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 5. INVESTIGATION NOTES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investigation_notes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  blotter_id  INT NOT NULL,
  noted_by    INT,                                    -- FK to users (kagawad)
  notes       TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (blotter_id) REFERENCES blotter_records(id) ON DELETE CASCADE,
  FOREIGN KEY (noted_by)   REFERENCES users(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- 6. ATTACHMENTS / EVIDENCE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attachments (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  blotter_id   INT NOT NULL,
  uploaded_by  INT,
  file_name    VARCHAR(255) NOT NULL,
  file_path    VARCHAR(500) NOT NULL,
  file_type    VARCHAR(50),
  file_size    INT,
  uploaded_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (blotter_id)  REFERENCES blotter_records(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- 7. SCHEDULES / HEARINGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedules (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  blotter_id     INT NOT NULL,
  schedule_date  DATETIME NOT NULL,
  location       VARCHAR(255) NOT NULL,
  action_type    ENUM('Mediator','Investigating','Hearing','Follow-up') NOT NULL,
  notes          TEXT,
  created_by     INT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (blotter_id) REFERENCES blotter_records(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- 8. ACTIVITY LOGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  action      VARCHAR(255) NOT NULL,
  details     TEXT,
  ip_address  VARCHAR(50),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- 9. SEED DATA — Default Users
--    Passwords are bcrypt of: Admin@123 / Captain@123 / Kagawad@123 / Resident@123
-- ────────────────────────────────────────────────────────────
INSERT INTO users (user_id, full_name, email, password, role, status, created_at) VALUES
('U001', 'System Admin',       'admin@gmail.com',           '$2a$10$xJ3B3N2z2z2z2z2z2z2z2O9Q2V2z2z2z2z2z2z2z2z2z2z2z2z2z2', 'admin',    'active', NOW()),
('U002', 'Barangay Captain',   'captain@gmail.com',         '$2a$10$xJ3B3N2z2z2z2z2z2z2z2O9Q2V2z2z2z2z2z2z2z2z2z2z2z2z2z2', 'captain',  'active', NOW()),
('U003', 'Kagawad Juan',       'kagawad@gmail.com',         '$2a$10$xJ3B3N2z2z2z2z2z2z2z2O9Q2V2z2z2z2z2z2z2z2z2z2z2z2z2z2', 'kagawad',  'active', NOW()),
('U004', 'Juan Dela Cruz',     'juandelacruz@gmail.com',    '$2a$10$xJ3B3N2z2z2z2z2z2z2z2O9Q2V2z2z2z2z2z2z2z2z2z2z2z2z2z2', 'resident', 'active', NOW());

-- NOTE: Run the seed script (seed.js) to insert users with proper hashed passwords.
