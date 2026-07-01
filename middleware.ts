// ============================================================
// 🛡️ MIDDLEWARE — Versi Ringan
// ============================================================
// HANYA cek cookie session — tidak panggil API Supabase.
// Auth verifikasi dilakukan di client-side layout.
// Hemat RAM & lebih cepat.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {

  const { pathname } = request.nextUrl;

  // 1. Skip file statis
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Halaman publik — bebas akses
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/lupa-password"
  ) {
    return NextResponse.next();
  }

  // 3. Cek apakah ada cookie Supabase session
  const allCookies = request.cookies.getAll();
  const hasSessionCookie = allCookies.some((c) => c.name.startsWith("sb-"));

  if (!hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
