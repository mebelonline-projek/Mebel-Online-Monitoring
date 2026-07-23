-- ============================================================
-- FIX: create_user_profile boleh role GUDANG
-- (updateUser/createUser via admin insert tidak pakai RPC ini,
--  tapi registrasi/RPC lama masih membatasi OWNER|KARYAWAN saja)
-- ============================================================

CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_exists BOOLEAN;
  profile_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) INTO user_exists;
  IF NOT user_exists THEN
    RAISE EXCEPTION 'Akun tidak ditemukan di sistem.';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = user_id) INTO profile_exists;
  IF profile_exists THEN
    RAISE EXCEPTION 'Profil untuk akun ini sudah ada.';
  END IF;

  IF user_role NOT IN ('OWNER', 'KARYAWAN', 'GUDANG') THEN
    RAISE EXCEPTION 'Role tidak valid. Hanya OWNER, KARYAWAN, atau GUDANG.';
  END IF;

  INSERT INTO public.users (id, email, name, role)
  VALUES (user_id, user_email, user_name, user_role);
END;
$$;

-- Pastikan constraint role sudah include GUDANG
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('OWNER', 'KARYAWAN', 'GUDANG'));
