// ============================================================
// 🛡️ PROXY — Versi Ringan (Next.js 16)
// ============================================================
// HANYA cek cookie session — tidak panggil API Supabase.
// Auth verifikasi dilakukan di server layout.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/lupa-password"
  ) {
    return NextResponse.next();
  }

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
