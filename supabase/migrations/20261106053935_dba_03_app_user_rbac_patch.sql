-- =====================================================================
-- DBA-03 Master Patch: Streamlined app_user, RBAC, and Redacted Audits
-- =====================================================================

-- 1. Create app_user table if it does not exist
CREATE TABLE IF NOT EXISTS app_user (
    user_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username varchar(50) NOT NULL UNIQUE,
    email varchar(100) NOT NULL UNIQUE,
    password_hash text NOT NULL,
    first_name varchar(50) NOT NULL,
    last_name varchar(50) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
    stamp varchar(60)
);

-- 2. Safely add 'status' column if app_user already exists from prior migrations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'app_user' AND column_name = 'status'
    ) THEN
        ALTER TABLE app_user 
        ADD COLUMN status varchar(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'active', 'rejected'));
    END IF;
END $$;

-- 3. Core RBAC Catalog Tables
CREATE TABLE IF NOT EXISTS role (
    role_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name varchar(50) NOT NULL UNIQUE,
    description text,
    stamp varchar(60)
);

CREATE TABLE IF NOT EXISTS module (
    module_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    module_name varchar(50) NOT NULL UNIQUE,
    description text,
    stamp varchar(60)
);

CREATE TABLE IF NOT EXISTS rights (
    right_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    module_id bigint REFERENCES module(module_id),
    right_name varchar(50) NOT NULL,
    description text,
    stamp varchar(60)
);

CREATE TABLE IF NOT EXISTS user_permission (
    permission_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES app_user(user_id),
    right_id bigint NOT NULL REFERENCES rights(right_id),
    stamp varchar(60),
    CONSTRAINT uq_user_right UNIQUE (user_id, right_id)
);

-- 4. Audit Redaction Trigger Function for Passwords
CREATE OR REPLACE FUNCTION trg_audit_log_app_user() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_key TEXT; v_old JSONB; v_new JSONB;
BEGIN
    v_key := COALESCE(NEW.user_id, OLD.user_id)::text;
    v_old := CASE WHEN OLD IS NOT NULL THEN to_jsonb(OLD) - 'password_hash' ELSE NULL END;
    v_new := CASE WHEN NEW IS NOT NULL THEN to_jsonb(NEW) - 'password_hash' ELSE NULL END;
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by) VALUES (TG_TABLE_NAME, 'ADD', v_key, NULL, v_new, audit_user());
    ELSE
        IF (to_jsonb(OLD) - 'stamp') = (to_jsonb(NEW) - 'stamp') THEN RETURN NULL; END IF;
        INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by) VALUES (TG_TABLE_NAME, 'EDIT', v_key, v_old, v_new, audit_user());
    END IF;
    RETURN NULL;
END;
$$;

-- 5. Attach Triggers Safely
DROP TRIGGER IF EXISTS app_user_biu_stamp ON app_user;
CREATE TRIGGER app_user_biu_stamp BEFORE INSERT OR UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION trg_set_stamp();

DROP TRIGGER IF EXISTS app_user_aiu_audit ON app_user;
CREATE TRIGGER app_user_aiu_audit AFTER INSERT OR UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION trg_audit_log_app_user();

-- 6. Drop Old View if exists and Recreate Active Status View
DROP VIEW IF EXISTS app_user_active CASCADE;
CREATE OR REPLACE VIEW app_user_active WITH (security_invoker = true) AS 
SELECT * FROM app_user WHERE status = 'active';