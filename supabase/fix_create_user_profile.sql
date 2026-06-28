-- ============================================================
-- 🛠️ FIX: Ganti search_path fungsi create_user_profile
-- ============================================================
-- Jalankan SQL INI SAJA di Supabase SQL Editor
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
SET search_path = 'public, auth'
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (user_id, user_email, user_name, user_role);
END;
$$;