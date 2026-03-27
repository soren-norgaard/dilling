import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { constructStripeEvent } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const event = constructStripeEvent(body, signature);
  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      await db.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          paymentStatus: "SUCCEEDED",
          paymentIntentId: session.payment_intent as string,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
