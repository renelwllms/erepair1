import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Public routes
  const publicRoutePrefixes = [
    "/auth/login",
    "/auth/register",
    "/auth/error",
    "/auth/unauthorized",
    "/submit-job",
    "/track-job",
    "/qr-code",
    "/qr-print",
    "/book-callout",
    "/terms-and-conditions",
    "/quote/accept",
    "/quote/reject",
  ];
  const publicAssetPrefixes = [
    "/apple-touch-icon.png",
    "/branding",
    "/favicon.png",
    "/icons",
    "/images",
    "/manifest.json",
    "/sw.js",
    "/uploads",
    "/workbox-",
  ];
  const isPublicRoute =
    pathname === "/" ||
    publicRoutePrefixes.some((route) => pathname.startsWith(route)) ||
    publicAssetPrefixes.some((route) => pathname.startsWith(route));

  // Customer portal routes (accessible via QR code)
  const isCustomerPortal = pathname.startsWith("/portal");

  // API routes that should be public
  const isPublicApi = pathname.startsWith("/api/auth") || pathname.startsWith("/api/portal") || pathname.startsWith("/api/public");

  // Allow public routes
  if (isPublicRoute || isPublicApi || isCustomerPortal) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes
  const adminRoutes = ["/admin", "/settings", "/users"];
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  if (isAdminRoute && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
