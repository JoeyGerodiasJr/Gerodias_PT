ALTER TABLE public.app_user
    ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

UPDATE public.app_user AS app
SET email_verified_at = auth_user.email_confirmed_at
FROM auth.users AS auth_user
WHERE lower(auth_user.email) = lower(app.email)
  AND auth_user.email_confirmed_at IS NOT NULL
  AND app.email_verified_at IS NULL;

UPDATE public.app_user
SET email_verified_at = COALESCE(email_verified_at, now())
WHERE NOT is_deleted
  AND lower(status) IN ('active', 'approved')
  AND email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS public.email_verification_otp (
    user_id bigint PRIMARY KEY REFERENCES public.app_user(user_id),
    token_hash text,
    expires_at timestamptz NOT NULL,
    attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
    last_sent_at timestamptz NOT NULL DEFAULT now(),
    is_used boolean NOT NULL DEFAULT false,
    is_deleted boolean NOT NULL DEFAULT false,
    stamp varchar(60)
);

CREATE OR REPLACE FUNCTION public.trg_audit_log_email_verification_otp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_key text;
    v_old jsonb;
    v_new jsonb;
    v_action text;
BEGIN
    v_key := COALESCE(NEW.user_id, OLD.user_id)::text;
    v_old := CASE WHEN OLD IS NOT NULL THEN to_jsonb(OLD) - 'token_hash' ELSE NULL END;
    v_new := CASE WHEN NEW IS NOT NULL THEN to_jsonb(NEW) - 'token_hash' ELSE NULL END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_log (table_name, action, record_key, old_values, new_values, action_by)
        VALUES (TG_TABLE_NAME, 'ADD', v_key, NULL, v_new, public.audit_user());
    ELSE
        IF (to_jsonb(OLD) - 'stamp' - 'token_hash') =
           (to_jsonb(NEW) - 'stamp' - 'token_hash') THEN
            RETURN NULL;
        END IF;

        v_action := CASE
            WHEN NOT OLD.is_deleted AND NEW.is_deleted THEN 'DELETE'
            WHEN OLD.is_deleted AND NOT NEW.is_deleted THEN 'RESTORE'
            ELSE 'EDIT'
        END;

        INSERT INTO public.audit_log (table_name, action, record_key, old_values, new_values, action_by)
        VALUES (TG_TABLE_NAME, v_action, v_key, v_old, v_new, public.audit_user());
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS email_verification_otp_bd_block ON public.email_verification_otp;
CREATE TRIGGER email_verification_otp_bd_block
    BEFORE DELETE ON public.email_verification_otp
    FOR EACH ROW EXECUTE FUNCTION public.trg_block_hard_delete();

DROP TRIGGER IF EXISTS email_verification_otp_bt_block ON public.email_verification_otp;
CREATE TRIGGER email_verification_otp_bt_block
    BEFORE TRUNCATE ON public.email_verification_otp
    FOR EACH STATEMENT EXECUTE FUNCTION public.trg_block_hard_delete();

DROP TRIGGER IF EXISTS email_verification_otp_biu_stamp ON public.email_verification_otp;
CREATE TRIGGER email_verification_otp_biu_stamp
    BEFORE INSERT OR UPDATE ON public.email_verification_otp
    FOR EACH ROW EXECUTE FUNCTION public.trg_set_stamp();

DROP TRIGGER IF EXISTS email_verification_otp_aiu_audit ON public.email_verification_otp;
CREATE TRIGGER email_verification_otp_aiu_audit
    AFTER INSERT OR UPDATE ON public.email_verification_otp
    FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log_email_verification_otp();

CREATE OR REPLACE VIEW public.email_verification_otp_active
WITH (security_invoker = true) AS
SELECT * FROM public.email_verification_otp WHERE NOT is_deleted;

CREATE OR REPLACE FUNCTION public.issue_email_verification_otp(
    p_user_id bigint,
    p_token_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_issued boolean;
BEGIN
    IF p_token_hash !~ '^[0-9a-f]{64}$' THEN
        RETURN false;
    END IF;

    INSERT INTO public.email_verification_otp AS current_otp
        (user_id, token_hash, expires_at, attempts, last_sent_at, is_used, is_deleted)
    VALUES
        (p_user_id, p_token_hash, now() + interval '120 seconds', 0, now(), false, false)
    ON CONFLICT (user_id) DO UPDATE
        SET token_hash = EXCLUDED.token_hash,
            expires_at = EXCLUDED.expires_at,
            attempts = 0,
            last_sent_at = now(),
            is_used = false,
            is_deleted = false
        WHERE current_otp.is_deleted
           OR current_otp.last_sent_at <= now() - interval '120 seconds'
    RETURNING true INTO v_issued;

    RETURN COALESCE(v_issued, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_email_verification_otp(
    p_user_id bigint,
    p_token_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_otp public.email_verification_otp%ROWTYPE;
BEGIN
    IF p_token_hash !~ '^[0-9a-f]{64}$' THEN
        RETURN false;
    END IF;

    SELECT * INTO v_otp
    FROM public.email_verification_otp
    WHERE user_id = p_user_id AND NOT is_deleted
    FOR UPDATE;

    IF NOT FOUND
       OR v_otp.is_used
       OR v_otp.expires_at <= now()
       OR v_otp.attempts >= 5
       OR v_otp.token_hash IS NULL THEN
        RETURN false;
    END IF;

    IF v_otp.token_hash IS DISTINCT FROM p_token_hash THEN
        UPDATE public.email_verification_otp
        SET attempts = attempts + 1
        WHERE user_id = p_user_id;
        RETURN false;
    END IF;

    UPDATE public.email_verification_otp
    SET token_hash = NULL, is_used = true
    WHERE user_id = p_user_id;

    UPDATE public.app_user
    SET email_verified_at = COALESCE(email_verified_at, now())
    WHERE user_id = p_user_id AND NOT is_deleted;

    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_email_verification_otp(
    p_user_id bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.email_verification_otp
    SET token_hash = NULL,
        expires_at = now(),
        attempts = 0,
        last_sent_at = now() - interval '120 seconds',
        is_used = true
    WHERE user_id = p_user_id AND NOT is_deleted;
END;
$$;

ALTER TABLE public.email_verification_otp ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_verification_otp FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.email_verification_otp_active FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.issue_email_verification_otp(bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_email_verification_otp(bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_email_verification_otp(bigint) FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.email_verification_otp TO service_role;
GRANT EXECUTE ON FUNCTION public.issue_email_verification_otp(bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_email_verification_otp(bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_email_verification_otp(bigint) TO service_role;
