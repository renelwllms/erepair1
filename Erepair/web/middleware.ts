export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/customers/:path*", "/jobs/:path*", "/invoices/:path*", "/settings/:path*"],
};

