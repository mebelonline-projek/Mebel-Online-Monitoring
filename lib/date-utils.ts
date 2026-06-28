// ============================================================
// 📅 DATE UTILS — WIB (Asia/Jakarta)
// ============================================================

const WIB_TIMEZONE = "Asia/Jakarta";

/** Tanggal hari ini dalam WIB, format YYYY-MM-DD */
export function getWibDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: WIB_TIMEZONE }).format(date);
}

/** Awal dan akhir hari dalam WIB (ISO string dengan offset +07:00) */
export function getWibDayBounds(date: Date = new Date()): {
  dateStr: string;
  start: string;
  end: string;
} {
  const dateStr = getWibDateString(date);
  return {
    dateStr,
    start: `${dateStr}T00:00:00+07:00`,
    end: `${dateStr}T23:59:59.999+07:00`,
  };
}
