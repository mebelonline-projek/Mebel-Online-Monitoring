// ============================================================
// 📏 CONSTANTS
// ============================================================
// Semua konstanta aplikasi di sini — jangan hardcode magic numbers.
// ============================================================

// --- Pagination ---
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// --- Breakpoints (sama dengan Tailwind) ---
export const BREAKPOINTS = {
  MOBILE: 640,
  TABLET: 1024,
  DESKTOP: 1280,
} as const;

// --- Ukuran file upload (dalam bytes) ---
export const FILE_LIMITS = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ] as readonly string[],
} as const;

// --- Status umum ---
export const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

// --- Waktu ---
export const TIMEOUT = {
  TOAST_DURATION: 4000, // ms
  DEBOUNCE: 300, // ms
  ANIMATION: 200, // ms
} as const;

// --- Route publik (tidak perlu auth) ---
export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
] as const;

// --- Rate limiting ---
export const RATE_LIMIT = {
  MAX_REQUESTS: 100, // per window
  WINDOW_MS: 60 * 1000, // 1 menit
} as const;