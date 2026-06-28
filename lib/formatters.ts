// ============================================================
// 💰 FORMATTERS
// ============================================================
// Fungsi untuk format tanggal, uang, angka — biar konsisten.
// ============================================================

/**
 * Format angka ke format mata uang Rupiah.
 * Contoh: 10000 → "Rp 10.000"
 */
export function formatCurrency(
  amount: number,
  options?: { compact?: boolean },
): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: options?.compact ? 0 : 2,
    notation: options?.compact ? "compact" : "standard",
  }).format(amount);
}

/**
 * Format tanggal ke format Indonesia.
 * Contoh: "2024-01-15" → "15 Januari 2024"
 */
export function formatDate(
  date: Date | string | number,
  options?: {
    withTime?: boolean;
    short?: boolean;
  },
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;

  const dateStyle: Intl.DateTimeFormatOptions["dateStyle"] = options?.short
    ? "short"
    : "long";

  if (options?.withTime) {
    return d.toLocaleDateString("id-ID", {
      dateStyle,
      timeStyle: "short",
    });
  }

  return d.toLocaleDateString("id-ID", { dateStyle });
}

/**
 * Format angka dengan pemisah ribuan.
 * Contoh: 1000000 → "1.000.000"
 */
export function formatNumber(
  value: number,
  options?: {
    decimals?: number;
    compact?: boolean;
  },
): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: options?.decimals ?? 0,
    maximumFractionDigits: options?.decimals ?? 0,
    notation: options?.compact ? "compact" : "standard",
  }).format(value);
}

/**
 * Format persentase.
 * Contoh: 0.85 → "85%"
 */
export function formatPercentage(value: number, decimals?: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "percent",
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 0,
  }).format(value);
}

/**
 * Truncate string dengan ellipsis.
 * Contoh: "Hello World", 5 → "Hello..."
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length).trimEnd() + "...";
}