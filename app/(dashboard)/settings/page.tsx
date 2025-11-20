"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Building, CheckCircle, XCircle, Info, Upload, QrCode, FileText, Image as ImageIcon, Edit, Trash2, Plus, Database, Palette, Bell } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Validation schema for settings
const settingsSchema = z.object({
  // Business Info
  companyName: z.string().min(1, "Company name is required"),
  companyEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  companyPhone: z.string().optional(),
  companyAddress: z.string().optional(),
  companyLogo: z.string().optional(),
  companyFavicon: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  laborHourlyRate: z.number().min(0).optional(),
  termsAndConditions: z.string().optional(),

  // Theme Settings
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),

  // Email Settings
  emailProvider: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFromEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  smtpFromName: z.string().optional(),

  // Office 365 Settings
  office365ClientId: z.string().optional(),
  office365ClientSecret: z.string().optional(),
  office365TenantId: z.string().optional(),

  // Google Workspace Settings
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),

  // Notification Settings
  notificationReminderDays: z.number().min(1).max(30).optional(),
  quoteReminderDays: z.number().min(1).max(30).optional(),
  quoteReminderFrequency: z.number().min(1).max(30).optional(),
  quoteMaxReminders: z.number().min(1).max(10).optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [emailProvider, setEmailProvider] = useState("SMTP");
  const [submitJobUrl, setSubmitJobUrl] = useState("");
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateFormData, setTemplateFormData] = useState({ name: "", subject: "", body: "", description: "", isActive: true });
  const [databaseInfo, setDatabaseInfo] = useState<any>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadEmailTemplates();
    loadDatabaseInfo();
    // Set submit job URL for QR code
    if (typeof window !== "undefined") {
      setSubmitJobUrl(`${window.location.origin}/submit-job`);
    }
  }, []);

  const loadEmailTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch("/api/email-templates");
      if (response.ok) {
        const data = await response.json();
        setEmailTemplates(data);
      }
    } catch (error) {
      console.error("Error loading email templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const url = editingTemplate
        ? `/api/email-templates/${editingTemplate.id}`
        : "/api/email-templates";
      const method = editingTemplate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateFormData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Template ${editingTemplate ? "updated" : "created"} successfully`,
        });
        setShowTemplateDialog(false);
        setEditingTemplate(null);
        setTemplateFormData({ name: "", subject: "", body: "", description: "", isActive: true });
        loadEmailTemplates();
      } else {
        throw new Error("Failed to save template");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`/api/email-templates/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Template deleted successfully",
        });
        loadEmailTemplates();
      } else {
        throw new Error("Failed to delete template");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setTemplateFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      description: template.description || "",
      isActive: template.isActive,
    });
    setShowTemplateDialog(true);
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateFormData({ name: "", subject: "", body: "", description: "", isActive: true });
    setShowTemplateDialog(true);
  };

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        reset({
          companyName: data.companyName || "",
          companyEmail: data.companyEmail || "",
          companyPhone: data.companyPhone || "",
          companyAddress: data.companyAddress || "",
          companyLogo: data.companyLogo || "",
          companyFavicon: data.companyFavicon || "",
          taxRate: data.taxRate || 15,
          laborHourlyRate: data.laborHourlyRate || 0,
          termsAndConditions: data.termsAndConditions || "",

          // Theme settings
          primaryColor: data.primaryColor || "#2563eb",
          secondaryColor: data.secondaryColor || "#64748b",
          accentColor: data.accentColor || "#0ea5e9",

          // Email settings
          emailProvider: data.emailProvider || "SMTP",
          smtpHost: data.smtpHost || "",
          smtpPort: data.smtpPort || 587,
          smtpUser: data.smtpUser || "",
          smtpPassword: "", // Don't populate password for security
          smtpFromEmail: data.smtpFromEmail || "",
          smtpFromName: data.smtpFromName || "",

          // Office 365 settings
          office365ClientId: data.office365ClientId || "",
          office365ClientSecret: "", // Don't populate secrets
          office365TenantId: data.office365TenantId || "",

          // Google Workspace settings
          googleClientId: data.googleClientId || "",
          googleClientSecret: "", // Don't populate secrets

          // Notification settings
          notificationReminderDays: data.notificationReminderDays || 3,
          quoteReminderDays: data.quoteReminderDays || 3,
          quoteReminderFrequency: data.quoteReminderFrequency || 3,
          quoteMaxReminders: data.quoteMaxReminders || 3,
        });

        // Set previews if exists
        if (data.companyLogo) {
          setLogoPreview(data.companyLogo);
        }
        if (data.companyFavicon) {
          setFaviconPreview(data.companyFavicon);
        }
        if (data.emailProvider) {
          setEmailProvider(data.emailProvider);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadDatabaseInfo = async () => {
    try {
      const response = await fetch("/api/settings/database");
      if (response.ok) {
        const data = await response.json();
        setDatabaseInfo(data);
      }
    } catch (error) {
      console.error("Failed to load database info:", error);
    }
  };

  const testDatabaseConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const response = await fetch("/api/settings/database", {
        method: "POST",
      });
      const result = await response.json();
      setConnectionTestResult(result);

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setConnectionTestResult({
        success: false,
        message: "Failed to test connection",
      });
      toast({
        title: "Error",
        description: "Failed to test database connection",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Settings saved successfully",
        });
        await loadSettings();
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File too large. Maximum size is 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch("/api/settings/upload-logo", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setLogoPreview(result.path);
        // Update the form field with the new logo path
        const currentValues = watch();
        reset({ ...currentValues, companyLogo: result.path });

        toast({
          title: "Success",
          description: "Logo uploaded successfully",
        });
      } else {
        throw new Error(result.error || "Failed to upload logo");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type - favicons should be ICO, PNG, or SVG
    const allowedTypes = ["image/x-icon", "image/vnd.microsoft.icon", "image/png", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Invalid file type. Use ICO, PNG, or SVG for favicons",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 1MB for favicons)
    if (file.size > 1 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File too large. Maximum size is 1MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingFavicon(true);

    try {
      const formData = new FormData();
      formData.append("favicon", file);

      const response = await fetch("/api/settings/upload-favicon", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setFaviconPreview(result.path);
        const currentValues = watch();
        reset({ ...currentValues, companyFavicon: result.path });

        toast({
          title: "Success",
          description: "Favicon uploaded successfully",
        });
      } else {
        throw new Error(result.error || "Failed to upload favicon");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload favicon",
        variant: "destructive",
      });
    } finally {
      setIsUploadingFavicon(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail }),
      });

      const result = await response.json();
      setTestResult(result);

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "Failed to send test email. Please check your configuration.",
      });
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure system settings and preferences</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs defaultValue="business" className="space-y-4">
          <TabsList>
            <TabsTrigger value="business">
              <Building className="h-4 w-4 mr-2" />
              Business Info
            </TabsTrigger>
            <TabsTrigger value="theme">
              <Palette className="h-4 w-4 mr-2" />
              Theme & Branding
            </TabsTrigger>
            <TabsTrigger value="invoice">
              <FileText className="h-4 w-4 mr-2" />
              Invoice & Terms
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="portal">
              <QrCode className="h-4 w-4 mr-2" />
              Customer Portal
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email Configuration
            </TabsTrigger>
            <TabsTrigger value="email-templates">
              <FileText className="h-4 w-4 mr-2" />
              Email Templates
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="h-4 w-4 mr-2" />
              Database
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                  Your company details for invoices and communications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload Section */}
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="flex items-start gap-4">
                    {logoPreview && (
                      <div className="w-32 h-32 border rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                        <img
                          src={logoPreview}
                          alt="Company Logo"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          id="logo-upload"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={isUploadingLogo}
                        />
                        <label
                          htmlFor="logo-upload"
                          className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                        >
                          {isUploadingLogo ? (
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                          ) : (
                            <Upload className="h-8 w-8 text-gray-400" />
                          )}
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-700">
                              {isUploadingLogo ? "Uploading..." : "Click to upload logo"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              PNG, JPG, GIF or WebP (max 5MB)
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    This logo will appear on your invoices and documents
                  </p>
                </div>

                {/* Favicon Upload Section */}
                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <div className="flex items-start gap-4">
                    {faviconPreview && (
                      <div className="w-16 h-16 border rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                        <img
                          src={faviconPreview}
                          alt="Favicon"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          id="favicon-upload"
                          accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml"
                          onChange={handleFaviconUpload}
                          className="hidden"
                          disabled={isUploadingFavicon}
                        />
                        <label
                          htmlFor="favicon-upload"
                          className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                        >
                          {isUploadingFavicon ? (
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                          ) : (
                            <Upload className="h-8 w-8 text-gray-400" />
                          )}
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-700">
                              {isUploadingFavicon ? "Uploading..." : "Click to upload favicon"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              ICO, PNG, or SVG (max 1MB, recommended: 32x32px)
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    This icon will appear in browser tabs and bookmarks
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      {...register("companyName")}
                      placeholder="E-Repair Shop"
                    />
                    {errors.companyName && (
                      <p className="text-sm text-red-600 mt-1">{errors.companyName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="companyEmail">Company Email</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      {...register("companyEmail")}
                      placeholder="info@erepair.com"
                    />
                    {errors.companyEmail && (
                      <p className="text-sm text-red-600 mt-1">{errors.companyEmail.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="companyPhone">Company Phone</Label>
                    <Input
                      id="companyPhone"
                      {...register("companyPhone")}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="companyAddress">Company Address</Label>
                    <Input
                      id="companyAddress"
                      {...register("companyAddress")}
                      placeholder="123 Main St, City, State 12345"
                    />
                  </div>

                  <div>
                    <Label htmlFor="taxRate">GST Rate (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      step="0.01"
                      {...register("taxRate", { valueAsNumber: true })}
                      placeholder="15"
                    />
                  </div>

                  <div>
                    <Label htmlFor="laborHourlyRate">Labor Hourly Rate ($)</Label>
                    <Input
                      id="laborHourlyRate"
                      type="number"
                      step="0.01"
                      {...register("laborHourlyRate", { valueAsNumber: true })}
                      placeholder="75.00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="theme" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme & Branding</CardTitle>
                <CardDescription>
                  Customize the look and feel of your application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Palette className="h-4 w-4" />
                  <AlertDescription>
                    Customize your brand colors to match your business identity. Changes will be applied across the entire application.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        {...register("primaryColor")}
                        className="h-12 w-20"
                      />
                      <Input
                        type="text"
                        {...register("primaryColor")}
                        placeholder="#2563eb"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Used for primary buttons, links, and accents
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        {...register("secondaryColor")}
                        className="h-12 w-20"
                      />
                      <Input
                        type="text"
                        {...register("secondaryColor")}
                        placeholder="#64748b"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Used for secondary elements and text
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accentColor"
                        type="color"
                        {...register("accentColor")}
                        className="h-12 w-20"
                      />
                      <Input
                        type="text"
                        {...register("accentColor")}
                        placeholder="#0ea5e9"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Used for highlights and special elements
                    </p>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Preview your theme changes by saving the settings. Colors must be in hexadecimal format (e.g., #2563eb).
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoice" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Settings & Terms</CardTitle>
                <CardDescription>
                  Configure invoice appearance and set your terms and conditions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="termsAndConditions">Terms and Conditions</Label>
                  <textarea
                    id="termsAndConditions"
                    {...register("termsAndConditions")}
                    className="w-full min-h-[300px] px-3 py-2 text-sm border rounded-md font-mono"
                    placeholder="Enter your terms and conditions here. These will appear on invoices.&#10;&#10;Example:&#10;- Payment is due within 30 days&#10;- All sales are final&#10;- Warranty: 90 days on parts and labor&#10;- Customer is responsible for any damage during transport"
                  />
                  {errors.termsAndConditions && (
                    <p className="text-sm text-red-600 mt-1">{errors.termsAndConditions.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    These terms will be displayed at the bottom of all invoices
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Your terms and conditions should include payment terms, warranty information, refund policy, and any other important legal information.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification & Reminder Settings</CardTitle>
                <CardDescription>
                  Configure automatic reminders for quotes and customer notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Job Notification Reminders */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Job Notifications</h3>
                  <div className="space-y-2">
                    <Label htmlFor="notificationReminderDays">
                      Job Notification Reminder Frequency (Days)
                    </Label>
                    <Input
                      id="notificationReminderDays"
                      type="number"
                      min="1"
                      max="30"
                      {...register("notificationReminderDays", { valueAsNumber: true })}
                      placeholder="3"
                    />
                    {errors.notificationReminderDays && (
                      <p className="text-sm text-red-600">{errors.notificationReminderDays.message}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Number of days before a job needs attention reminder is triggered
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Quote Reminder Settings</h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="quoteReminderDays">
                        First Reminder After (Days)
                      </Label>
                      <Input
                        id="quoteReminderDays"
                        type="number"
                        min="1"
                        max="30"
                        {...register("quoteReminderDays", { valueAsNumber: true })}
                        placeholder="3"
                      />
                      {errors.quoteReminderDays && (
                        <p className="text-sm text-red-600">{errors.quoteReminderDays.message}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Number of days after sending a quote before the first reminder is sent
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quoteReminderFrequency">
                        Reminder Frequency (Days)
                      </Label>
                      <Input
                        id="quoteReminderFrequency"
                        type="number"
                        min="1"
                        max="30"
                        {...register("quoteReminderFrequency", { valueAsNumber: true })}
                        placeholder="3"
                      />
                      {errors.quoteReminderFrequency && (
                        <p className="text-sm text-red-600">{errors.quoteReminderFrequency.message}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Number of days between subsequent reminder emails
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quoteMaxReminders">
                        Maximum Number of Reminders
                      </Label>
                      <Input
                        id="quoteMaxReminders"
                        type="number"
                        min="1"
                        max="10"
                        {...register("quoteMaxReminders", { valueAsNumber: true })}
                        placeholder="3"
                      />
                      {errors.quoteMaxReminders && (
                        <p className="text-sm text-red-600">{errors.quoteMaxReminders.message}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Maximum number of reminder emails to send before stopping
                      </p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Automatic reminders will be sent to customers who haven&apos;t responded to quotes within the specified time frame.
                    Reminders will stop once the customer accepts, rejects, or the maximum number of reminders is reached.
                  </AlertDescription>
                </Alert>

                <Alert className="bg-blue-50 border-blue-200">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <strong>Example:</strong> With settings of 3 days first reminder, 3 days frequency, and 3 max reminders:
                    <br />• Day 0: Quote sent
                    <br />• Day 3: First reminder
                    <br />• Day 6: Second reminder
                    <br />• Day 9: Third reminder
                    <br />• After Day 9: No more reminders
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Job Submission Portal</CardTitle>
                <CardDescription>
                  Generate a QR code for customers to scan and submit repair requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Print this QR code and display it at your counter. Customers can scan it with their phones to submit repair requests directly.
                  </AlertDescription>
                </Alert>

                {/* QR Code Display */}
                <div className="flex flex-col items-center justify-center space-y-4 bg-gray-50 p-8 rounded-lg">
                  {submitJobUrl ? (
                    <>
                      <div className="bg-white p-6 rounded-xl shadow-lg border-4 border-blue-500">
                        <QRCodeSVG
                          value={submitJobUrl}
                          size={280}
                          level="H"
                          includeMargin={true}
                        />
                      </div>

                      <div className="text-center space-y-2">
                        <p className="text-lg font-semibold text-gray-900">
                          Scan to Submit a Repair Request
                        </p>
                        <p className="text-sm text-gray-600 font-mono bg-white px-4 py-2 rounded border">
                          {submitJobUrl}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.print()}
                        className="mt-4"
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Print QR Code
                      </Button>
                    </>
                  ) : (
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-3 bg-white p-4 rounded-lg border">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-600 font-bold text-xs">✓</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Automatic Customer Creation</p>
                      <p className="text-gray-600">Searches by phone number and creates new customers automatically</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white p-4 rounded-lg border">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-600 font-bold text-xs">✓</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Photo Documentation</p>
                      <p className="text-gray-600">Customers can take photos of their device before submission</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white p-4 rounded-lg border">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-600 font-bold text-xs">✓</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Instant Job Creation</p>
                      <p className="text-gray-600">Jobs are created immediately and assigned a job number</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white p-4 rounded-lg border">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-600 font-bold text-xs">✓</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Email Confirmation</p>
                      <p className="text-gray-600">Customers receive automatic confirmation emails</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>
                  Configure email provider for sending notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email Provider Selection */}
                <div className="space-y-2">
                  <Label htmlFor="emailProvider">Email Provider</Label>
                  <select
                    id="emailProvider"
                    {...register("emailProvider")}
                    onChange={(e) => setEmailProvider(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SMTP">SMTP (Custom Email Server)</option>
                    <option value="OFFICE365">Office 365</option>
                    <option value="GOOGLE_WORKSPACE">Google Workspace</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    Choose your email service provider
                  </p>
                </div>

                {/* SMTP Settings */}
                {emailProvider === "SMTP" && (
                  <>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Common providers: Gmail (smtp.gmail.com:587), Outlook (smtp.office365.com:587), SendGrid (smtp.sendgrid.net:587)
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      {...register("smtpHost")}
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      {...register("smtpPort", { valueAsNumber: true })}
                      placeholder="587"
                    />
                  </div>

                  <div>
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      id="smtpUser"
                      {...register("smtpUser")}
                      placeholder="your-email@gmail.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      {...register("smtpPassword")}
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave blank to keep existing password
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="smtpFromEmail">From Email</Label>
                    <Input
                      id="smtpFromEmail"
                      type="email"
                      {...register("smtpFromEmail")}
                      placeholder="noreply@erepair.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="smtpFromName">From Name</Label>
                    <Input
                      id="smtpFromName"
                      {...register("smtpFromName")}
                      placeholder="E-Repair Shop"
                    />
                  </div>
                </div>
                  </>
                )}

                {/* Office 365 Settings */}
                {emailProvider === "OFFICE365" && (
                  <>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        To use Office 365, you need to register an app in Azure AD and configure OAuth credentials.
                        <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                          Go to Azure Portal
                        </a>
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="office365ClientId">Client ID</Label>
                        <Input
                          id="office365ClientId"
                          {...register("office365ClientId")}
                          placeholder="Application (client) ID"
                        />
                      </div>

                      <div>
                        <Label htmlFor="office365ClientSecret">Client Secret</Label>
                        <Input
                          id="office365ClientSecret"
                          type="password"
                          {...register("office365ClientSecret")}
                          placeholder="••••••••"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Leave blank to keep existing secret
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="office365TenantId">Tenant ID</Label>
                        <Input
                          id="office365TenantId"
                          {...register("office365TenantId")}
                          placeholder="Directory (tenant) ID"
                        />
                      </div>

                      <div>
                        <Label htmlFor="smtpFromEmail">From Email</Label>
                        <Input
                          id="smtpFromEmail"
                          type="email"
                          {...register("smtpFromEmail")}
                          placeholder="noreply@yourcompany.com"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Google Workspace Settings */}
                {emailProvider === "GOOGLE_WORKSPACE" && (
                  <>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        To use Google Workspace, you need to create OAuth credentials in Google Cloud Console.
                        <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                          Go to Google Cloud
                        </a>
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="googleClientId">Client ID</Label>
                        <Input
                          id="googleClientId"
                          {...register("googleClientId")}
                          placeholder="OAuth 2.0 Client ID"
                        />
                      </div>

                      <div>
                        <Label htmlFor="googleClientSecret">Client Secret</Label>
                        <Input
                          id="googleClientSecret"
                          type="password"
                          {...register("googleClientSecret")}
                          placeholder="••••••••"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Leave blank to keep existing secret
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="smtpFromEmail">From Email</Label>
                        <Input
                          id="smtpFromEmail"
                          type="email"
                          {...register("smtpFromEmail")}
                          placeholder="noreply@yourcompany.com"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Test Email Configuration</h4>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="test@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestEmail}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Test Email
                        </>
                      )}
                    </Button>
                  </div>

                  {testResult && (
                    <Alert className={`mt-3 ${testResult.success ? "border-green-500" : "border-red-500"}`}>
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription>{testResult.message}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email-templates" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Email Templates</CardTitle>
                    <CardDescription>
                      Manage automated email templates for job status notifications
                    </CardDescription>
                  </div>
                  <Button onClick={handleNewTemplate}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTemplates ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    <Alert className="mb-4">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Templates support variables: &lbrace;&lbrace;customerName&rbrace;&rbrace;, &lbrace;&lbrace;jobNumber&rbrace;&rbrace;, &lbrace;&lbrace;applianceBrand&rbrace;&rbrace;, &lbrace;&lbrace;applianceType&rbrace;&rbrace;, &lbrace;&lbrace;issueDescription&rbrace;&rbrace;, &lbrace;&lbrace;companyName&rbrace;&rbrace;
                      </AlertDescription>
                    </Alert>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-20">Active</TableHead>
                          <TableHead className="w-28">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emailTemplates.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell className="font-mono text-sm">{template.name}</TableCell>
                            <TableCell>{template.subject}</TableCell>
                            <TableCell className="text-sm text-gray-600">{template.description}</TableCell>
                            <TableCell>
                              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${template.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                                {template.isActive ? "Active" : "Inactive"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditTemplate(template)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteTemplate(template.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Database Configuration</CardTitle>
                <CardDescription>
                  View and manage your PostgreSQL database connection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {databaseInfo ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">Database Type</Label>
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-blue-600" />
                          <span className="font-mono text-sm">{databaseInfo.type}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">Connection Status</Label>
                        <div className="flex items-center gap-2">
                          {databaseInfo.connected ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-600 font-medium">Connected</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-sm text-red-600 font-medium">Not Connected</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">Host</Label>
                        <p className="font-mono text-sm">{databaseInfo.host || "N/A"}</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">Port</Label>
                        <p className="font-mono text-sm">{databaseInfo.port || "N/A"}</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">Database Name</Label>
                        <p className="font-mono text-sm">{databaseInfo.database || "N/A"}</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">Username</Label>
                        <p className="font-mono text-sm">{databaseInfo.username || "N/A"}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-3">Test Database Connection</h4>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={testDatabaseConnection}
                          disabled={testingConnection}
                        >
                          {testingConnection ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <Database className="h-4 w-4 mr-2" />
                              Test Connection
                            </>
                          )}
                        </Button>
                      </div>
                      {connectionTestResult && (
                        <Alert className={`mt-4 ${connectionTestResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                          {connectionTestResult.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <AlertDescription className={connectionTestResult.success ? "text-green-800" : "text-red-800"}>
                            {connectionTestResult.message}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        To change database connection settings, update the <code className="bg-gray-100 px-1 py-0.5 rounded">DATABASE_URL</code> in your <code className="bg-gray-100 px-1 py-0.5 rounded">.env</code> file and restart the application.
                      </AlertDescription>
                    </Alert>
                  </>
                ) : (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Email Template Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Edit" : "Create"} Email Template</DialogTitle>
              <DialogDescription>
                Configure the email template for automated notifications
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateFormData.name}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                  placeholder="e.g., JOB_OPEN, JOB_IN_PROGRESS"
                />
                <p className="text-xs text-gray-500">Use UPPERCASE with underscores (e.g., JOB_OPEN)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Input
                  id="template-description"
                  value={templateFormData.description}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                  placeholder="Brief description of when this template is used"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-subject">Email Subject</Label>
                <Input
                  id="template-subject"
                  value={templateFormData.subject}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, subject: e.target.value })}
                  placeholder="Your Repair Status - {{jobNumber}}"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-body">Email Body (HTML)</Label>
                <textarea
                  id="template-body"
                  value={templateFormData.body}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, body: e.target.value })}
                  className="w-full min-h-[300px] px-3 py-2 text-sm border rounded-md font-mono"
                  placeholder="<p>Dear {{customerName}},</p>..."
                />
                <p className="text-xs text-gray-500">Use HTML formatting and template variables</p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="template-active"
                  checked={templateFormData.isActive}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="template-active">Active (send emails using this template)</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTemplateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate}>
                  {editingTemplate ? "Update" : "Create"} Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => loadSettings()}
            disabled={isSaving}
          >
            Reset
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
