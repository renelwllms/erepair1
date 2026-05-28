import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// Validation schema
const settingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  companyPhone: z.string().optional(),
  companyAddress: z.string().optional(),
  companyLogo: z.string().optional(),
  companyFavicon: z.string().optional(),
  diagnosticFees: z.string().optional(),
  diagnosticFeeDefaultOther: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  laborHourlyRate: z.number().min(0).optional(),
  termsAndConditions: z.string().optional(),

  // Theme settings
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),

  // Email settings
  emailProvider: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFromEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  smtpFromName: z.string().optional(),

  // Office 365 settings
  office365ClientId: z.string().optional(),
  office365ClientSecret: z.string().optional(),
  office365TenantId: z.string().optional(),

  // Google Workspace settings
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),

  // Notification settings
  notificationReminderDays: z.number().min(1).max(30).optional(),
  quoteReminderDays: z.number().min(1).max(30).optional(),
  quoteReminderFrequency: z.number().min(1).max(30).optional(),
  quoteMaxReminders: z.number().min(1).max(10).optional(),

  // Callout settings
  calloutLocations: z.string().optional(),
  calloutTerms: z.string().optional(),
  officeAddress: z.string().optional(),
  officeLatitude: z.number().optional(),
  officeLongitude: z.number().optional(),
  geocodingApiKey: z.string().optional(),
  geocodingProvider: z.string().optional(),

  // Shop settings
  shopMaintenanceMode: z.boolean().optional(),
});

// GET /api/settings - Get system settings
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can view settings
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get settings (there should only be one record)
    let settings = await db.settings.findFirst();

    // If no settings exist, create default settings
    if (!settings) {
      settings = await db.settings.create({
        data: {
          companyName: "E-Repair Shop",
          companyEmail: "",
          companyPhone: "",
          companyAddress: "",
          taxRate: 0,
          laborHourlyRate: 0,
          emailProvider: "GOOGLE_WORKSPACE",
          smtpHost: "",
          smtpPort: 587,
          smtpUser: "",
          smtpPassword: "",
          smtpFromEmail: "",
          smtpFromName: "",
        },
      });
    }

    // Don't send passwords and secrets to frontend
    const {
      smtpPassword,
      office365ClientSecret,
      googleClientSecret,
      office365RefreshToken,
      googleRefreshToken,
      ...settingsWithoutSecrets
    } = settings;

    return NextResponse.json(settingsWithoutSecrets);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update system settings
export async function PUT(request: NextRequest) {
  try {
    const dbAny = db as any;
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can update settings
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = settingsSchema.parse(body);

    // Get existing settings
    const existingSettings = await db.settings.findFirst();

    // Prepare update data
    const updateData: any = {
      companyName: validatedData.companyName,
      companyEmail: validatedData.companyEmail || null,
      companyPhone: validatedData.companyPhone || null,
      companyAddress: validatedData.companyAddress || null,
      companyLogo: validatedData.companyLogo || null,
      companyFavicon: validatedData.companyFavicon || null,
      diagnosticFees: validatedData.diagnosticFees || null,
      diagnosticFeeDefaultOther:
        typeof validatedData.diagnosticFeeDefaultOther === "number"
          ? validatedData.diagnosticFeeDefaultOther
          : null,
      taxRate: validatedData.taxRate || 0,
      laborHourlyRate: validatedData.laborHourlyRate || 0,
      termsAndConditions: validatedData.termsAndConditions || null,

      // Theme settings
      primaryColor: validatedData.primaryColor || "#2563eb",
      secondaryColor: validatedData.secondaryColor || "#64748b",
      accentColor: validatedData.accentColor || "#0ea5e9",

      // Email settings
      emailProvider: validatedData.emailProvider || "GOOGLE_WORKSPACE",
      smtpHost: validatedData.smtpHost || null,
      smtpPort: validatedData.smtpPort || 587,
      smtpUser: validatedData.smtpUser || null,
      smtpFromEmail: validatedData.smtpFromEmail || null,
      smtpFromName: validatedData.smtpFromName || null,

      // Office 365 settings
      office365ClientId: validatedData.office365ClientId || null,
      office365TenantId: validatedData.office365TenantId || null,

      // Google Workspace settings
      googleClientId: validatedData.googleClientId || null,

      // Notification settings
      notificationReminderDays: validatedData.notificationReminderDays || 3,
      quoteReminderDays: validatedData.quoteReminderDays || 3,
      quoteReminderFrequency: validatedData.quoteReminderFrequency || 3,
      quoteMaxReminders: validatedData.quoteMaxReminders || 3,

      // Callout settings
      calloutLocations: validatedData.calloutLocations || null,
      calloutTerms: validatedData.calloutTerms || null,
      officeAddress: validatedData.officeAddress || null,
      officeLatitude:
        typeof validatedData.officeLatitude === "number" ? validatedData.officeLatitude : null,
      officeLongitude:
        typeof validatedData.officeLongitude === "number" ? validatedData.officeLongitude : null,
      geocodingApiKey: validatedData.geocodingApiKey || null,
      geocodingProvider: validatedData.geocodingProvider || "GOOGLE",

      // Shop settings
      shopMaintenanceMode: validatedData.shopMaintenanceMode ?? true,
    };

    // Only update passwords and secrets if provided (not empty)
    if (validatedData.smtpPassword && validatedData.smtpPassword.trim() !== "") {
      updateData.smtpPassword = validatedData.smtpPassword;
    }

    if (validatedData.office365ClientSecret && validatedData.office365ClientSecret.trim() !== "") {
      updateData.office365ClientSecret = validatedData.office365ClientSecret;
    }

    if (validatedData.googleClientSecret && validatedData.googleClientSecret.trim() !== "") {
      updateData.googleClientSecret = validatedData.googleClientSecret;
    }

    let settings;

    if (existingSettings) {
      // Update existing settings
      settings = await dbAny.settings.update({
        where: { id: existingSettings.id },
        data: updateData,
      });
    } else {
      // Create new settings if none exist
      settings = await dbAny.settings.create({
        data: updateData,
      });
    }

    // Don't send passwords and secrets to frontend
    const {
      smtpPassword,
      office365ClientSecret,
      googleClientSecret,
      office365RefreshToken,
      googleRefreshToken,
      ...settingsWithoutSecrets
    } = settings;

    return NextResponse.json(settingsWithoutSecrets);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
