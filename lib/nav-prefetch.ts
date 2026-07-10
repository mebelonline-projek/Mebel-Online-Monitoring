/** Routes that trigger heavy server work — skip Link prefetch to avoid blocking active navigation. */
export function shouldPrefetchNav(href: string): boolean {
  const heavyPrefixes = [
    "/kasir",
    "/transaksi",
    "/piutang",
    "/dashboard/karyawan",
    "/dashboard/owner",
    "/operasional",
    "/invoice",
  ];
  return !heavyPrefixes.some((prefix) => href === prefix || href.startsWith(`${prefix}/`));
}
