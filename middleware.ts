import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Public routes
  const publicRoutes = ["/", "/auth/login", "/auth/register", "/auth/error"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Customer portal routes (accessible via QR code)
  const isCustomerPortal = pathname.startsWith("/portal");

  // API routes that should be public
  const isPublicApi = pathname.startsWith("/api/auth") || pathname.startsWith("/api/portal");

  // Allow public routes
  if (isPublicRoute || isPublicApi || isCustomerPortal) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
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
