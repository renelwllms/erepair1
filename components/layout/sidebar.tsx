"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Wrench,
  Package,
  Settings,
  BarChart3,
  Calendar,
  Receipt,
  MapPinned,
} from "lucide-react";
import { UserRole } from "@prisma/client";
import { useState, useEffect } from "react";

interface SidebarProps {
  userRole: UserRole;
}

interface CompanySettings {
  companyName: string;
  companyLogo: string | null;
}

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "TECHNICIAN", "CUSTOMER"],
  },
  {
    title: "Jobs",
    href: "/jobs",
    icon: Briefcase,
    roles: ["ADMIN", "TECHNICIAN"],
  },
  {
    title: "Field Service",
    href: "/dashboard/field-service",
    icon: MapPinned,
    roles: ["ADMIN", "TECHNICIAN"],
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
    roles: ["ADMIN", "TECHNICIAN"],
  },
  {
    title: "Quotes",
    href: "/quotes",
    icon: Receipt,
    roles: ["ADMIN", "TECHNICIAN"],
  },
  {
    title: "Invoices",
    href: "/invoices",
    icon: FileText,
    roles: ["ADMIN", "TECHNICIAN"],
  },
  {
    title: "Parts",
    href: "/parts",
    icon: Package,
    roles: ["ADMIN", "TECHNICIAN"],
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: Calendar,
    roles: ["ADMIN", "TECHNICIAN"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["ADMIN"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    companyName: "E-Repair",
    companyLogo: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [logoTimestamp, setLogoTimestamp] = useState(Date.now());

  useEffect(() => {
    // Fetch company settings (logo and name)
    fetch("/api/public/settings")
      .then((res) => res.json())
      .then((data) => {
        setCompanySettings({
          companyName: data.companyName || "E-Repair",
          companyLogo: data.companyLogo || null,
        });
        setLogoTimestamp(Date.now()); // Update timestamp when logo is fetched
      })
      .catch((error) => {
        console.error("Error fetching company settings:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const mobileNavItems = filteredNavItems.filter((item) =>
    ["/dashboard", "/jobs", "/dashboard/field-service", "/customers", "/invoices"].includes(item.href)
  );

  return (
    <>
    <div className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
      <div className="p-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center justify-center">
          {companySettings.companyLogo ? (
            <div className="flex items-center justify-center h-16 w-full px-2">
              <img
                src={`${companySettings.companyLogo}?t=${logoTimestamp}`}
                alt={companySettings.companyName}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600">
              <Wrench className="h-6 w-6 text-white" />
            </div>
          )}
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          v1.0.0
        </div>
      </div>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.title === "Field Service" ? "Field" : item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
