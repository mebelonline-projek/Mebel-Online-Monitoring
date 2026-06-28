// ============================================================
// 🔌 Supabase Server (Server-side only — Server Components, Server Actions)
// ============================================================

import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cache Supabase client per request — hemat koneksi
const getCachedSupabaseClient = cache(async () => {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY wajib diset di environment variables. Cek Vercel Dashboard → Settings → Environment Variables."
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Dapat diabaikan jika middleware handle session refresh
        }
      },
    },
  });
});

// Export wrapper untuk backward compatibility
export async function createServerSupabaseClient() {
  return getCachedSupabaseClient();
}

// ============================================================
// CACHED AUTH: Auth hanya dipanggil 1x per request.
// Layout + semua page bisa panggil ini tanpa hit ulang ke Supabase.
// ============================================================
export const getCurrentUser = cache(async () => {
  const supabase = await getCachedSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getUserProfile = cache(async () => {
  const supabase = await getCachedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, name, email, role, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return data;
});