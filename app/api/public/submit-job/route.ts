import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { jobConfirmationEmail } from "@/lib/email-templates";
import { getDiagnosticFeeForAppliance, parseDiagnosticFees } from "@/lib/diagnostic-fees";

// Validation schema for customer job submission
const publicJobSchema = z.object({
  // Customer info
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),

  // Appliance info
  applianceBrand: z.string().min(1, "Appliance brand is required"),
  applianceType: z.string().min(1, "Appliance type is required"),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  issueDescription: z.string().min(10, "Please provide a detailed description (at least 10 characters)"),

  // Additional info
  preferredContactMethod: z.enum(["EMAIL", "PHONE"]).default("EMAIL"),
  devicePhoto: z.string().optional(), // Base64 encoded image
  website: z.string().optional(),
});

// POST /api/public/submit-job - Public job submission (no auth required)
export async function POST(request: NextRequest) {
  try {
    const dbAny = db as any;
    const body = await request.json();

    // Validate input
    const validatedData = publicJobSchema.parse(body);

    if (validatedData.website && validatedData.website.trim().length > 0) {
      return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
    }

    // Check if customer exists by phone number first, then by email
    let customer = await db.customer.findFirst({
      where: { phone: validatedData.phone },
    });

    if (!customer) {
      // Try finding by email as fallback
      customer = await db.customer.findUnique({
        where: { email: validatedData.email },
      });
    }

    if (!customer) {
      // Create new customer
      customer = await dbAny.customer.create({
        data: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email,
          phone: validatedData.phone,
          customerType: "RESIDENTIAL", // Default for public submissions
        },
      });
    } else {
      // Update customer info if changed
      customer = await dbAny.customer.update({
        where: { id: customer.id },
        data: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email,
          phone: validatedData.phone,
        },
      });
    }

    // Get or create system user for public submissions
    let systemUser = await dbAny.user.findFirst({
      where: {
        email: "system@erepair.com",
      },
    });

    if (!systemUser) {
      // Create system user if it doesn't exist
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("system-password-" + Date.now(), 10);

      systemUser = await dbAny.user.create({
        data: {
          email: "system@erepair.com",
          password: hashedPassword,
          firstName: "System",
          lastName: "Auto",
          role: "ADMIN",
          isActive: true,
        },
      });
    }

    // Generate job number
    const lastJob = await dbAny.job.findFirst({
      orderBy: { createdAt: "desc" },
      select: { jobNumber: true },
    });

    let nextNumber = 1;
    if (lastJob) {
      const match = lastJob.jobNumber.match(/JOB-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const jobNumber = `JOB-${nextNumber.toString().padStart(5, "0")}`;

    const settings = (await db.settings.findFirst({
      select: {
        diagnosticFees: true,
        diagnosticFeeDefaultOther: true,
      },
    })) as any;
    const diagnosticFeeMap = parseDiagnosticFees(settings?.diagnosticFees);
    const diagnosticFeeAmount =
      getDiagnosticFeeForAppliance(
        validatedData.applianceType,
        diagnosticFeeMap,
        settings?.diagnosticFeeDefaultOther ?? null
      ) ?? 0;

    // Create job
    const ensuredCustomer = customer as NonNullable<typeof customer>;
    const job = await dbAny.job.create({
      data: {
        jobNumber,
        customerId: ensuredCustomer.id,
        applianceBrand: validatedData.applianceBrand,
        applianceType: validatedData.applianceType,
        modelNumber: validatedData.modelNumber,
        serialNumber: validatedData.serialNumber,
        issueDescription: validatedData.issueDescription,
        priority: "MEDIUM", // Default priority for public submissions
        status: "OPEN",
        createdById: systemUser.id,
        customerNotes: `Preferred contact: ${validatedData.preferredContactMethod}`,
        beforePhotos: validatedData.devicePhoto ? [validatedData.devicePhoto] : [],
        diagnosticFeeAmount,
      },
    });

    // Create initial status history entry
    await db.jobStatusHistory.create({
      data: {
        jobId: job.id,
        status: "OPEN",
        notes: "Job submitted via customer portal",
        changedBy: systemUser.id,
      },
    });

    // Create communication log entry
    await db.communication.create({
      data: {
        jobId: job.id,
        direction: "INBOUND",
        channel: "IN_PERSON",
        subject: "Job Submitted",
        message: `Customer submitted job via QR code portal. Preferred contact: ${validatedData.preferredContactMethod}`,
        createdBy: systemUser.id,
      },
    });

    // Send email confirmation to customer
    try {
      const trackingUrl = `${request.nextUrl.origin}/track-job?jobNumber=${job.jobNumber}`;
      const emailContent = jobConfirmationEmail({
        jobNumber: job.jobNumber,
        customerName: `${ensuredCustomer.firstName} ${ensuredCustomer.lastName}`,
        applianceType: job.applianceType,
        applianceBrand: job.applianceBrand,
        issueDescription: job.issueDescription,
        trackingUrl,
      });

      await sendEmail({
        to: ensuredCustomer.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        emailType: "JOB_CONFIRMATION",
        relatedId: job.id,
        sentById: systemUser.id,
      });
    } catch (emailError) {
      // Log email error but don't fail the job creation
      console.error("Failed to send confirmation email:", emailError);
    }

    return NextResponse.json(
      {
        success: true,
        jobNumber: job.jobNumber,
        jobId: job.id,
        message: "Job submitted successfully! You will receive a confirmation email shortly.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating public job submission:", error);
    return NextResponse.json(
      { error: "Failed to submit job. Please try again or contact us directly." },
      { status: 500 }
    );
  }
}
