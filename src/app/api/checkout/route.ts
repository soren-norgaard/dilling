import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createStripeCheckoutSession, PAYMENT_MODE, processDemoPayment } from "@/lib/stripe";
import { createPayPalOrder } from "@/lib/paypal";
import { getCurrentUser } from "@/lib/auth";

const checkoutSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      size: z.string(),
      color: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
      currency: z.string().default("DKK"),
    })
  ).min(1),
  email: z.string().email(),
  shippingAddress: z.object({
    name: z.string().min(1),
    street: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1).default("DK"),
  }),
  paymentMethod: z.enum(["STRIPE", "PAYPAL", "DEMO"]),
  locale: z.enum(["DA", "EN"]).default("DA"),
  currency: z.enum(["DKK", "EUR", "SEK", "NOK", "GBP", "USD"]).default("DKK"),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid checkout data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const user = await getCurrentUser().catch(() => null);

  const totalAmount = data.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Create order in DB
  const order = await db.order.create({
    data: {
      userId: user?.id,
      email: data.email,
      status: "PENDING",
      paymentMethod: data.paymentMethod,
      paymentStatus: "PENDING",
      totalAmount,
      currency: data.currency,
      shippingAddress: data.shippingAddress,
      locale: data.locale,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unitPrice: item.price,
          currency: item.currency as "DKK" | "EUR" | "SEK" | "NOK" | "GBP" | "USD",
        })),
      },
    },
  });

  // Handle payment method
  if (data.paymentMethod === "DEMO" || PAYMENT_MODE === "demo") {
    const result = processDemoPayment(order.id, totalAmount, data.currency);
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paymentStatus: "SUCCEEDED",
        paymentIntentId: result.paymentId,
      },
    });
    return NextResponse.json({
      orderId: order.id,
      status: "paid",
      paymentId: result.paymentId,
      redirectUrl: null,
    });
  }

  if (data.paymentMethod === "STRIPE") {
    const origin = request.headers.get("origin") ?? "http://localhost:4000";
    const session = await createStripeCheckoutSession({
      orderId: order.id,
      lineItems: data.items.map((item) => ({
        name: item.productName,
        amount: Math.round(item.price * 100),
        currency: data.currency.toLowerCase(),
        quantity: item.quantity,
      })),
      successUrl: `${origin}/da/orders?success=${order.id}`,
      cancelUrl: `${origin}/da/cart?cancelled=true`,
      customerEmail: data.email,
    });

    await db.order.update({
      where: { id: order.id },
      data: { paymentIntentId: session.id },
    });

    return NextResponse.json({
      orderId: order.id,
      status: "pending",
      redirectUrl: session.url,
    });
  }

  if (data.paymentMethod === "PAYPAL") {
    const ppOrder = await createPayPalOrder({
      orderId: order.id,
      amount: totalAmount,
      currency: data.currency,
    });

    await db.order.update({
      where: { id: order.id },
      data: { paymentIntentId: ppOrder.id },
    });

    const approveLink = ppOrder.links?.find(
      (l: { rel: string }) => l.rel === "approve"
    );

    return NextResponse.json({
      orderId: order.id,
      status: "pending",
      redirectUrl: approveLink?.href ?? null,
      paypalOrderId: ppOrder.id,
    });
  }

  return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
}
