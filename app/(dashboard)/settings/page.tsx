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
import { Loader2, Mail, Building, CheckCircle, XCircle, Info, Upload, QrCode, FileText, Image as ImageIcon, Edit, Trash2, Plus } from "lucide-react";
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
  taxRate: z.number().min(0).max(100).optional(),
  laborHourlyRate: z.number().min(0).optional(),
  termsAndConditions: z.string().optional(),

  // SMTP Settings
  smtpHost: z.string().optional(),
  smtpPort: z.number().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFromEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  smtpFromName: z.string().optional(),
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
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [submitJobUrl, setSubmitJobUrl] = useState("");
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateFormData, setTemplateFormData] = useState({ name: "", subject: "", body: "", description: "", isActive: true });

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
          taxRate: data.taxRate || 0,
          laborHourlyRate: data.laborHourlyRate || 0,
          termsAndConditions: data.termsAndConditions || "",
          smtpHost: data.smtpHost || "",
          smtpPort: data.smtpPort || 587,
          smtpUser: data.smtpUser || "",
          smtpPassword: "", // Don't populate password for security
          smtpFromEmail: data.smtpFromEmail || "",
          smtpFromName: data.smtpFromName || "",
        });

        // Set logo preview if exists
        if (data.companyLogo) {
          setLogoPreview(data.companyLogo);
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
            <TabsTrigger value="invoice">
              <FileText className="h-4 w-4 mr-2" />
              Invoice & Terms
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
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      step="0.01"
                      {...register("taxRate", { valueAsNumber: true })}
                      placeholder="8.5"
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
                <CardTitle>SMTP Configuration</CardTitle>
                <CardDescription>
                  Configure email server settings for sending notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Email settings configured here will override environment variables.
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
                        Templates support variables: {{"{{"}}customerName{{"}}"}}, {{"{{"}}jobNumber{{"}}"}}, {{"{{"}}applianceBrand{{"}}"}}, {{"{{"}}applianceType{{"}}"}}, {{"{{"}}issueDescription{{"}}"}}, {{"{{"}}companyName{{"}}"}}
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
                  placeholder="Your Repair Status - {{"{{"}}jobNumber{{"}}"}}"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-body">Email Body (HTML)</Label>
                <textarea
                  id="template-body"
                  value={templateFormData.body}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, body: e.target.value })}
                  className="w-full min-h-[300px] px-3 py-2 text-sm border rounded-md font-mono"
                  placeholder="<p>Dear {{"{{"}}customerName{{"}}"}},</p>..."
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
