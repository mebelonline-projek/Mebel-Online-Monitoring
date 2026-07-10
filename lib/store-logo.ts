/** Logo default aplikasi (SVG bingkai furnitur) */
export const DEFAULT_LOGO = "/logo.svg";

export const PWA_ICON_PATHS = {
  icon192: "/icons/icon-192.png",
  icon512: "/icons/icon-512.png",
} as const;

export function resolveStoreLogoUrl(logoUrl: string | null | undefined): string {
  return logoUrl || DEFAULT_LOGO;
}

/** URL icon PWA — dari storage toko jika sudah di-upload, else default statis */
export function getPwaIconUrls(logoUrl: string | null | undefined): {
  icon192: string;
  icon512: string;
} {
  if (logoUrl && (logoUrl.includes("/logos/") || logoUrl.includes("supabase"))) {
    const base = logoUrl.includes("/logo.webp")
      ? logoUrl.replace(/\/logo\.webp$/, "")
      : logoUrl.substring(0, logoUrl.lastIndexOf("/"));
    return {
      icon192: `${base}/pwa/icon-192.png`,
      icon512: `${base}/pwa/icon-512.png`,
    };
  }
  return { ...PWA_ICON_PATHS };
}
