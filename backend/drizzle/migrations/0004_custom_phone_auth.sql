CREATE TABLE public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE,
  password_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_users (id, phone)
SELECT id, phone
FROM auth.users
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_users FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_users TO service_role;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TABLE public.app_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_sessions_user_id_idx ON public.app_sessions(user_id);
CREATE INDEX app_sessions_expires_at_idx ON public.app_sessions(expires_at);
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_sessions TO service_role;

DO $$
BEGIN
  IF (SELECT count(*) FROM storage.buckets WHERE id IN ('avatars', 'post-images', 'post-audio')) <> 3 THEN
    RAISE EXCEPTION 'Create the private avatars, post-images, and post-audio buckets before applying migration 0004';
  END IF;
END;
$$;

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'avatars';

UPDATE storage.buckets
SET file_size_limit = 8388608,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'post-images';

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/x-m4a']
WHERE id = 'post-audio';

CREATE TABLE public.app_auth_rate_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  attempt_count integer NOT NULL CHECK (attempt_count > 0)
);
CREATE INDEX app_auth_rate_limits_window_started_at_idx ON public.app_auth_rate_limits(window_started_at);
ALTER TABLE public.app_auth_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_auth_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_auth_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.create_app_account(
  _phone text,
  _full_name text,
  _password_hash text,
  _token_hash text,
  _expires_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  INSERT INTO public.app_users (phone, password_hash)
  VALUES (_phone, _password_hash)
  ON CONFLICT (phone) DO UPDATE
  SET password_hash = EXCLUDED.password_hash
  WHERE public.app_users.password_hash IS NULL
  RETURNING id INTO new_user_id;

  IF new_user_id IS NULL THEN
    RAISE EXCEPTION 'Phone number already registered' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.profiles (id, full_name)
  VALUES (new_user_id, _full_name)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'user')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.app_sessions (token_hash, user_id, expires_at)
  VALUES (_token_hash, new_user_id, _expires_at);

  RETURN new_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_app_account(text, text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_app_account(text, text, text, text, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_app_auth_attempt(
  _key_hash text,
  _limit integer,
  _window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_attempts integer;
BEGIN
  IF _limit < 1 OR _window_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate limit';
  END IF;

  INSERT INTO public.app_auth_rate_limits (key_hash, window_started_at, attempt_count)
  VALUES (_key_hash, now(), 1)
  ON CONFLICT (key_hash) DO UPDATE
  SET
    attempt_count = CASE
      WHEN public.app_auth_rate_limits.window_started_at <= now() - make_interval(secs => _window_seconds)
        THEN 1
      ELSE public.app_auth_rate_limits.attempt_count + 1
    END,
    window_started_at = CASE
      WHEN public.app_auth_rate_limits.window_started_at <= now() - make_interval(secs => _window_seconds)
        THEN now()
      ELSE public.app_auth_rate_limits.window_started_at
    END
  RETURNING attempt_count INTO current_attempts;

  DELETE FROM public.app_auth_rate_limits
  WHERE key_hash IN (
    SELECT key_hash
    FROM public.app_auth_rate_limits
    WHERE window_started_at < now() - interval '1 day'
    ORDER BY window_started_at
    LIMIT 100
  );
  DELETE FROM public.app_sessions
  WHERE token_hash IN (
    SELECT token_hash
    FROM public.app_sessions
    WHERE expires_at < now()
    ORDER BY expires_at
    LIMIT 100
  );

  RETURN current_attempts <= _limit;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_app_auth_attempt(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_app_auth_attempt(text, integer, integer) TO service_role;
