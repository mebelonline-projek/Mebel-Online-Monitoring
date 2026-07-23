import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getPwaIconUrls, PWA_ICON_PATHS } from "@/lib/store-logo";
import { getStoreSettings } from "@/lib/store-queries";

/** Maroon brand + cream dari logo aplikasi */
const THEME_COLOR = "#7A1F1F";
const BACKGROUND_COLOR = "#F7F1E8";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getStoreSettings();
  const icons = getPwaIconUrls(settings?.logo_url);
  const storeName = settings?.store_name || "Mebel Online";

  return {
    name: `${storeName} Monitoring`,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/kasir",
    display: "standalone",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    orientation: "any",
    icons: [
      {
        src: icons.icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icons.icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icons.icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: PWA_ICON_PATHS.apple,
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Transaksi Baru",
        short_name: "Baru",
        url: "/kasir",
        icons: [{ src: icons.icon192, sizes: "192x192" }],
      },
      {
        name: "Daftar Transaksi",
        short_name: "Transaksi",
        url: "/transaksi",
        icons: [{ src: icons.icon192, sizes: "192x192" }],
      },
    ],
  };
}
