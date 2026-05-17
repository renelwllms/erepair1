import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const toDate = (value: string | null, fallback: Date) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

// GET /api/reports?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const endDate = toDate(searchParams.get("end"), new Date());
    const startDate = toDate(searchParams.get("start"), new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);

    const invoices = await db.invoice.findMany({
      where: {
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        customerId: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        jobId: true,
      },
    });

    const refunds = await (db as any).refund.findMany({
      where: {
        refundDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            customerId: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const jobsInRange = await db.job.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
        assignedTechnicianId: true,
        assignedTechnician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        customerId: true,
      },
    });

    const completedJobs = await db.job.findMany({
      where: {
        status: "CLOSED",
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        assignedTechnicianId: true,
        assignedTechnician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        customerId: true,
      },
    });

    const grossRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const grossPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalRefunds = refunds.reduce(
      (sum: number, refund: any) => sum + Number(refund.amount || 0),
      0
    );
    const totalRevenue = grossRevenue - totalRefunds;
    const totalPaid = grossPaid - totalRefunds;
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);
    const invoiceCount = invoices.length;
    const avgInvoice = invoiceCount ? grossRevenue / invoiceCount : 0;

    const totalJobs = jobsInRange.length;
    const completedCount = completedJobs.length;
    const completionRate = totalJobs ? (completedCount / totalJobs) * 100 : 0;
    const avgCompletionDays = completedCount
      ? completedJobs.reduce((sum, job) => {
          const diff = (job.updatedAt.getTime() - job.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return sum + diff;
        }, 0) / completedCount
      : 0;

    const technicianMap = new Map<string, {
      id: string;
      name: string;
      completedJobs: number;
      openJobs: number;
      totalCompletionDays: number;
    }>();

    const registerTech = (job: typeof completedJobs[number], isCompleted: boolean) => {
      if (!job.assignedTechnicianId || !job.assignedTechnician) return;
      const id = job.assignedTechnicianId;
      const name = `${job.assignedTechnician.firstName} ${job.assignedTechnician.lastName}`;
      if (!technicianMap.has(id)) {
        technicianMap.set(id, { id, name, completedJobs: 0, openJobs: 0, totalCompletionDays: 0 });
      }
      const entry = technicianMap.get(id)!;
      if (isCompleted) {
        entry.completedJobs += 1;
        const diff = (job.updatedAt.getTime() - job.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        entry.totalCompletionDays += diff;
      } else {
        entry.openJobs += 1;
      }
    };

    completedJobs.forEach((job) => registerTech(job, true));
    jobsInRange
      .filter((job) => job.status !== "CLOSED")
      .forEach((job) => registerTech(job as any, false));

    const technicians = Array.from(technicianMap.values()).map((entry) => ({
      id: entry.id,
      name: entry.name,
      completedJobs: entry.completedJobs,
      openJobs: entry.openJobs,
      avgCompletionDays: entry.completedJobs
        ? entry.totalCompletionDays / entry.completedJobs
        : 0,
    }));

    const customerMap = new Map<string, {
      id: string;
      name: string;
      email: string;
      totalRevenue: number;
      invoiceCount: number;
      jobCount: number;
    }>();

    invoices.forEach((inv) => {
      if (!inv.customer) return;
      const id = inv.customerId;
      if (!customerMap.has(id)) {
        customerMap.set(id, {
          id,
          name: `${inv.customer.firstName} ${inv.customer.lastName}`,
          email: inv.customer.email,
          totalRevenue: 0,
          invoiceCount: 0,
          jobCount: 0,
        });
      }
      const entry = customerMap.get(id)!;
      entry.totalRevenue += inv.totalAmount;
      entry.invoiceCount += 1;
    });

    refunds.forEach((refund: any) => {
      const customer = refund.invoice?.customer;
      if (!customer) return;
      const id = refund.invoice.customerId;
      if (!customerMap.has(id)) {
        customerMap.set(id, {
          id,
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          totalRevenue: 0,
          invoiceCount: 0,
          jobCount: 0,
        });
      }
      const entry = customerMap.get(id)!;
      entry.totalRevenue -= Number(refund.amount || 0);
    });

    jobsInRange.forEach((job) => {
      const entry = customerMap.get(job.customerId);
      if (entry) {
        entry.jobCount += 1;
      }
    });

    const customers = Array.from(customerMap.values()).map((entry) => ({
      id: entry.id,
      name: entry.name,
      email: entry.email,
      totalRevenue: entry.totalRevenue,
      invoiceCount: entry.invoiceCount,
      jobCount: entry.jobCount,
      avgInvoice: entry.invoiceCount ? entry.totalRevenue / entry.invoiceCount : 0,
    }));

    customers.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return NextResponse.json({
      range: {
        startDate,
        endDate,
      },
      financial: {
        grossRevenue,
        grossPaid,
        totalRefunds,
        netRevenue: totalRevenue,
        netPaid: totalPaid,
        totalRevenue,
        totalPaid,
        totalOutstanding,
        invoiceCount,
        avgInvoice,
      },
      jobs: {
        totalJobs,
        completedJobs: completedCount,
        completionRate,
        avgCompletionDays,
      },
      technicians,
      customers,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
