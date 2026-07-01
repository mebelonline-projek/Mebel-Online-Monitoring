import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 🚀 Optimasi bundle: exclude library besar dari client bundle
  // ⚡ Router Cache: halaman dynamic di-cache 30 detik di client
  //    → navigasi bolak-balik antar menu INSTANT dari cache
  //    → setelah 30 detik, background revalidate otomatis
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
    ],
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },

  // Konfigurasi header keamanan
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [],
  },
};

export default nextConfig;