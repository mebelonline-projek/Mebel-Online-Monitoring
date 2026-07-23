// ============================================================
// ⚙️ STORE SETTINGS — Server Actions
// ============================================================
// CRUD pengaturan toko: nama, alamat, telepon, upload logo.
// Logo otomatis dikompresi ke WebP kualitas 90%.
// Logo lama dihapus dari storage sebelum upload baru.
// ============================================================

"use server";

import { createServerSupabaseClient, getCurrentUser, getUserProfile } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/types/common";
import { getStoreSettings, type StoreSettings } from "@/lib/store-queries";
import { generatePwaIconsFromBuffer } from "@/lib/pwa-icons";
import { processStoreLogoBuffer } from "@/lib/process-store-logo";

// ============================================================
// UPDATE — Update data toko (nama, alamat, telepon)
// ============================================================
export async function updateStoreSettings(
  prevState: ActionState<StoreSettings>,
  formData: FormData,
): Promise<ActionState<StoreSettings>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Silakan login terlebih dahulu" };

    const profile = await getUserProfile();
    if (profile?.role !== "OWNER") {
      return { success: false, message: "Hanya Owner yang bisa mengubah pengaturan toko" };
    }

    const storeName = formData.get("store_name") as string;
    const address = formData.get("address") as string;
    const phone = formData.get("phone") as string;

    if (!storeName || storeName.trim().length < 3) {
      return { success: false, message: "Nama toko minimal 3 karakter" };
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("store_settings")
      .update({
        store_name: storeName.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prevState.data?.id || "")
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Gagal menyimpan pengaturan toko");

    revalidatePath("/pengaturan");
    return {
      success: true,
      message: "Pengaturan toko berhasil disimpan",
      data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal menyimpan pengaturan toko",
    };
  }
}

// ============================================================
// UPLOAD LOGO — Upload logo ke Supabase Storage
// ============================================================
// 1. Hapus logo lama dari storage (jika ada)
// 2. Kompres file ke WebP kualitas 90% pakai sharp
// 3. Upload file WebP ke storage
// 4. Update store_settings.logo_url
// ============================================================
export async function uploadLogo(
  prevState: ActionState<{ logo_url: string }>,
  formData: FormData,
): Promise<ActionState<{ logo_url: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Silakan login terlebih dahulu" };

    const profile = await getUserProfile();
    if (profile?.role !== "OWNER") {
      return { success: false, message: "Hanya Owner yang bisa mengubah logo toko" };
    }

    const file = formData.get("logo") as File;
    if (!file || file.size === 0) {
      return { success: false, message: "Pilih file logo terlebih dahulu" };
    }

    // Validasi tipe file
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, message: "Tipe file harus PNG, JPG, atau WebP" };
    }

    const supabase = await createServerSupabaseClient();

    // ============================================================
    // STEP 1: Hapus logo lama dari storage (jika ada)
    // ============================================================
    const currentSettings = await getStoreSettings();
    const settingsId = currentSettings?.id || "";
    let oldLogoPath: string | null = null;

    if (currentSettings?.logo_url) {
      // Cek apakah logo_url mengarah ke storage atau default
      const isFromStorage = currentSettings.logo_url.includes("supabase") || 
                            currentSettings.logo_url.includes("/logos/");
      if (isFromStorage) {
        oldLogoPath = currentSettings.logo_url.split("/logos/").pop() || null;
        if (oldLogoPath) {
          await supabase.storage.from("logos").remove([oldLogoPath]);
        }
      }
    }

    // ============================================================
    // STEP 2: Kompres ke WebP kualitas 90%
    // ============================================================
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const webpBuffer = await processStoreLogoBuffer(fileBuffer);

    // ============================================================
    // STEP 3: Upload file WebP ke storage
    // ============================================================
    const fileName = `logo.webp`; // Selalu nama yang sama (overwrite)
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(filePath, webpBuffer, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: true, // Upsert karena kita overwrite logo yang sudah ada
      });

    if (uploadError) throw new Error(uploadError.message);

    // Dapatkan public URL
    const { data: urlData } = supabase.storage
      .from("logos")
      .getPublicUrl(filePath);

    const logoUrl = urlData.publicUrl;

    // ============================================================
    // STEP 4: Update store_settings dengan logo_url baru
    // ============================================================
    const { error: updateError } = await supabase
      .from("store_settings")
      .update({
        logo_url: logoUrl,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settingsId);

    if (updateError) throw new Error(updateError.message);

    const { icon192, icon512 } = await generatePwaIconsFromBuffer(webpBuffer);
    await Promise.all([
      supabase.storage.from("logos").upload("pwa/icon-192.png", icon192, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: true,
      }),
      supabase.storage.from("logos").upload("pwa/icon-512.png", icon512, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: true,
      }),
    ]);

    revalidatePath("/pengaturan");
    return {
      success: true,
      message: "Logo berhasil diupload dan dikompresi ke WebP 90%",
      data: { logo_url: logoUrl },
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal upload logo",
    };
  }
}

// ============================================================
// RESET LOGO — Reset ke logo default
// ============================================================
export async function resetLogo(): Promise<ActionState<null>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Silakan login terlebih dahulu" };

    const profile = await getUserProfile();
    if (profile?.role !== "OWNER") {
      return { success: false, message: "Hanya Owner yang bisa mereset logo" };
    }

    const supabase = await createServerSupabaseClient();

    // Ambil data settings yang ada (termasuk id)
    const currentSettings = await getStoreSettings();
    const settingsId = currentSettings?.id || "";

    if (
      currentSettings?.logo_url &&
      !currentSettings.logo_url.includes("logo.svg") &&
      !currentSettings.logo_url.includes("logo.png")
    ) {
      const oldPath = currentSettings.logo_url.split("/logos/").pop();
      if (oldPath) {
        await supabase.storage.from("logos").remove([oldPath]);
      }
    }

    await supabase.storage.from("logos").remove(["pwa/icon-192.png", "pwa/icon-512.png"]);

    // Set logo_url ke null (frontend fallback ke /logo.png)
    const { error: updateError } = await supabase
      .from("store_settings")
      .update({
        logo_url: null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settingsId);

    if (updateError) throw new Error(updateError.message);

    revalidatePath("/pengaturan");
    return {
      success: true,
      message: "Logo berhasil direset ke default",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mereset logo",
    };
  }
}