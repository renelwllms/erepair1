import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendCustomerNotificationEmail } from "@/lib/customer-notifications";
import { FIELD_SERVICE_STATUSES, isWithinQuietHours, nextQuietHoursSendTime } from "@/lib/field-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const assignmentSchema = z.object({
  action: z.literal("assign"),
  assignedTechnicianId: z.string().nullable(),
  assignmentNotes: z.string().optional(),
});

const statusSchema = z.object({
  action: z.literal("status"),
  status: z.enum(FIELD_SERVICE_STATUSES),
  notes: z.string().optional(),
});

const scheduleSchema = z.object({
  action: z.literal("schedule"),
  scheduledTime: z.string().optional(),
  calloutAddress: z.string().min(1).optional(),
  calloutLatitude: z.number().optional(),
  calloutLongitude: z.number().optional(),
  googlePlaceId: z.string().optional(),
  distanceFromOfficeKm: z.number().optional(),
  estimatedTravelTime: z.string().optional(),
  calloutAccessInstructions: z.string().optional(),
  calloutParkingNotes: z.string().optional(),
  calloutApplianceLocation: z.string().optional(),
  calloutFee: z.number().optional(),
});

const noteSchema = z.object({
  action: z.literal("note"),
  noteType: z.string().min(1),
  noteText: z.string().min(1),
  visibility: z.enum(["Internal", "Customer Visible"]).default("Internal"),
});

const photoSchema = z.object({
  action: z.literal("photo"),
  photoCategory: z.string().min(1),
  fileUrl: z.string().min(1),
  caption: z.string().optional(),
});

const notificationSchema = z.object({
  action: z.literal("notifyCustomer"),
  notificationType: z.string().default("TECHNICIAN_ON_THE_WAY"),
  message: z.string().min(1),
  overrideQuietHours: z.boolean().default(false),
  notificationId: z.string().optional(),
});

const actionSchema = z.discriminatedUnion("action", [
  assignmentSchema,
  statusSchema,
  scheduleSchema,
  noteSchema,
  photoSchema,
  notificationSchema,
]);

