import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/track-job - Public job tracking (no auth required)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobNumber = searchParams.get("jobNumber");

    if (!jobNumber) {
      return NextResponse.json(
        { error: "Job number is required" },
        { status: 400 }
      );
    }

    // Find job by job number
    const job = await db.job.findUnique({
      where: { jobNumber: jobNumber.trim().toUpperCase() },
      select: {
        id: true,
        jobNumber: true,
        applianceType: true,
        applianceBrand: true,
        status: true,
        priority: true,
        estimatedCompletion: true,
        createdAt: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        statusHistory: {
          select: {
            status: true,
            notes: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Error tracking job:", error);
    return NextResponse.json(
      { error: "Failed to track job" },
      { status: 500 }
    );
  }
}
