import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const passwordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// POST /api/users/[id]/password - Update user password (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = passwordSchema.parse(body);

    const user = await db.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, isActive: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "User is inactive" }, { status: 400 });
    }

    if (user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Cannot update customer passwords here" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(validated.newPassword, 10);

    await db.user.update({
      where: { id: params.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating user password:", error);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
