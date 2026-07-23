"use server";

import { getCurrentUser } from "@/lib/supabase-server";
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
  role: "OWNER" | "KARYAWAN" | "GUDANG";
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
  role: "KARYAWAN" | "GUDANG";
}): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const adminClient = createAdminClient();

    // Cek role — hanya OWNER
    const { data: profile, error: profileError } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "OWNER") {
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
// UPDATE — Update nama/role/password user (Owner only)
// Password opsional: isi jika Owner mau reset sandi karyawan/gudang.
// ============================================================
export async function updateUser(
  id: string,
  formData: {
    name: string;
    role: "KARYAWAN" | "GUDANG";
    password?: string;
  }
): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Anda harus login" };

    const adminClient = createAdminClient();

    const { data: profile, error: profileError } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "OWNER") {
      return { success: false, message: "Hanya Owner yang bisa mengubah user" };
    }

    if (id === user.id) {
      return { success: false, message: "Tidak bisa mengubah akun Anda sendiri" };
    }

    if (!formData.name || formData.name.trim().length < 2) {
      return { success: false, message: "Nama minimal 2 karakter" };
    }

    if (formData.role !== "KARYAWAN" && formData.role !== "GUDANG") {
      return { success: false, message: "Role harus Karyawan atau Gudang" };
    }

    const password = formData.password?.trim() || "";
    if (password && password.length < 6) {
      return { success: false, message: "Password minimal 6 karakter" };
    }

    const { data: targetUser, error: targetError } = await adminClient
      .from("users")
      .select("id, name, role")
      .eq("id", id)
      .maybeSingle();

    if (targetError || !targetUser) {
      return { success: false, message: "User tidak ditemukan" };
    }

    if (targetUser.role === "OWNER") {
      return { success: false, message: "Tidak bisa mengubah akun Owner lain" };
    }

    const { error } = await adminClient
      .from("users")
      .update({ name: formData.name.trim(), role: formData.role })
      .eq("id", id);

    if (error) return { success: false, message: error.message };

    // Sync Auth: metadata role/nama + password opsional (reset sandi)
    const authUpdate: {
      user_metadata: { name: string; role: string };
      password?: string;
    } = {
      user_metadata: { name: formData.name.trim(), role: formData.role },
    };
    if (password) {
      authUpdate.password = password;
    }

    const { error: authError } = await adminClient.auth.admin.updateUserById(id, authUpdate);
    if (authError) {
      return {
        success: false,
        message: `Profil tersimpan, tapi gagal update Auth: ${authError.message}`,
      };
    }

    revalidatePath("/pengaturan/user");
    return {
      success: true,
      message: password
        ? "User berhasil diupdate (password diganti)"
        : "User berhasil diupdate",
    };
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
    const { data: profile, error: profileError } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "OWNER") {
      return { success: false, message: "Hanya Owner yang bisa menghapus user" };
    }

    // Cegah hapus diri sendiri
    if (id === user.id) {
      return { success: false, message: "Tidak bisa menghapus akun Anda sendiri" };
    }

    // Dapatkan nama user untuk pesan
    const { data: targetUser, error: targetError } = await adminClient
      .from("users")
      .select("name, email, role")
      .eq("id", id)
      .maybeSingle();

    if (targetError || !targetUser) {
      return { success: false, message: "User tidak ditemukan" };
    }

    if (targetUser.role === "OWNER") {
      return { success: false, message: "Tidak bisa menghapus akun Owner" };
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