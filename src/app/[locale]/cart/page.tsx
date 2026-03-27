"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const t = useTranslations("common");
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const totalPrice = useCartStore((s) => s.totalPrice);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground">{t("cart")}</h1>

      {items.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-brand-accent">{t("emptyCart")}</p>
          <Link href="/catalog" className="mt-4 inline-block">
            <Button variant="outline">{t("continueShopping")}</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          {/* Item list */}
          <div className="lg:col-span-2">
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li
                  key={`${item.productId}-${item.size}-${item.color}`}
                  className="flex gap-4 rounded-xl border border-border bg-surface-raised p-4"
                >
                  {item.image && (
                    <div className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-surface">
                      <Image
                        src={item.image}
                        alt={item.productName}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-1">
                    <Link
                      href={`/catalog/item/${item.slug}`}
                      className="font-medium text-foreground hover:text-brand-primary"
                    >
                      {item.productName}
                    </Link>
                    <span className="text-xs text-brand-accent">
                      {t("size")}: {item.size} | {t("color")}: {item.color}
                    </span>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            item.quantity > 1
                              ? updateQuantity(item.productId, item.size, item.color, item.quantity - 1)
                              : removeItem(item.productId, item.size, item.color)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm hover:bg-surface"
                        >
                          −
                        </button>
                        <span className="min-w-[2rem] text-center">{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.size, item.color, item.quantity + 1)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm hover:bg-surface"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-semibold">
                        {formatPrice(item.price * item.quantity, item.currency)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <button
              onClick={clearCart}
              className="mt-4 text-xs text-error hover:underline"
            >
              {t("removeFromCart")} alle
            </button>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-border bg-surface-raised p-6">
            <h2 className="text-lg font-bold text-foreground">{t("total")}</h2>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-brand-accent">{t("subtotal")}</span>
                <span className="font-medium">{formatPrice(totalPrice(), "DKK")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-accent">{t("shipping")}</span>
                <span className="font-medium text-success">{t("freeShipping")}</span>
              </div>
              <hr className="my-2 border-border" />
              <div className="flex justify-between text-base">
                <span className="font-bold">{t("total")}</span>
                <span className="font-bold">{formatPrice(totalPrice(), "DKK")}</span>
              </div>
            </div>
            <Link href="/checkout" className="mt-6 block">
              <Button className="w-full" size="lg">
                {t("proceedToCheckout")}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
