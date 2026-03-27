import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { capturePayPalOrder, verifyPayPalWebhook } from "@/lib/paypal";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  const isValid = await verifyPayPalWebhook(body, headers);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  const event = JSON.parse(body);

  if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
    const paypalOrderId = event.resource?.id;
    if (!paypalOrderId) {
      return NextResponse.json({ error: "No order ID" }, { status: 400 });
    }

    // Capture payment
    const capture = await capturePayPalOrder(paypalOrderId);

    // Find order by paymentIntentId (which stores PayPal order ID)
    const order = await db.order.findFirst({
      where: { paymentIntentId: paypalOrderId },
    });

    if (order && capture.status === "COMPLETED") {
      await db.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paymentStatus: "SUCCEEDED",
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
