import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          E-Repair Shop
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Modern Appliance Repair Management System
        </p>
        <div className="space-x-4">
          <Link href="/auth/login">
            <Button size="lg">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