const getCalloutJob = async (id: string) => {
  const dbAny = db as any;
  return dbAny.job.findFirst({
    where: {
      id,
      OR: [{ jobType: "CALLOUT_REPAIR" }, { isCallout: true }],
    },
    include: {
      customer: true,
      assignedTechnician: true,
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
        },
      },
    },
  });
};

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const job = await getCalloutJob(params.id);
    if (!job) {
      return NextResponse.json({ error: "Callout job not found" }, { status: 404 });
    }

    const data = actionSchema.parse(await request.json());
    const dbAny = db as any;

    if (data.action === "assign") {
      const updated = await dbAny.job.update({
        where: { id: params.id },
        data: {
          assignedTechnicianId: data.assignedTechnicianId,
          assignedAt: data.assignedTechnicianId ? new Date() : null,
          assignedBy: data.assignedTechnicianId ? session.user.id : null,
          assignmentNotes: data.assignmentNotes || null,
          status: data.assignedTechnicianId ? "TECHNICIAN_ASSIGNED" : job.status,
          statusUpdatedAt: data.assignedTechnicianId ? new Date() : job.statusUpdatedAt,
        },
        include: {
          customer: true,
          assignedTechnician: true,
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      });

      if (data.assignedTechnicianId) {
        await dbAny.jobStatusHistory.create({
          data: {
            jobId: params.id,
            status: "TECHNICIAN_ASSIGNED",
            previousStatus: job.status,
            newStatus: "TECHNICIAN_ASSIGNED",
            notes: data.assignmentNotes || "Technician assigned",
            changedBy: session.user.id,
            changedAt: new Date(),
          },
        });
      }

      return NextResponse.json(updated);
    }

    if (data.action === "status") {
      const updated = await dbAny.job.update({
        where: { id: params.id },
        data: {
          status: data.status,
          statusUpdatedAt: new Date(),
          actualCompletion: data.status === "COMPLETED" ? new Date() : job.actualCompletion,
        },
        include: { customer: true, assignedTechnician: true },
      });

      await dbAny.jobStatusHistory.create({
        data: {
          jobId: params.id,
          status: data.status,
          previousStatus: job.status,
          newStatus: data.status,
          notes: data.notes,
          changedBy: session.user.id,
          changedAt: new Date(),
        },
      });

      return NextResponse.json(updated);
    }

    if (data.action === "schedule") {
      if (data.calloutAddress && (!data.calloutLatitude || !data.calloutLongitude || !data.googlePlaceId)) {
        return NextResponse.json(
          { error: "Select a Google Places address before saving this callout address" },
          { status: 400 }
        );
      }

      const scheduledTime = data.scheduledTime ? new Date(data.scheduledTime) : undefined;
      const updated = await dbAny.job.update({
        where: { id: params.id },
        data: {
          scheduledTime,
          scheduledDate: scheduledTime,
          preferredCalloutDate: scheduledTime,
          calloutAddress: data.calloutAddress,
          calloutLatitude: data.calloutLatitude,
          calloutLongitude: data.calloutLongitude,
          googlePlaceId: data.googlePlaceId,
          distanceFromOfficeKm: data.distanceFromOfficeKm,
          estimatedTravelTime: data.estimatedTravelTime,
          calloutAccessInstructions: data.calloutAccessInstructions,
          calloutParkingNotes: data.calloutParkingNotes,
          calloutApplianceLocation: data.calloutApplianceLocation,
          calloutFee: data.calloutFee,
          status: scheduledTime && job.status === "NEW_CALLOUT" ? "SCHEDULED" : job.status,
          statusUpdatedAt: scheduledTime && job.status === "NEW_CALLOUT" ? new Date() : job.statusUpdatedAt,
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Unsupported PATCH action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }

    console.error("Error updating field service job:", error);
    return NextResponse.json({ error: "Failed to update field service job" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const job = await getCalloutJob(params.id);
    if (!job) {
      return NextResponse.json({ error: "Callout job not found" }, { status: 404 });
    }

    const data = actionSchema.parse(await request.json());
    const dbAny = db as any;

    if (data.action === "note") {
      const note = await dbAny.jobNote.create({
        data: {
          jobId: params.id,
          technicianId: session.user.id,
          noteType: data.noteType,
          noteText: data.noteText,
          visibility: data.visibility,
        },
      });
      return NextResponse.json(note, { status: 201 });
    }

    if (data.action === "photo") {
      const photo = await dbAny.jobPhoto.create({
        data: {
          jobId: params.id,
          uploadedBy: session.user.id,
          photoCategory: data.photoCategory,
          fileUrl: data.fileUrl,
          caption: data.caption,
        },
      });
      return NextResponse.json(photo, { status: 201 });
    }

    if (data.action === "notifyCustomer") {
      const queued = isWithinQuietHours() && !data.overrideQuietHours;
      if (data.notificationId) {
        const existingNotification = await dbAny.customerNotification.findFirst({
          where: { id: data.notificationId, jobId: params.id },
        });
        if (!existingNotification) {
          return NextResponse.json({ error: "Notification does not belong to this job" }, { status: 400 });
        }
      }

      const notification = data.notificationId
        ? await dbAny.customerNotification.update({
            where: { id: data.notificationId },
            data: {
              notificationType: data.notificationType,
              recipient: job.customer.email,
              message: data.message,
              status: queued ? "QUEUED" : "PENDING",
              queuedUntil: queued ? nextQuietHoursSendTime() : null,
              sentAt: null,
            },
          })
        : await dbAny.customerNotification.create({
            data: {
              jobId: params.id,
              notificationType: data.notificationType,
              recipient: job.customer.email,
              message: data.message,
              status: queued ? "QUEUED" : "PENDING",
              queuedUntil: queued ? nextQuietHoursSendTime() : null,
              sentAt: null,
              createdBy: session.user.id,
            },
          });

      if (!queued) {
        await sendCustomerNotificationEmail({
          notificationId: notification.id,
          job,
          notificationType: data.notificationType,
          message: data.message,
          sentById: session.user.id,
        });
      }

      const updatedNotification = await dbAny.customerNotification.findUnique({
        where: { id: notification.id },
      });

      return NextResponse.json(updatedNotification, { status: 201 });
    }

    return NextResponse.json({ error: "Unsupported POST action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }

    console.error("Error creating field service record:", error);
    return NextResponse.json({ error: "Failed to create field service record" }, { status: 500 });
  }
}
