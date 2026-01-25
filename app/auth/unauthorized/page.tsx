"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Phone, Wrench, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [logoTimestamp, setLogoTimestamp] = useState(Date.now());

  useEffect(() => {
    // Fetch company logo from public settings
    fetch("/api/public/settings")
      .then((res) => res.json())
      .then((data) => {
        setCompanyLogo(data.companyLogo);
        setLogoTimestamp(Date.now());
      })
      .catch((error) => {
        console.error("Failed to fetch settings:", error);
      })
      .finally(() => {
        setSettingsLoading(false);
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 flex flex-col items-center">
          {settingsLoading ? (
            <div className="flex items-center justify-center w-44 h-44">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
          ) : companyLogo ? (
            <div className="flex items-center justify-center w-44 h-44">
              <img
                src={`${companyLogo}?t=${logoTimestamp}`}
                alt="Company Logo"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-600">
              <Wrench className="h-8 w-8 text-white" />
            </div>
          )}
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mt-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-center">Access Restricted</CardTitle>
          <CardDescription className="text-center">
            This system is only available to authorized Erepair staff members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Phone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900">Need Access?</h3>
                <p className="text-sm text-blue-800 mt-1">
                  If you require access to this system, please contact Erepair support
                </p>
                <a
                  href="tel:0800334376"
                  className="text-lg font-bold text-blue-600 hover:text-blue-800 mt-2 block"
                >
                  0800 334 376
                </a>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Only email addresses with the @erepair.co.nz domain are authorized to access this system</p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push("/auth/login")}
          >
            Return to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
