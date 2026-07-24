/** Path beranda setelah login / link Dashboard, sesuai role. */
export function getDashboardHref(role: string | null | undefined): string {
  if (role === "OWNER") return "/dashboard/owner";
  if (role === "GUDANG") return "/gudang/stok";
  if (role === "KARYAWAN") return "/dashboard/karyawan";
  return "/dashboard";
}
