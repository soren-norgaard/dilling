/**
 * PayPal REST API integration for Dilling.
 *
 * Uses PayPal Orders v2 API — no SDK dependency, just fetch.
 *
 * Environment variables:
 *   PAYPAL_CLIENT_ID       — sandbox or live client ID
 *   PAYPAL_CLIENT_SECRET   — sandbox or live secret
 *   PAYPAL_MODE            — "sandbox" | "live" (defaults to "sandbox")
 *   PAYPAL_WEBHOOK_ID      — webhook ID for signature verification
 */

const PAYPAL_MODE = (process.env.PAYPAL_MODE as "sandbox" | "live") ?? "sandbox";

const PAYPAL_BASE_URL =
  PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export const isPayPalEnabled =
  !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET;

// ---- Auth ----

let _cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _cachedToken.expiresAt) {
    return _cachedToken.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  _cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return _cachedToken.token;
}

async function paypalFetch(
  path: string,
  options: RequestInit = {}
): Promise<Record<string, unknown>> {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    console.error(`[PayPal API Error] ${options.method ?? "GET"} ${path}:`, json);
    throw new Error(json.message ?? `PayPal API error: ${res.status}`);
  }

  return json;
}

// ---- Types ----

export interface PayPalOrderResult {
  paypalOrderId: string;
  approvalUrl: string;
}

export interface PayPalCaptureResult {
  captureId: string;
  status: string;
  amount: number;
  currency: string;
}

export interface PayPalRefundResult {
  refundId: string;
  status: string;
  amount: number;
}

// ---- Create Order ----

export async function createPayPalOrder(
  orderId: string,
  amountValue: string,
  currency: string,
  description: string,
  returnUrl: string,
  cancelUrl: string
): Promise<PayPalOrderResult> {
  const data = await paypalFetch("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: orderId,
          description,
          amount: {
            currency_code: currency.toUpperCase(),
            value: amountValue,
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: returnUrl,
            cancel_url: cancelUrl,
            brand_name: "Dilling",
            landing_page: "LOGIN",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
          },
        },
      },
    }),
  });

  const approvalLink = (
    data.links as { rel: string; href: string }[] | undefined
  )?.find((l) => l.rel === "payer-action");

  if (!approvalLink) {
    throw new Error("PayPal did not return an approval URL");
  }

  return {
    paypalOrderId: data.id as string,
    approvalUrl: approvalLink.href,
  };
}

// ---- Capture Order ----

export async function capturePayPalOrder(
  paypalOrderId: string
): Promise<PayPalCaptureResult> {
  const data = await paypalFetch(
    `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    { method: "POST" }
  );

  const capture = (
    data.purchase_units as Array<{ payments?: { captures?: Array<{ id: string; status: string; amount: { value: string; currency_code: string } }> } }> | undefined
  )?.[0]?.payments?.captures?.[0];

  if (!capture) {
    throw new Error("No capture found in PayPal response");
  }

  return {
    captureId: capture.id,
    status: capture.status,
    amount: parseFloat(capture.amount.value),
    currency: capture.amount.currency_code,
  };
}

// ---- Get Order Details ----

export async function getPayPalOrder(
  paypalOrderId: string
): Promise<Record<string, unknown>> {
  return paypalFetch(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`);
}

// ---- Refunds ----

export async function issuePayPalRefund(
  captureId: string,
  amount?: number,
  currency?: string
): Promise<PayPalRefundResult> {
  const body: Record<string, unknown> = {};
  if (amount !== undefined && currency) {
    body.amount = {
      value: amount.toFixed(2),
      currency_code: currency.toUpperCase(),
    };
  }

  const data = await paypalFetch(
    `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
    { method: "POST", body: JSON.stringify(body) }
  );

  return {
    refundId: data.id as string,
    status: data.status as string,
    amount: parseFloat((data.amount as { value?: string })?.value ?? "0"),
  };
}

// ---- Webhook Verification ----

export async function verifyPayPalWebhook(
  headers: Record<string, string>,
  body: string
): Promise<Record<string, unknown>> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn("[PayPal] No PAYPAL_WEBHOOK_ID set — skipping verification");
    return JSON.parse(body);
  }

  const verifyPayload = {
    auth_algo: headers["paypal-auth-algo"],
    cert_url: headers["paypal-cert-url"],
    transmission_id: headers["paypal-transmission-id"],
    transmission_sig: headers["paypal-transmission-sig"],
    transmission_time: headers["paypal-transmission-time"],
    webhook_id: webhookId,
    webhook_event: JSON.parse(body),
  };

  const data = await paypalFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify(verifyPayload),
  });

  if (data.verification_status !== "SUCCESS") {
    throw new Error("PayPal webhook verification failed");
  }

  return verifyPayload.webhook_event;
}
