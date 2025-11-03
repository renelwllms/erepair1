import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Validation schema
const settingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  companyPhone: z.string().optional(),
  companyAddress: z.string().optional(),
  companyLogo: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  laborHourlyRate: z.number().min(0).optional(),
  termsAndConditions: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFromEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  smtpFromName: z.string().optional(),
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
          smtpHost: "",
          smtpPort: 587,
          smtpUser: "",
          smtpPassword: "",
          smtpFromEmail: "",
          smtpFromName: "",
        },
      });
    }

    // Don't send password to frontend
    const { smtpPassword, ...settingsWithoutPassword } = settings;

    return NextResponse.json(settingsWithoutPassword);
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
      taxRate: validatedData.taxRate || 0,
      laborHourlyRate: validatedData.laborHourlyRate || 0,
      termsAndConditions: validatedData.termsAndConditions || null,
      smtpHost: validatedData.smtpHost || null,
      smtpPort: validatedData.smtpPort || 587,
      smtpUser: validatedData.smtpUser || null,
      smtpFromEmail: validatedData.smtpFromEmail || null,
      smtpFromName: validatedData.smtpFromName || null,
    };

    // Only update password if provided (not empty)
    if (validatedData.smtpPassword && validatedData.smtpPassword.trim() !== "") {
      updateData.smtpPassword = validatedData.smtpPassword;
    }

    let settings;

    if (existingSettings) {
      // Update existing settings
      settings = await db.settings.update({
        where: { id: existingSettings.id },
        data: updateData,
      });
    } else {
      // Create new settings if none exist
      settings = await db.settings.create({
        data: updateData,
      });
    }

    // Don't send password to frontend
    const { smtpPassword, ...settingsWithoutPassword } = settings;

    return NextResponse.json(settingsWithoutPassword);
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
