-- ============================================================
-- FIX: anon EXECUTE pada create_user_profile & get_user_role
-- Linter 0028 sering tetap flag karena default GRANT ke PUBLIC.
-- Pola: REVOKE ALL FROM PUBLIC → GRANT ulang ke authenticated saja.
--
-- JANGAN revoke dari authenticated (registrasi + RLS rusak).
-- rls_auto_enable & leaked password: tetap ditoleransi.
-- ============================================================

-- get_user_role
REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO service_role;

-- create_user_profile
REVOKE ALL ON FUNCTION public.create_user_profile(uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_user_profile(uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_user_profile(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile(uuid, text, text, text) TO service_role;

-- rls_auto_enable (ulang; warning mungkin tetap — false positive)
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
