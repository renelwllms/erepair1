import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <div className="flex min-h-dvh bg-gray-50">
      <Sidebar userRole={session.user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={session.user} />
        <main className="flex-1 bg-gray-50 p-4 pb-24 sm:p-5 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
