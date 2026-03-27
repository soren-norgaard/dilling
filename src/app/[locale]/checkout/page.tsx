"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCartStore } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type PaymentMethod = "STRIPE" | "PAYPAL" | "DEMO";

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const clearCart = useCartStore((s) => s.clearCart);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("DEMO");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-brand-accent">{tc("emptyCart")}</p>
        <Link href="/catalog" className="mt-4 inline-block">
          <Button variant="outline">{tc("continueShopping")}</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            price: item.price,
            currency: item.currency,
          })),
          email,
          shippingAddress: { name, street, city, postalCode, country: "DK" },
          paymentMethod,
          locale: "DA",
          currency: "DKK",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Checkout failed");
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        clearCart();
        router.push(`/orders?success=${data.orderId}`);
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* Form */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Contact */}
          <div className="rounded-xl border border-border bg-surface-raised p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Email</h2>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@email.dk"
            />
          </div>

          {/* Shipping */}
          <div className="rounded-xl border border-border bg-surface-raised p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">{t("shippingAddress")}</h2>
            <div className="flex flex-col gap-3">
              <Input id="name" label={tc("size")} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Navn" />
              <Input id="street" required value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Adresse" />
              <div className="grid grid-cols-2 gap-3">
                <Input id="postalCode" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Postnr." />
                <Input id="city" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="By" />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-xl border border-border bg-surface-raised p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">{t("paymentMethod")}</h2>
            <div className="flex flex-col gap-2">
              {([
                { value: "DEMO", label: "Demo (gratis test)" },
                { value: "STRIPE", label: "Stripe (Kort)" },
                { value: "PAYPAL", label: "PayPal" },
              ] as const).map((pm) => (
                <label
                  key={pm.value}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    paymentMethod === pm.value
                      ? "border-brand-primary bg-brand-primary/5"
                      : "border-border hover:border-brand-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={pm.value}
                    checked={paymentMethod === pm.value}
                    onChange={() => setPaymentMethod(pm.value)}
                    className="accent-brand-primary"
                  />
                  <span className="text-sm font-medium">{pm.label}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-border bg-surface-raised p-6 self-start">
          <h2 className="text-lg font-bold text-foreground">{t("orderSummary")}</h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {items.map((item) => (
              <li key={`${item.productId}-${item.size}-${item.color}`} className="flex justify-between">
                <span className="text-brand-accent line-clamp-1">
                  {item.productName} × {item.quantity}
                </span>
                <span className="font-medium">
                  {formatPrice(item.price * item.quantity, item.currency)}
                </span>
              </li>
            ))}
          </ul>
          <hr className="my-4 border-border" />
          <div className="flex justify-between">
            <span className="text-sm text-brand-accent">{tc("shipping")}</span>
            <span className="text-sm font-medium text-success">{tc("freeShipping")}</span>
          </div>
          <div className="mt-2 flex justify-between text-base">
            <span className="font-bold">{tc("total")}</span>
            <span className="font-bold">{formatPrice(totalPrice(), "DKK")}</span>
          </div>
          <Button
            type="submit"
            className="mt-6 w-full"
            size="lg"
            disabled={submitting}
          >
            {submitting ? t("processing") : t("placeOrder")}
          </Button>
        </div>
      </form>
    </div>
  );
}
