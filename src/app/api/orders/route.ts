import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  const { searchParams } = request.nextUrl;
  const email = searchParams.get("email");

  if (!user && !email) {
    return NextResponse.json({ orders: [] });
  }

  const where: Record<string, unknown> = {};
  if (user) {
    where.userId = user.id;
  } else if (email) {
    where.email = email;
  }

  const orders = await db.order.findMany({
    where,
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      paymentStatus: o.paymentStatus,
      totalAmount: Number(o.totalAmount),
      currency: o.currency,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => ({
        productName: i.productName,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        currency: i.currency,
      })),
    })),
  });
}
