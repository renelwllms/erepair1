"use client";

import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export default function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex min-h-16 items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-3 sm:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold text-gray-900 sm:text-xl">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-4">
        <Button variant="ghost" size="icon" className="relative hidden sm:inline-flex">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </Button>

        <div className="flex items-center gap-1 sm:gap-3">
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <div className="text-xs text-gray-500">
              <Badge variant="secondary" className="text-xs">
                {user.role}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function getPageTitle(pathname: string) {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/dashboard/field-service") return "Field Service Dashboard";
  if (pathname === "/customers") return "Customers";
  if (pathname.startsWith("/customers/")) return "Customer Details";
  if (pathname === "/jobs") return "Jobs";
  if (pathname === "/jobs/new") return "Create New Job";
  if (pathname.endsWith("/edit") && pathname.startsWith("/jobs/")) return "Edit Job";
  if (pathname.startsWith("/jobs/")) return "Job Details";
  if (pathname === "/invoices") return "Invoices";
  if (pathname === "/invoices/new") return "Create Invoice";
  if (pathname.endsWith("/edit") && pathname.startsWith("/invoices/")) return "Edit Invoice";
  if (pathname.startsWith("/invoices/")) return "Invoice Details";
  if (pathname === "/quotes") return "Quotes";
  if (pathname === "/quotes/new") return "Create Quote";
  if (pathname.endsWith("/edit") && pathname.startsWith("/quotes/")) return "Edit Quote";
  if (pathname.startsWith("/quotes/")) return "Quote Details";
  if (pathname === "/parts") return "Parts Inventory";
  if (pathname === "/reports") return "Reports & Analytics";
  if (pathname === "/settings") return "Settings";
  if (pathname === "/calendar") return "Calendar";
  if (pathname === "/shop-products") return "Shop Products";
  return "eRepair";
}
