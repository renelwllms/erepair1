import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/search - Search across jobs, customers, and invoices
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchTerm = query.trim();
    const searchPattern = `%${searchTerm}%`;

    // Search jobs
    const jobs = await db.job.findMany({
      where: {
        OR: [
          { jobNumber: { contains: searchTerm, mode: "insensitive" } },
          { applianceBrand: { contains: searchTerm, mode: "insensitive" } },
          { applianceType: { contains: searchTerm, mode: "insensitive" } },
          { issueDescription: { contains: searchTerm, mode: "insensitive" } },
          {
            customer: {
              OR: [
                { name: { contains: searchTerm, mode: "insensitive" } },
                { email: { contains: searchTerm, mode: "insensitive" } },
                { phone: { contains: searchTerm, mode: "insensitive" } },
              ],
            },
          },
        ],
      },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
      },
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Search customers
    const customers = await db.customer.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { email: { contains: searchTerm, mode: "insensitive" } },
          { phone: { contains: searchTerm, mode: "insensitive" } },
          { address: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      take: 10,
      orderBy: {
        name: "asc",
      },
    });

    // Search invoices
    const invoices = await db.invoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: searchTerm, mode: "insensitive" } },
          {
            job: {
              OR: [
                { jobNumber: { contains: searchTerm, mode: "insensitive" } },
                {
                  customer: {
                    name: { contains: searchTerm, mode: "insensitive" },
                  },
                },
              ],
            },
          },
        ],
      },
      include: {
        job: {
          include: {
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format results
    const results = [
      ...jobs.map((job) => ({
        type: "job" as const,
        id: job.id,
        title: `${job.jobNumber} - ${job.applianceBrand} ${job.applianceType}`,
        subtitle: job.customer?.name || "",
        status: job.status,
      })),
      ...customers.map((customer) => ({
        type: "customer" as const,
        id: customer.id,
        title: customer.name,
        subtitle: customer.email || customer.phone || "",
        status: undefined,
      })),
      ...invoices.map((invoice) => ({
        type: "invoice" as const,
        id: invoice.id,
        title: invoice.invoiceNumber,
        subtitle: invoice.job?.customer?.name || "",
        status: invoice.status,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
