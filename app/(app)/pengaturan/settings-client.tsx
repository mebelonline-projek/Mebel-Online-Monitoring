// ============================================================
// ⚙️ SETTINGS CLIENT — Form info toko + upload logo
// ============================================================

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateStoreSettings, uploadLogo, resetLogo } from "@/lib/settings";
import type { StoreSettings } from "@/lib/store-queries";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { StoreLogo } from "@/components/shared/store-logo";
import { useStore } from "@/components/providers/store-context";

interface Props {
  settings: StoreSettings | null;
  profileRole: string;
}

export function SettingsClient({ settings, profileRole }: Props) {
  const router = useRouter();
  const { setStoreLogo, setStoreName, refreshStore } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOwner = profileRole === "OWNER";

  const [storeName, setStoreNameLocal] = useState(settings?.store_name || "");
  const [address, setAddress] = useState(settings?.address || "");
  const [phone, setPhone] = useState(settings?.phone || "");
  const [logoUrl, setLogoUrl] = useState<string | null>(settings?.logo_url ?? null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const handleSave = async () => {
    if (!storeName || storeName.trim().length < 3) {
      toast.error("Nama toko minimal 3 karakter");
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("store_name", storeName);
      formData.append("address", address);
      formData.append("phone", phone);

      const result = await updateStoreSettings(
        { success: true, data: settings || undefined },
        formData,
      );

      if (result.success) {
        toast.success(result.message || "Pengaturan toko berhasil disimpan");
        setStoreName(storeName.trim());
        router.refresh();
      } else {
        toast.error(result.message || "Gagal menyimpan pengaturan");
      }
    } catch {
      toast.error("Gagal menyimpan pengaturan toko");
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================
  // UPLOAD LOGO
  // ============================================================
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipe file harus PNG, JPG, atau WebP");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validasi ukuran
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const result = await uploadLogo(
        { success: true, data: { logo_url: logoUrl || "" } },
        formData,
      );

      if (result.success && result.data?.logo_url) {
        toast.success("Logo berhasil diupload");
        setLogoUrl(result.data.logo_url);
        setStoreLogo(result.data.logo_url);
        await refreshStore();
        router.refresh();
      } else {
        toast.error(result.message || "Gagal upload logo");
      }
    } catch {
      toast.error("Gagal upload logo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ============================================================
  // RESET LOGO
  // ============================================================
  const handleResetLogo = async () => {
    setIsResetting(true);
    try {
      const result = await resetLogo();
      if (result.success) {
        toast.success("Logo berhasil direset ke default");
        setResetDialogOpen(false);
        setLogoUrl(null);
        setStoreLogo(null);
        await refreshStore();
        router.refresh();
      } else {
        toast.error(result.message || "Gagal mereset logo");
      }
    } catch {
      toast.error("Gagal mereset logo");
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="space-y-8">
      {/* Logout */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-destructive hover:text-destructive">
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>

      {/* ============================== */}
      {/* Logo Section */}
      {/* ============================== */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Logo Toko</h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Logo Preview */}
          <StoreLogo src={logoUrl} alt="Logo Toko" size="xl" />

          <div className="space-y-3 flex-1">
            {/* Upload Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleUploadLogo}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  isOwner
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Mengupload...
                  </>
                ) : (
                  <>
                    📤 Upload Logo Baru
                  </>
                )}
              </label>
              {!isOwner && (
                <p className="text-xs text-muted-foreground mt-1">
                  Hanya Owner yang bisa mengubah logo
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Format: PNG, JPG, atau WebP. Maksimal 2MB.
            </p>

            {/* Reset Button */}
            {isOwner && logoUrl && (
              <button
                onClick={() => setResetDialogOpen(true)}
                className="text-xs text-destructive hover:underline cursor-pointer"
              >
                🗑️ Reset ke logo default
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================== */}
      {/* Info Toko Section */}
      {/* ============================== */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Informasi Toko</h2>

        <div className="space-y-4">
          {/* Nama Toko */}
          <div>
            <label className="block text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1.5">
              Nama Toko <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreNameLocal(e.target.value)}
              className="dark-input w-full"
              placeholder="Nama toko Anda"
              disabled={!isOwner}
            />
          </div>

          {/* Alamat */}
          <div>
            <label className="block text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1.5">
              Alamat
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="dark-input w-full min-h-[80px] resize-y"
              placeholder="Alamat toko"
              disabled={!isOwner}
            />
          </div>

          {/* Telepon */}
          <div>
            <label className="block text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1.5">
              Telepon
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="dark-input w-full"
              placeholder="Nomor telepon toko"
              disabled={!isOwner}
            />
          </div>

          {/* Submit Button */}
          {isOwner && (
            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={isSaving || !storeName || storeName.trim().length < 3}
                className="btn-maroon cursor-pointer"
              >
                {isSaving ? "⏳ Menyimpan..." : "💾 Simpan Pengaturan"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================== */}
      {/* Reset Logo Confirmation Dialog */}
      {/* ============================== */}
      {resetDialogOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
          <div className="bg-card border border-border rounded-xl shadow-sm max-w-[420px] p-6 w-full">
            <h2 className="text-lg font-bold mb-2">Reset Logo</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Yakin ingin mereset logo ke default? Logo yang sudah diupload akan dihapus.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResetDialogOpen(false)}
                className="btn-dark cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleResetLogo}
                disabled={isResetting}
                className="btn-maroon bg-destructive cursor-pointer"
              >
                {isResetting ? "⏳ Mereset..." : "Ya, Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}