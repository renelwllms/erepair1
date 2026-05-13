"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function getErrorMessage(error: string | null) {
  switch (error) {
    case "Configuration":
      return "The Google sign-in configuration is not valid. Check the OAuth client ID, client secret, and redirect URI.";
    case "AccessDenied":
      return "This Google account is not allowed to sign in.";
    case "OAuthCallback":
    case "Callback":
      return "Google could not complete sign-in. Check the OAuth client secret and callback URL.";
    default:
      return "Google sign-in could not be completed. Local email/password login is still available.";
  }
}

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <CardTitle>Google Sign-in Failed</CardTitle>
          <CardDescription>{getErrorMessage(error)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={() => router.push("/auth/login")}>
            <LogIn className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Google Sign-in Failed</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
