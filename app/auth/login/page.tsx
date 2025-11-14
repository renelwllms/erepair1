"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Wrench, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    // Fetch company logo from public settings
    fetch("/api/public/settings")
      .then((res) => res.json())
      .then((data) => {
        setCompanyLogo(data.companyLogo);
      })
      .catch((error) => {
        console.error("Failed to fetch settings:", error);
      })
      .finally(() => {
        setSettingsLoading(false);
      });
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: "Error",
          description: "Invalid email or password",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }

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
                src={companyLogo}
                alt="Company Logo"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-600">
              <Wrench className="h-8 w-8 text-white" />
            </div>
          )}
          <CardDescription>
            Sign in to access your repair management dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@erepairshop.com"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Demo Credentials:</p>
            <p className="mt-1">Admin: admin@erepairshop.com / Admin@123</p>
            <p>Tech: tech@erepairshop.com / Tech@123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
