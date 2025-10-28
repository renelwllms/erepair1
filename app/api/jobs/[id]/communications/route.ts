import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Validation schema for communication
const communicationSchema = z.object({
  direction: z.enum(["INBOUND", "OUTBOUND"]),
  channel: z.enum(["EMAIL", "SMS", "PHONE", "IN_PERSON"]),
  subject: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

// POST /api/jobs/[id]/communications - Add a communication log entry
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and TECHNICIAN can add communications
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = communicationSchema.parse(body);

    // Check if job exists
    const job = await db.job.findUnique({
      where: { id: params.id },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Create communication entry
    const communication = await db.communication.create({
      data: {
        jobId: params.id,
        direction: validatedData.direction,
        channel: validatedData.channel,
        subject: validatedData.subject,
        message: validatedData.message,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(communication, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating communication:", error);
    return NextResponse.json(
      { error: "Failed to create communication" },
      { status: 500 }
    );
  }
}
