import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Footer } from "@/components/layout/footer";
import { DynamicFavicon } from "@/components/dynamic-favicon";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "E-Repair Shop Management",
  description: "Modern appliance repair shop management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${inter.className} pb-16`} suppressHydrationWarning>
        <DynamicFavicon />
        <Providers>
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
