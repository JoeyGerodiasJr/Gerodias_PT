CREATE TABLE IF NOT EXISTS session_log (
    session_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES app_user(user_id),
    session_token text NOT NULL,
    logged_in_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
    logged_out_at timestamp with time zone,
    ip_address varchar(45),
    user_agent text,
    is_deleted boolean NOT NULL DEFAULT false,
    stamp varchar(60)
);

CREATE OR REPLACE FUNCTION trg_audit_log_session_log() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_key TEXT; v_old JSONB; v_new JSONB;
BEGIN
    v_key := COALESCE(NEW.session_id, OLD.session_id)::text;
    v_old := CASE WHEN OLD IS NOT NULL THEN to_jsonb(OLD) - 'session_token' ELSE NULL END;
    v_new := CASE WHEN NEW IS NOT NULL THEN to_jsonb(NEW) - 'session_token' ELSE NULL END;
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by) VALUES (TG_TABLE_NAME, 'ADD', v_key, NULL, v_new, audit_user());
    ELSE
        IF (to_jsonb(OLD) - 'stamp') = (to_jsonb(NEW) - 'stamp') THEN RETURN NULL; END IF;
        INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by) VALUES (TG_TABLE_NAME, 'EDIT', v_key, v_old, v_new, audit_user());
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS session_log_biu_stamp ON session_log;
CREATE TRIGGER session_log_biu_stamp BEFORE INSERT OR UPDATE ON session_log FOR EACH ROW EXECUTE FUNCTION trg_set_stamp();

DROP TRIGGER IF EXISTS session_log_aiu_audit ON session_log;
CREATE TRIGGER session_log_aiu_audit AFTER INSERT OR UPDATE ON session_log FOR EACH ROW EXECUTE FUNCTION trg_audit_log_session_log();

CREATE OR REPLACE VIEW session_log_active WITH (security_invoker = true) AS 
SELECT * FROM session_log WHERE NOT is_deleted;