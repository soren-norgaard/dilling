"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export function CartDrawer() {
  const t = useTranslations("common");
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const totalItems = useCartStore((s) => s.totalItems);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[60] bg-surface-overlay"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("cart")}
        className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col bg-background shadow-lg animate-[slide-in-right_0.2s_ease-out]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">
            {t("cart")} ({totalItems()})
          </h2>
          <button
            onClick={closeCart}
            className="rounded-lg p-1 text-brand-accent hover:bg-surface hover:text-foreground"
            aria-label={t("close")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <p className="mt-8 text-center text-sm text-brand-accent">
              {t("emptyCart")}
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li
                  key={`${item.productId}-${item.size}-${item.color}`}
                  className="flex gap-3 rounded-lg border border-border bg-surface p-3"
                >
                  {item.image && (
                    <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-md bg-surface">
                      <Image
                        src={item.image}
                        alt={item.productName}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-1">
                    <Link
                      href={`/catalog/item/${item.slug}`}
                      onClick={closeCart}
                      className="text-sm font-medium text-foreground hover:text-brand-primary line-clamp-1"
                    >
                      {item.productName}
                    </Link>
                    <span className="text-xs text-brand-accent">
                      {item.size} / {item.color}
                    </span>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            item.quantity > 1
                              ? updateQuantity(item.productId, item.size, item.color, item.quantity - 1)
                              : removeItem(item.productId, item.size, item.color)
                          }
                          className="flex h-6 w-6 items-center justify-center rounded border border-border text-xs hover:bg-surface"
                        >
                          −
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.size, item.color, item.quantity + 1)
                          }
                          className="flex h-6 w-6 items-center justify-center rounded border border-border text-xs hover:bg-surface"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatPrice(item.price * item.quantity, item.currency)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">{t("total")}</span>
              <span className="text-lg font-bold text-foreground">
                {formatPrice(totalPrice(), "DKK")}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/checkout" onClick={closeCart}>
                <Button className="w-full">{t("proceedToCheckout")}</Button>
              </Link>
              <Button variant="outline" className="w-full" onClick={closeCart}>
                {t("continueShopping")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
