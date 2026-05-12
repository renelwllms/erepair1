import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { geocodeAddress, detectCalloutLocation } from "@/lib/geocoding";
import { sendEmail } from "@/lib/email";
import { calloutBookingConfirmationEmail } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const bookingSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(5, "Please enter a complete address"),
  city: z.string().min(1, "City is required"),
  postcode: z.string().min(4, "Valid postcode required"),
  serviceDescription: z.string().min(10, "Please provide more details"),
  preferredDate: z.string().min(1, "Preferred date is required"),
  preferredContactMethod: z.enum(["EMAIL", "PHONE"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = bookingSchema.parse(body);

    // 1. Get settings for callout locations and geocoding
    const settings = await db.settings.findFirst();
    if (!settings || !settings.calloutLocations) {
      return NextResponse.json(
        { error: "Callout service not configured" },
        { status: 500 }
      );
    }

    const locations = JSON.parse(settings.calloutLocations);

    // 2. Geocode address
    const geocodeResult = await geocodeAddress(
      `${data.address}, ${data.city}, ${data.postcode}`,
      settings.geocodingApiKey || ""
    );

    if (!geocodeResult) {
      return NextResponse.json(
        { error: "Unable to verify address. Please check and try again." },
        { status: 400 }
      );
    }

    // 3. Detect location and fee
    const detectedLocation = detectCalloutLocation(
      geocodeResult.lat,
      geocodeResult.lng,
      locations
    );

    if (!detectedLocation) {
      return NextResponse.json(
        { error: "Address is outside our service area" },
        { status: 400 }
      );
    }

    // 4. Find or create customer (same pattern as submit-job)
    let customer = await db.customer.findFirst({
      where: { phone: data.phone }
    });

    if (!customer) {
      customer = await db.customer.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          zipCode: data.postcode,
          customerType: "RESIDENTIAL",
        }
      });
    } else {
      // Update customer with latest info
      customer = await db.customer.update({
        where: { id: customer.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          address: data.address,
          city: data.city,
          zipCode: data.postcode,
        }
      });
    }

    // 5. Get or create system user
    let systemUser = await db.user.findUnique({
      where: { email: "system@erepair.com" }
    });

    if (!systemUser) {
      // Create system user (one-time setup)
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("system-password-not-used", 10);

      systemUser = await db.user.create({
        data: {
          email: "system@erepair.com",
          password: hashedPassword,
          firstName: "System",
          lastName: "User",
          role: "ADMIN",
        }
      });
    }

    // 6. Generate job number
    const lastJob = await db.job.findFirst({
      orderBy: { createdAt: "desc" },
      select: { jobNumber: true }
    });

    let nextNumber = 1;
    if (lastJob) {
      const match = lastJob.jobNumber.match(/\d+/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    const jobNumber = `${settings.jobNumberPrefix}${String(nextNumber).padStart(5, "0")}`;

    // 7. Create job with callout flag
    const job = await db.job.create({
      data: {
        jobNumber,
        jobType: "CALLOUT_REPAIR",
        customerId: customer.id,
        applianceBrand: "N/A",
        applianceType: "Callout Service",
        issueDescription: data.serviceDescription,
        priority: "MEDIUM",
        status: "OPEN",
        createdById: systemUser.id,
        isCallout: true,
        calloutLocation: detectedLocation.name,
        calloutFee: detectedLocation.fee,
        calloutAddress: `${data.address}, ${data.city}, ${data.postcode}`,
        preferredCalloutDate: new Date(data.preferredDate),
        customerNotes: `Preferred contact: ${data.preferredContactMethod}`,
      }
    });

    // 8. Create status history
    await db.jobStatusHistory.create({
      data: {
        jobId: job.id,
        status: "OPEN",
        notes: "Callout booking submitted via customer portal",
      }
    });

    // 9. Create communication log
    await db.communication.create({
      data: {
        jobId: job.id,
        direction: "INBOUND",
        channel: "IN_PERSON",
        subject: "Callout booking submission",
        message: `Customer requested callout service for ${data.serviceDescription}. Preferred date: ${data.preferredDate}. Contact method: ${data.preferredContactMethod}`,
      }
    });

    // 10. Send confirmation email
    try {
      const emailContent = calloutBookingConfirmationEmail({
        jobNumber,
        customerName: `${customer.firstName} ${customer.lastName}`,
        calloutDate: data.preferredDate,
        calloutLocation: detectedLocation.name,
        calloutFee: detectedLocation.fee,
        address: `${data.address}, ${data.city}`,
        serviceDescription: data.serviceDescription,
        companyName: settings.companyName,
      });

      await sendEmail({
        to: customer.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        emailType: "JOB_CONFIRMATION",
        relatedId: job.id,
        sentById: systemUser.id,
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't fail the booking if email fails
    }

    return NextResponse.json({
      success: true,
      jobNumber,
      jobId: job.id,
      calloutFee: detectedLocation.fee,
      calloutLocation: detectedLocation.name,
      message: "Callout booking submitted successfully. We'll contact you within 2 business hours to confirm the exact time.",
    });

  } catch (error: any) {
    console.error("Callout booking error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid form data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to book callout" },
      { status: 500 }
    );
  }
}
