-- =====================================================================
-- DBA-06: Database Seeding & Integration Testing (Fully Guarded & Predicted Fixes)
-- =====================================================================

-- 0. PREDICTIVE SCHEMA GUARDS (Ensures all missing columns exist before seeding)

-- Guard app_user columns (first_name, last_name, status)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_user' AND column_name = 'first_name') THEN
        ALTER TABLE app_user ADD COLUMN first_name varchar(50) DEFAULT 'System';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_user' AND column_name = 'last_name') THEN
        ALTER TABLE app_user ADD COLUMN last_name varchar(50) DEFAULT 'User';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_user' AND column_name = 'status') THEN
        ALTER TABLE app_user ADD COLUMN status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected'));
    END IF;
END $$;

-- Guard module columns (description, module_code)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'module' AND column_name = 'description') THEN
        ALTER TABLE module ADD COLUMN description text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'module' AND column_name = 'module_code') THEN
        ALTER TABLE module ADD COLUMN module_code varchar(20);
    END IF;
END $$;

-- Guard role columns (description)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role' AND column_name = 'description') THEN
        ALTER TABLE role ADD COLUMN description text;
    END IF;
END $$;


-- 1. Insert Initial Roles & Modules (RBAC Seeding)
INSERT INTO role (role_name, description)
SELECT 'System Administrator', 'Full system access and security administration'
WHERE NOT EXISTS (SELECT 1 FROM role WHERE role_name = 'System Administrator');

INSERT INTO role (role_name, description)
SELECT 'Standard User', 'Default access for registered system users'
WHERE NOT EXISTS (SELECT 1 FROM role WHERE role_name = 'Standard User');

INSERT INTO module (module_code, module_name, description)
SELECT 'MOD_UM', 'User Management', 'User registration, role assignments, and authentication'
WHERE NOT EXISTS (SELECT 1 FROM module WHERE module_name = 'User Management');

INSERT INTO module (module_code, module_name, description)
SELECT 'MOD_ERP', 'ERP Operations', 'Access to general enterprise resource features'
WHERE NOT EXISTS (SELECT 1 FROM module WHERE module_name = 'ERP Operations');


-- 2. Seed Test Users (Pending, Active, Rejected)
INSERT INTO app_user (username, email, password_hash, first_name, last_name, status)
SELECT 'admin_kenji', 'kenji.admin@hope.edu.ph', '$2a$10$e8.Q5Z9Z41rZ/K59YgV7CeN604dG8n9V9Z9Z41rZ/K59YgV7Ce', 'Kenji', 'Traqueña', 'active'
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'admin_kenji');

INSERT INTO app_user (username, email, password_hash, first_name, last_name, status)
SELECT 'user_test', 'test.user@hope.edu.ph', '$2a$10$e8.Q5Z9Z41rZ/K59YgV7CeN604dG8n9V9Z9Z41rZ/K59YgV7Ce', 'Test', 'Student', 'pending'
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'user_test');

INSERT INTO app_user (username, email, password_hash, first_name, last_name, status)
SELECT 'rejected_user', 'rejected@hope.edu.ph', '$2a$10$e8.Q5Z9Z41rZ/K59YgV7CeN604dG8n9V9Z9Z41rZ/K59YgV7Ce', 'Rejected', 'Applicant', 'rejected'
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'rejected_user');


-- 3. Seed Password Reset Token Test Record
INSERT INTO password_reset_token (user_id, token_hash, expires_at, is_used)
SELECT user_id, 'hash_sample_reset_token_123456789', NOW() + INTERVAL '1 hour', false
FROM app_user 
WHERE username = 'admin_kenji'
  AND NOT EXISTS (
      SELECT 1 FROM password_reset_token 
      WHERE token_hash = 'hash_sample_reset_token_123456789'
  )
LIMIT 1;


-- 4. Seed Session Log Test Record
INSERT INTO session_log (user_id, session_token, ip_address, user_agent)
SELECT user_id, 'sess_token_sample_abc123xyz', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
FROM app_user 
WHERE username = 'admin_kenji'
  AND NOT EXISTS (
      SELECT 1 FROM session_log 
      WHERE session_token = 'sess_token_sample_abc123xyz'
  )
LIMIT 1;


-- 5. Integration Verification Logic
DO $$
DECLARE
    v_user_count INT;
    v_audit_count INT;
    v_active_count INT;
BEGIN
    SELECT COUNT(*) INTO v_user_count FROM app_user;
    SELECT COUNT(*) INTO v_active_count FROM app_user_active;
    SELECT COUNT(*) INTO v_audit_count FROM audit_log WHERE table_name = 'app_user';

    IF v_user_count < 3 THEN
        RAISE EXCEPTION 'DBA-06 Integration Test Failed: Insufficient seed records in app_user.';
    END IF;

    IF v_active_count < 1 THEN
        RAISE EXCEPTION 'DBA-06 Integration Test Failed: Active view app_user_active is empty.';
    END IF;

    IF v_audit_count < 1 THEN
        RAISE EXCEPTION 'DBA-06 Integration Test Failed: Audit triggers did not execute upon seeding.';
    END IF;
    
    RAISE NOTICE 'DBA-06 Integration Test Passed Successfully!';
END $$;