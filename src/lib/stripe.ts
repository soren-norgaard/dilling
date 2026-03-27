import Stripe from "stripe";

// ---- Configuration ----

export const PAYMENT_MODE =
  (process.env.NEXT_PUBLIC_PAYMENT_MODE as "stripe" | "demo") ??
  (process.env.PAYMENT_MODE as "stripe" | "demo") ??
  "demo";

const isStripeEnabled = PAYMENT_MODE === "stripe" && !!process.env.STRIPE_SECRET_KEY;

// Lazy-init Stripe client only when needed
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
    });
  }
  return _stripe;
}

// ---- Types ----

export interface CheckoutLineItem {
  name: string;
  description?: string;
  quantity: number;
  priceInCents: number;
  currency: string;
  imageUrl?: string;
}

export interface CreateCheckoutResult {
  sessionId: string;
  url: string;
}

export interface DemoCheckoutResult {
  paymentId: string;
  status: "succeeded";
}

// ---- Checkout ----

/**
 * Create a Stripe Checkout Session for Dilling orders.
 */
export async function createStripeCheckoutSession(
  orderId: string,
  lineItems: CheckoutLineItem[],
  shippingCostCents: number,
  currency: string,
  options?: {
    customerEmail?: string;
    customerId?: string;
  }
): Promise<CreateCheckoutResult> {
  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types: ["card"],
    metadata: { orderId },
    line_items: lineItems.map((item) => ({
      price_data: {
        currency: currency.toLowerCase(),
        unit_amount: item.priceInCents,
        product_data: {
          name: item.name,
          description: item.description,
          ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
        },
      },
      quantity: item.quantity,
    })),
    ...(shippingCostCents > 0
      ? {
          shipping_options: [
            {
              shipping_rate_data: {
                type: "fixed_amount" as const,
                fixed_amount: {
                  amount: shippingCostCents,
                  currency: currency.toLowerCase(),
                },
                display_name: "Standard Shipping",
              },
            },
          ],
        }
      : {}),
    success_url: `${baseUrl}/orders/${orderId}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/orders/${orderId}?cancelled=true`,
  };

  if (options?.customerId) {
    sessionParams.customer = options.customerId;
  } else if (options?.customerEmail) {
    sessionParams.customer_email = options.customerEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return {
    sessionId: session.id,
    url: session.url!,
  };
}

/**
 * Verify a Stripe webhook signature.
 */
export function constructStripeEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

/**
 * Retrieve a Checkout Session by ID.
 */
export async function getCheckoutSession(
  sessionId: string,
  expand?: string[]
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: expand ?? [],
  });
}

// ---- Demo Payments ----

/**
 * Simulate a payment in demo mode.
 */
export async function processDemoPayment(
  orderId: string,
  _amount: number,
  _currency: string
): Promise<DemoCheckoutResult> {
  await new Promise((r) => setTimeout(r, 800));
  return {
    paymentId: `demo_pay_${orderId}_${Date.now()}`,
    status: "succeeded",
  };
}

export { isStripeEnabled };
