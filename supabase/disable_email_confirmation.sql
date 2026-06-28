-- ============================================================
-- 🛠️ FIX: Auto-confirm semua user yang pending + disable confirm
-- ============================================================

-- 1. Confirm semua user yang sudah daftar tapi belum confirm
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmation_sent_at = now(),
    confirmed_at = COALESCE(confirmed_at, now()),
    confirmation_token = ''
WHERE email_confirmed_at IS NULL;

-- 2. Untuk user ke depan: disable confirmation requirement
--    (dijalankan satu kali, user baru langsung aktif)
--    CARA LAIN: matikan di Dashboard → Authentication → Settings