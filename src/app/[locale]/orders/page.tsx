"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface OrderItem {
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  currency: string;
}

interface Order {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  items: OrderItem[];
}

export default function OrdersPage() {
  const t = useTranslations("orders");
  const searchParams = useSearchParams();
  const success = searchParams.get("success");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => setOrders(data.orders ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusVariant = (status: string) => {
    switch (status) {
      case "PAID":
      case "DELIVERED":
        return "success" as const;
      case "SHIPPED":
      case "PROCESSING":
        return "warning" as const;
      case "CANCELLED":
        return "error" as const;
      default:
        return "default" as const;
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>

      {success && (
        <div className="mt-4 rounded-lg border border-success/30 bg-success/5 p-4 text-sm text-success">
          Ordre {success} er oprettet!
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-brand-accent">Indlæser...</p>
      ) : orders.length === 0 ? (
        <p className="mt-8 text-sm text-brand-accent">{t("noOrders")}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-xl border border-border bg-surface-raised p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-brand-accent">
                    {t("orderNumber")} {order.id.slice(0, 8)}
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(order.createdAt).toLocaleDateString("da-DK")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(order.status)}>
                    {t(`status.${order.status}` as keyof IntlMessages["orders"]["status"])}
                  </Badge>
                  <span className="text-sm font-bold">
                    {formatPrice(order.totalAmount, order.currency)}
                  </span>
                </div>
              </div>
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {order.items.map((item, i) => (
                  <li key={i} className="flex justify-between text-brand-accent">
                    <span>
                      {item.productName} ({item.size}, {item.color}) × {item.quantity}
                    </span>
                    <span>{formatPrice(item.unitPrice * item.quantity, item.currency)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
