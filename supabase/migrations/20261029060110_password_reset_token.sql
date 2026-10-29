-- Migration: password_reset_token schema (DBA-04)
-- Description: Password reset token table with token hashing, expiry, single-use flag, soft delete, and redacted audit.

-- 1. Create Table
CREATE TABLE IF NOT EXISTS password_reset_token (
    token_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES app_user(user_id),
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    is_used boolean NOT NULL DEFAULT false,
    is_deleted boolean NOT NULL DEFAULT false,
    stamp varchar(60)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_token_user_id ON password_reset_token(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_token_hash_active ON password_reset_token(token_hash) WHERE NOT is_deleted;

-- 3. Extend Child-Check Trigger Function for User Management to check password_reset_token
CREATE OR REPLACE FUNCTION trg_check_children_um()
RETURNS trigger AS $$ 
DECLARE 
    v_count bigint := 0; 
BEGIN 
    -- Only check children when transitioning from active to soft-deleted
    IF NOT (NEW.is_deleted AND NOT OLD.is_deleted) THEN 
        RETURN NEW; 
    END IF;

    IF TG_TABLE_NAME = 'role' THEN 
        SELECT count(*) INTO v_count FROM app_user WHERE role_id = OLD.role_id AND NOT is_deleted; 
        IF v_count > 0 THEN 
            RAISE EXCEPTION 'Cannot delete role row: % active related record(s) still exist in app_user.', v_count; 
        END IF; 
    ELSIF TG_TABLE_NAME = 'module' THEN 
        SELECT count(*) INTO v_count FROM rights WHERE module_id = OLD.module_id AND NOT is_deleted; 
        IF v_count > 0 THEN 
            RAISE EXCEPTION 'Cannot delete module row: % active related record(s) still exist in rights.', v_count; 
        END IF; 
    ELSIF TG_TABLE_NAME = 'rights' THEN 
        SELECT count(*) INTO v_count FROM user_permission WHERE right_id = OLD.right_id AND NOT is_deleted; 
        IF v_count > 0 THEN 
            RAISE EXCEPTION 'Cannot delete rights row: % active related record(s) still exist in user_permission.', v_count; 
        END IF; 
    ELSIF TG_TABLE_NAME = 'app_user' THEN 
        SELECT count(*) INTO v_count FROM user_permission WHERE user_id = OLD.user_id AND NOT is_deleted; 
        IF v_count > 0 THEN 
            RAISE EXCEPTION 'Cannot delete app_user row: % active related record(s) still exist in user_permission.', v_count; 
        END IF;

        -- Check active unused password reset tokens
        SELECT count(*) INTO v_count FROM password_reset_token 
        WHERE user_id = OLD.user_id AND NOT is_deleted AND NOT is_used AND expires_at > now(); 
        IF v_count > 0 THEN 
            RAISE EXCEPTION 'Cannot delete app_user row: % active pending password reset token(s) still exist.', v_count; 
        END IF;
    END IF; 
    RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

-- 4. Redacted Audit Log Trigger Function for password_reset_token (Strips token_hash)
CREATE OR REPLACE FUNCTION trg_audit_log_password_reset_token()
RETURNS trigger AS $$ 
DECLARE 
    v_key text; 
    v_old jsonb; 
    v_new jsonb; 
    v_action text; 
BEGIN 
    v_key := COALESCE(NEW.token_id, OLD.token_id)::text; 
    v_old := CASE WHEN OLD IS NOT NULL THEN to_jsonb(OLD) - 'token_hash' ELSE NULL END; 
    v_new := CASE WHEN NEW IS NOT NULL THEN to_jsonb(NEW) - 'token_hash' ELSE NULL END;

    IF TG_OP = 'INSERT' THEN 
        INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by) 
        VALUES (TG_TABLE_NAME, 'ADD', v_key, NULL, v_new, audit_user()); 
    ELSE 
        -- Ignore no-op updates
        IF (to_jsonb(OLD) - 'stamp') = (to_jsonb(NEW) - 'stamp') THEN 
            RETURN NULL; 
        END IF;

        v_action := CASE 
            WHEN NOT OLD.is_deleted AND NEW.is_deleted THEN 'DELETE' 
            WHEN OLD.is_deleted AND NOT NEW.is_deleted THEN 'RESTORE' 
            ELSE 'EDIT' 
        END;

        INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by) 
        VALUES (TG_TABLE_NAME, v_action, v_key, v_old, v_new, audit_user()); 
    END IF;

    RETURN NULL; 
END; 
$$ LANGUAGE plpgsql;

-- 5. Attach Triggers & Create Active View
CREATE TRIGGER password_reset_token_bd_block BEFORE DELETE ON password_reset_token FOR EACH ROW EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER password_reset_token_bt_block BEFORE TRUNCATE ON password_reset_token FOR EACH STATEMENT EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER password_reset_token_biu_stamp BEFORE INSERT OR UPDATE ON password_reset_token FOR EACH ROW EXECUTE FUNCTION trg_set_stamp();
CREATE TRIGGER password_reset_token_aiu_audit AFTER INSERT OR UPDATE ON password_reset_token FOR EACH ROW EXECUTE FUNCTION trg_audit_log_password_reset_token();

CREATE OR REPLACE VIEW password_reset_token_active WITH (security_invoker = true) AS 
SELECT * FROM password_reset_token WHERE NOT is_deleted;

-- 6. Permissions & Security Lockdown
ALTER TABLE password_reset_token ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON password_reset_token FROM anon;
REVOKE ALL ON password_reset_token_active FROM anon;