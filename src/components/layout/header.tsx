"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { useCartStore } from "@/lib/stores";

export function Header() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.totalItems);
  const openCart = useCartStore((s) => s.openCart);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-brand-primary">
          Dilling
        </Link>

        {/* Navigation */}
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
            AI Assistent
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <button
            onClick={openCart}
            className="relative text-sm font-medium text-foreground hover:text-brand-primary"
          >
            {t("cart")}
            {totalItems() > 0 && (
              <span className="absolute -right-3 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                {totalItems()}
              </span>
            )}
          </button>
          <Link
            href="/account"
            className="text-sm font-medium text-foreground hover:text-brand-primary"
          >
            {t("account")}
          </Link>
        </div>
      </div>
    </header>
  );
}
