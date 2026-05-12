import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessQuote } from "@/lib/access-control";
import { z } from "zod";
import { addDays } from "date-fns";

export const dynamic = 'force-dynamic';

// Validation schema for quote update
const quoteUpdateSchema = z.object({
  quoteItems: z.array(z.object({
    id: z.string().optional(),
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalPrice: z.number(),
  })).optional(),
  subtotal: z.number().optional(),
  taxRate: z.number().optional(),
  taxAmount: z.number().optional(),
  totalAmount: z.number().optional(),
  notes: z.string().optional(),
  validDays: z.number().optional(),
});

// GET /api/quotes/[id] - Get a single quote with all details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quote = await db.quote.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        job: {
          select: {
            id: true,
            jobNumber: true,
            applianceType: true,
            applianceBrand: true,
            modelNumber: true,
            issueDescription: true,
            status: true,
          },
        },
        issuedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        quoteItems: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (!(await canAccessQuote(session.user, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Error fetching quote:", error);
    return NextResponse.json({ error: "Failed to fetch quote" }, { status: 500 });
  }
}

// PUT /api/quotes/[id] - Update a quote
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and TECHNICIAN can update quotes
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = quoteUpdateSchema.parse(body);

    // Check if quote exists
    const existingQuote = await db.quote.findUnique({
      where: { id: params.id },
    });

    if (!existingQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (!(await canAccessQuote(session.user, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow editing DRAFT or SENT quotes
    if (existingQuote.status !== "DRAFT" && existingQuote.status !== "SENT") {
      return NextResponse.json(
        { error: "Can only edit draft or sent quotes" },
        { status: 400 }
      );
    }

    // If quote items are provided, delete old items and create new ones
    if (validatedData.quoteItems) {
      await db.quoteItem.deleteMany({
        where: { quoteId: params.id },
      });

      await db.quoteItem.createMany({
        data: validatedData.quoteItems.map(item => ({
          quoteId: params.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          itemType: "PART",
        })),
      });
    }

    // Update quote
    const updateData: any = {
      notes: validatedData.notes,
    };

    if (validatedData.subtotal !== undefined) updateData.subtotal = validatedData.subtotal;
    if (validatedData.taxRate !== undefined) updateData.taxRate = validatedData.taxRate;
    if (validatedData.taxAmount !== undefined) updateData.taxAmount = validatedData.taxAmount;
    if (validatedData.totalAmount !== undefined) updateData.totalAmount = validatedData.totalAmount;

    if (validatedData.validDays !== undefined) {
      updateData.validUntil = addDays(new Date(), validatedData.validDays);
    }

    const quote = await db.quote.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: true,
        job: true,
        quoteItems: true,
        issuedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(quote);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating quote:", error);
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
  }
}
