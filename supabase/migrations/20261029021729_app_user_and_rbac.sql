-- Migration: 20261029021729_app_user_and_rbac.sql
-- Description: User Management & RBAC schema (additive only)

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS role (
    role_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name varchar(50) NOT NULL,
    description text,
    is_deleted boolean NOT NULL DEFAULT false,
    stamp varchar(60)
);

CREATE TABLE IF NOT EXISTS module (
    module_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    module_code varchar(20) NOT NULL,
    module_name varchar(100) NOT NULL,
    is_deleted boolean NOT NULL DEFAULT false,
    stamp varchar(60)
);

CREATE TABLE IF NOT EXISTS rights (
    right_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    module_id bigint NOT NULL REFERENCES module(module_id),
    action_code varchar(20) NOT NULL,
    description text,
    is_deleted boolean NOT NULL DEFAULT false,
    stamp varchar(60)
);

CREATE TABLE IF NOT EXISTS app_user (
    user_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username varchar(50) NOT NULL,
    password_hash text NOT NULL,
    role_id bigint REFERENCES role(role_id),
    full_name varchar(100),
    email varchar(100),
    is_blocked boolean NOT NULL DEFAULT false,
    is_deleted boolean NOT NULL DEFAULT false,
    stamp varchar(60)
);

CREATE TABLE IF NOT EXISTS user_permission (
    permission_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES app_user(user_id),
    right_id bigint NOT NULL REFERENCES rights(right_id),
    is_deleted boolean NOT NULL DEFAULT false,
    stamp varchar(60)
);

-- 2. Partial Unique Indexes (Support Soft-Delete Reuse)
CREATE UNIQUE INDEX IF NOT EXISTS idx_role_name_active ON role(lower(role_name)) WHERE NOT is_deleted;
CREATE UNIQUE INDEX IF NOT EXISTS idx_module_code_active ON module(lower(module_code)) WHERE NOT is_deleted;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rights_module_action_active ON rights(module_id, lower(action_code)) WHERE NOT is_deleted;
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_username_active ON app_user(lower(username)) WHERE NOT is_deleted;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_permission_active ON user_permission(user_id, right_id) WHERE NOT is_deleted;

-- Foreign Key Performance Indexes
CREATE INDEX IF NOT EXISTS idx_rights_module_id ON rights(module_id);
CREATE INDEX IF NOT EXISTS idx_app_user_role_id ON app_user(role_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_user_id ON user_permission(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_right_id ON user_permission(right_id);

-- 3. Dedicated Child-Check Trigger Function for User Management
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
    END IF; 
    RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

-- 4. Redacted Audit Log Trigger Function for app_user (Matches DBA-02 audit rules)
CREATE OR REPLACE FUNCTION trg_audit_log_redacted()
RETURNS trigger AS $$ 
DECLARE 
    v_key text; 
    v_old jsonb; 
    v_new jsonb; 
    v_action text; 
BEGIN 
    v_key := COALESCE(NEW.user_id, OLD.user_id)::text; 
    v_old := CASE WHEN OLD IS NOT NULL THEN to_jsonb(OLD) - 'password_hash' ELSE NULL END; 
    v_new := CASE WHEN NEW IS NOT NULL THEN to_jsonb(NEW) - 'password_hash' ELSE NULL END;

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

-- 5. Attach Triggers & Create Active Views

-- --- ROLE ---
CREATE TRIGGER role_bd_block BEFORE DELETE ON role FOR EACH ROW EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER role_bt_block BEFORE TRUNCATE ON role FOR EACH STATEMENT EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER role_biu_stamp BEFORE INSERT OR UPDATE ON role FOR EACH ROW EXECUTE FUNCTION trg_set_stamp();
CREATE TRIGGER role_bu_check BEFORE UPDATE ON role FOR EACH ROW EXECUTE FUNCTION trg_check_children_um();
CREATE TRIGGER role_aiu_audit AFTER INSERT OR UPDATE ON role FOR EACH ROW EXECUTE FUNCTION trg_audit_log('role_id');
CREATE OR REPLACE VIEW role_active WITH (security_invoker = true) AS SELECT * FROM role WHERE NOT is_deleted;

-- --- MODULE ---
CREATE TRIGGER module_bd_block BEFORE DELETE ON module FOR EACH ROW EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER module_bt_block BEFORE TRUNCATE ON module FOR EACH STATEMENT EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER module_biu_stamp BEFORE INSERT OR UPDATE ON module FOR EACH ROW EXECUTE FUNCTION trg_set_stamp();
CREATE TRIGGER module_bu_check BEFORE UPDATE ON module FOR EACH ROW EXECUTE FUNCTION trg_check_children_um();
CREATE TRIGGER module_aiu_audit AFTER INSERT OR UPDATE ON module FOR EACH ROW EXECUTE FUNCTION trg_audit_log('module_id');
CREATE OR REPLACE VIEW module_active WITH (security_invoker = true) AS SELECT * FROM module WHERE NOT is_deleted;

-- --- RIGHTS ---
CREATE TRIGGER rights_bd_block BEFORE DELETE ON rights FOR EACH ROW EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER rights_bt_block BEFORE TRUNCATE ON rights FOR EACH STATEMENT EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER rights_biu_stamp BEFORE INSERT OR UPDATE ON rights FOR EACH ROW EXECUTE FUNCTION trg_set_stamp();
CREATE TRIGGER rights_bu_check BEFORE UPDATE ON rights FOR EACH ROW EXECUTE FUNCTION trg_check_children_um();
CREATE TRIGGER rights_aiu_audit AFTER INSERT OR UPDATE ON rights FOR EACH ROW EXECUTE FUNCTION trg_audit_log('right_id');
CREATE OR REPLACE VIEW rights_active WITH (security_invoker = true) AS SELECT * FROM rights WHERE NOT is_deleted;

-- --- APP_USER ---
CREATE TRIGGER app_user_bd_block BEFORE DELETE ON app_user FOR EACH ROW EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER app_user_bt_block BEFORE TRUNCATE ON app_user FOR EACH STATEMENT EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER app_user_biu_stamp BEFORE INSERT OR UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION trg_set_stamp();
CREATE TRIGGER app_user_bu_check BEFORE UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION trg_check_children_um();
CREATE TRIGGER app_user_aiu_audit AFTER INSERT OR UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION trg_audit_log_redacted();
CREATE OR REPLACE VIEW app_user_active WITH (security_invoker = true) AS SELECT * FROM app_user WHERE NOT is_deleted;

-- --- USER_PERMISSION ---
CREATE TRIGGER user_permission_bd_block BEFORE DELETE ON user_permission FOR EACH ROW EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER user_permission_bt_block BEFORE TRUNCATE ON user_permission FOR EACH STATEMENT EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER user_permission_biu_stamp BEFORE INSERT OR UPDATE ON user_permission FOR EACH ROW EXECUTE FUNCTION trg_set_stamp();
CREATE TRIGGER user_permission_bu_check BEFORE UPDATE ON user_permission FOR EACH ROW EXECUTE FUNCTION trg_check_children_um();
CREATE TRIGGER user_permission_aiu_audit AFTER INSERT OR UPDATE ON user_permission FOR EACH ROW EXECUTE FUNCTION trg_audit_log('permission_id');
CREATE OR REPLACE VIEW user_permission_active WITH (security_invoker = true) AS SELECT * FROM user_permission WHERE NOT is_deleted;