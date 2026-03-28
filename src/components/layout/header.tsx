"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { useCartStore, useCurrencyStore } from "@/lib/stores";

export function Header() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.totalItems);
  const openCart = useCartStore((s) => s.openCart);
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground hover:bg-surface md:hidden"
          aria-label={mobileMenuOpen ? "Luk menu" : "Åbn menu"}
        >
          {mobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          )}
        </button>

        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-brand-primary">
          Dilling
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/catalog"
            className={`text-sm font-medium transition-colors hover:text-brand-primary ${
              pathname.startsWith("/catalog") ? "text-brand-primary" : "text-foreground"
            }`}
          >
            {t("catalog")}
          </Link>
          <Link
            href="/chat"
            className={`text-sm font-medium transition-colors hover:text-brand-primary ${
              pathname === "/chat" ? "text-brand-primary" : "text-foreground"
            }`}
          >
            Stylist
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Currency selector */}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as typeof currency)}
            className="h-11 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:border-brand-primary focus:outline-none"
            aria-label={t("currency")}
          >
            {currencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button
            onClick={openCart}
            className="relative flex h-11 items-center justify-center px-2 text-sm font-medium text-foreground hover:text-brand-primary"
          >
            {t("cart")}
            {totalItems() > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                {totalItems()}
              </span>
            )}
          </button>
          <Link
            href="/account"
            className="hidden h-11 items-center px-2 text-sm font-medium text-foreground hover:text-brand-primary sm:flex"
          >
            {t("account")}
          </Link>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {mobileMenuOpen && (
        <nav className="border-t border-border bg-background px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            <Link
              href="/catalog"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
                pathname.startsWith("/catalog")
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "text-foreground hover:bg-surface"
              }`}
            >
              {t("catalog")}
            </Link>
            <Link
              href="/chat"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
                pathname === "/chat"
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "text-foreground hover:bg-surface"
              }`}
            >
              Stylist
            </Link>
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors sm:hidden ${
                pathname.startsWith("/account")
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "text-foreground hover:bg-surface"
              }`}
            >
              {t("account")}
            </Link>
            <Link
              href="/orders"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
                pathname.startsWith("/orders")
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "text-foreground hover:bg-surface"
              }`}
            >
              {t("orders")}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
