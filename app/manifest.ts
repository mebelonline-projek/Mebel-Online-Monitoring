import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getPwaIconUrls } from "@/lib/store-logo";
import { getStoreSettings } from "@/lib/store-queries";

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
    background_color: "#1a1a2e",
    theme_color: "#800000",
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
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
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
