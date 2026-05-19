import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { processDueQueuedCustomerNotifications } from "@/lib/customer-notifications";
import {
  calculateStraightLineDistanceKm,
  estimateTravelTimeFromDistance,
  getCalloutScheduledTime,
  isRunningLate,
} from "@/lib/field-service";

export const dynamic = "force-dynamic";

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const inDateRange = (value: Date | string | null | undefined, start: Date, end: Date) => {
  if (!value) return false;
  const date = new Date(value);
  return date >= start && date <= end;
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    processDueQueuedCustomerNotifications().catch((error) => {
      console.error("Error processing queued customer notifications:", error);
    });

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const dateFilter = searchParams.get("date");
    const technicianId = searchParams.get("technicianId") || "all";
    const status = searchParams.get("status") || "all";
    const priority = searchParams.get("priority") || "all";
    const suburb = searchParams.get("suburb")?.trim().toLowerCase() || "";
    const card = searchParams.get("card") || "all";
    const unassignedOnly = searchParams.get("unassignedOnly") === "true";
    const runningLateOnly = searchParams.get("runningLateOnly") === "true";
    const todayOnly = searchParams.get("todayOnly") === "true";
    const overdueOnly = searchParams.get("overdueOnly") === "true";

    const dbAny = db as any;
    const [jobs, technicians, settings] = await Promise.all([
      dbAny.job.findMany({
        where: {
          OR: [{ jobType: "CALLOUT_REPAIR" }, { isCallout: true }],
        },
        include: {
          customer: true,
          assignedTechnician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
            take: 12,
          },
          fieldNotes: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
              technician: {
                select: { firstName: true, lastName: true },
              },
            },
          },
          fieldPhotos: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          customerNotifications: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      db.user.findMany({
        where: {
          role: { in: ["ADMIN", "TECHNICIAN"] },
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      db.settings.findFirst({
        select: {
          geocodingApiKey: true,
          officeAddress: true,
          officeLatitude: true,
          officeLongitude: true,
          companyAddress: true,
        },
      }) as any,
    ]);

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const decoratedJobs = jobs.map((job: any) => {
      const fallbackDistance = calculateStraightLineDistanceKm(
        { latitude: settings?.officeLatitude, longitude: settings?.officeLongitude },
        { latitude: job.calloutLatitude, longitude: job.calloutLongitude }
      );
      const distanceFromOfficeKm =
        typeof job.distanceFromOfficeKm === "number" ? job.distanceFromOfficeKm : fallbackDistance;

      return {
        ...job,
        distanceFromOfficeKm,
        estimatedTravelTime: job.estimatedTravelTime || estimateTravelTimeFromDistance(distanceFromOfficeKm),
        travelEstimateSource: typeof job.distanceFromOfficeKm === "number" ? "GOOGLE_DISTANCE_MATRIX" : fallbackDistance ? "STRAIGHT_LINE_ESTIMATE" : null,
        scheduledAt: getCalloutScheduledTime(job)?.toISOString() || null,
        runningLate: isRunningLate(job),
      };
    });

    const counts = {
      totalToday: decoratedJobs.filter((job: any) =>
        inDateRange(job.scheduledTime || job.preferredCalloutDate || job.createdAt, todayStart, todayEnd)
      ).length,
      scheduled: decoratedJobs.filter((job: any) =>
        ["SCHEDULED", "TECHNICIAN_ASSIGNED", "READY_FOR_PICKUP"].includes(job.status)
      ).length,
      inProgress: decoratedJobs.filter((job: any) =>
        ["TECHNICIAN_ON_THE_WAY", "ARRIVED_ON_SITE", "WORK_IN_PROGRESS", "IN_PROGRESS"].includes(job.status)
      ).length,
      onTheWay: decoratedJobs.filter((job: any) => job.status === "TECHNICIAN_ON_THE_WAY").length,
      completedToday: decoratedJobs.filter((job: any) =>
        ["COMPLETED", "CLOSED"].includes(job.status) &&
        inDateRange(job.statusUpdatedAt || job.actualCompletion || job.updatedAt, todayStart, todayEnd)
      ).length,
      urgent: decoratedJobs.filter((job: any) => job.priority === "URGENT").length,
      unassigned: decoratedJobs.filter((job: any) => !job.assignedTechnicianId).length,
      runningLate: decoratedJobs.filter((job: any) => job.runningLate).length,
    };

    let filteredJobs = decoratedJobs;

    if (search) {
      filteredJobs = filteredJobs.filter((job: any) => {
        const haystack = [
          job.jobNumber,
          job.customer?.firstName,
          job.customer?.lastName,
          job.customer?.phone,
          job.calloutAddress,
          job.applianceType,
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(search);
      });
    }

    if (dateFilter) {
      const date = new Date(`${dateFilter}T00:00:00`);
      const start = startOfDay(date);
      const end = endOfDay(date);
      filteredJobs = filteredJobs.filter((job: any) =>
        inDateRange(job.scheduledTime || job.preferredCalloutDate, start, end)
      );
    }

    if (technicianId !== "all") {
      filteredJobs = filteredJobs.filter((job: any) => job.assignedTechnicianId === technicianId);
    }

    if (status !== "all") {
      filteredJobs = filteredJobs.filter((job: any) => job.status === status);
    }

    if (priority !== "all") {
      filteredJobs = filteredJobs.filter((job: any) => job.priority === priority);
    }

    if (suburb) {
      filteredJobs = filteredJobs.filter((job: any) => (job.calloutAddress || "").toLowerCase().includes(suburb));
    }

    if (unassignedOnly || card === "unassigned") {
      filteredJobs = filteredJobs.filter((job: any) => !job.assignedTechnicianId);
    }

    if (runningLateOnly || card === "runningLate") {
      filteredJobs = filteredJobs.filter((job: any) => job.runningLate);
    }

    if (todayOnly || card === "totalToday") {
      filteredJobs = filteredJobs.filter((job: any) =>
        inDateRange(job.scheduledTime || job.preferredCalloutDate || job.createdAt, todayStart, todayEnd)
      );
    }

    if (overdueOnly) {
      filteredJobs = filteredJobs.filter((job: any) => {
        const scheduledTime = getCalloutScheduledTime(job);
        return Boolean(scheduledTime && scheduledTime < now && !["COMPLETED", "CANCELLED", "CLOSED"].includes(job.status));
      });
    }

    if (card === "scheduled") {
      filteredJobs = filteredJobs.filter((job: any) => ["SCHEDULED", "TECHNICIAN_ASSIGNED", "READY_FOR_PICKUP"].includes(job.status));
    }
    if (card === "inProgress") {
      filteredJobs = filteredJobs.filter((job: any) => ["TECHNICIAN_ON_THE_WAY", "ARRIVED_ON_SITE", "WORK_IN_PROGRESS", "IN_PROGRESS"].includes(job.status));
    }
    if (card === "onTheWay") {
      filteredJobs = filteredJobs.filter((job: any) => job.status === "TECHNICIAN_ON_THE_WAY");
    }
    if (card === "completedToday") {
      filteredJobs = filteredJobs.filter((job: any) => ["COMPLETED", "CLOSED"].includes(job.status) && inDateRange(job.statusUpdatedAt || job.actualCompletion || job.updatedAt, todayStart, todayEnd));
    }
    if (card === "urgent") {
      filteredJobs = filteredJobs.filter((job: any) => job.priority === "URGENT");
    }

    return NextResponse.json({
      counts,
      jobs: filteredJobs,
      technicians,
      map: {
        googleApiKey: settings?.geocodingApiKey || null,
        officeAddress: settings?.officeAddress || settings?.companyAddress || null,
        officeLatitude: settings?.officeLatitude || null,
        officeLongitude: settings?.officeLongitude || null,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching field service dashboard:", error);
    return NextResponse.json({ error: "Failed to fetch field service dashboard" }, { status: 500 });
  }
}
