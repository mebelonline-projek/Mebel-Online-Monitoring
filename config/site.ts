// ============================================================
// 🏠 SITE CONFIGURATION — Mebel Online Monitoring
// ============================================================
// Semua konfigurasi website di sini, biar gak hardcode.
// AI agent: baca file INI aja kalau butuh data situs.
// ============================================================

export const siteConfig = {
  name: "Mebel Online Monitoring",
  shortName: "MebelMonitor",
  description:
    "Aplikasi manajemen keuangan toko furnitur — kelola transaksi, HPP, biaya operasional, dan pantau omzet dengan grafik real-time",

  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ogImage: "/og-image.png",

  author: {
    name: "Mebel Online Monitoring",
    email: "admin@mebelmonitor.id",
    url: "https://mebelmonitor.id",
  },

  // Navigasi utama (navbar)
  mainNav: [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Transaksi", href: "/transaksi" },
  ] as const,

  // Tautan footer
  footerLinks: [
    { title: "Kebijakan Privasi", href: "/privacy" },
    { title: "Syarat & Ketentuan", href: "/terms" },
  ] as const,

  // Social media
  social: {
    github: "https://github.com/mebelmonitoring",
  },

  // Lokalisasi
  locale: "id_ID" as const,
  lang: "id" as const,

  /** Registrasi publik owner — default off di production */
  allowPublicRegister:
    process.env.NEXT_PUBLIC_ALLOW_REGISTER === "true" ||
    process.env.NODE_ENV === "development",
} as const;

export type SiteConfig = typeof siteConfig;