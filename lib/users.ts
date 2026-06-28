"use server";

import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/types/common";
import { createClient } from "@supabase/supabase-js";

// ============================================================
// Types
// ============================================================
export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "KARYAWAN";
  created_at: string;
}

// ============================================================
// Helper: Buat admin Supabase client (pakai service_role key)
// ============================================================
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================
// LIST — Ambil semua users (pakai admin client biar bypass RLS)
// ============================================================
export async function getUsers(): Promise<UserRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id, email, name, role, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================================
// CREATE — Tambah user baru (Owner only)
// ============================================================
export async function createUser(formData: {
  email: string;
  password: string;
  name: string;
  role: "KARYAWAN";
}): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const supabase = await createServerSupabaseClient();

    // Cek role — hanya OWNER
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "OWNER") {
      return { success: false, message: "Hanya Owner yang bisa menambah user" };
    }

    // Validasi input
    if (!formData.email || !formData.email.includes("@")) {
      return { success: false, message: "Email tidak valid" };
    }
    if (!formData.password || formData.password.length < 6) {
      return { success: false, message: "Password minimal 6 karakter" };
    }
    if (!formData.name || formData.name.length < 2) {
      return { success: false, message: "Nama minimal 2 karakter" };
    }

    // Buat user lewat Auth admin (skip email confirmation)
    const adminClient = createAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
      user_metadata: { name: formData.name, role: formData.role },
    });

    if (authError) {
      return { success: false, message: authError.message };
    }

    // Insert langsung ke tabel users (admin client bypass RLS)
    const { error: insertError } = await adminClient
      .from("users")
      .insert({
        id: authData.user.id,
        email: formData.email,
        name: formData.name,
        role: formData.role,
      });

    if (insertError) {
      // Hapus user auth jika gagal insert profile
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { success: false, message: `Gagal membuat profil: ${insertError.message}` };
    }

    revalidatePath("/pengaturan/user");
    return { success: true, message: `User "${formData.name}" berhasil ditambahkan sebagai ${formData.role}` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan saat menambah user",
    };
  }
}

// ============================================================
// UPDATE — Update nama/role user (Owner only)
// ============================================================
export async function updateUser(
  id: string,
  formData: { name: string; role: "OWNER" | "KARYAWAN" }
): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const adminClient = createAdminClient();

    // Cek role — pakai admin client biar bisa baca users
    const { data: profile } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "OWNER") {
      return { success: false, message: "Hanya Owner yang bisa mengubah user" };
    }

    // Cegah Owner mengubah dirinya sendiri
    if (id === user.id) {
      return { success: false, message: "Tidak bisa mengubah akun Anda sendiri" };
    }

    const { error } = await adminClient
      .from("users")
      .update({ name: formData.name, role: formData.role })
      .eq("id", id);

    if (error) return { success: false, message: error.message };

    revalidatePath("/pengaturan/user");
    return { success: true, message: "User berhasil diupdate" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}

// ============================================================
// DELETE — Hapus user (Owner only)
// ============================================================
export async function deleteUser(id: string): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const adminClient = createAdminClient();

    // Cek role
    const { data: profile } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "OWNER") {
      return { success: false, message: "Hanya Owner yang bisa menghapus user" };
    }

    // Cegah hapus diri sendiri
    if (id === user.id) {
      return { success: false, message: "Tidak bisa menghapus akun Anda sendiri" };
    }

    // Dapatkan nama user untuk pesan
    const { data: targetUser } = await adminClient
      .from("users")
      .select("name, email")
      .eq("id", id)
      .single();

    if (!targetUser) {
      return { success: false, message: "User tidak ditemukan" };
    }

    // Hapus dari tabel users dulu
    const { error: deleteError } = await adminClient
      .from("users")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return { success: false, message: `Gagal menghapus user: ${deleteError.message}` };
    }

    // Hapus dari Auth
    const { error: authError } = await adminClient.auth.admin.deleteUser(id);
    if (authError) {
      return { success: false, message: `User dihapus dari tabel tapi gagal dari Auth: ${authError.message}` };
    }

    revalidatePath("/pengaturan/user");
    return { success: true, message: `User "${targetUser.name}" berhasil dihapus` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan",
    };
  }
}