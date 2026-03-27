"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ProductCard, type ProductCardData } from "@/components/catalog/product-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const t = useTranslations("home");
  const tc = useTranslations("common");

  const [featured, setFeatured] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/catalog?limit=8&sort=createdAt:desc")
      .then((r) => r.json())
      .then((data) => setFeatured(data.products ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = [
    { key: "women", gender: "WOMEN", icon: "👩" },
    { key: "men", gender: "MEN", icon: "👨" },
    { key: "children", gender: "CHILDREN", icon: "🧒" },
    { key: "baby", gender: "BABY", icon: "👶" },
  ] as const;

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-surface-warm py-20 px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-brand-primary sm:text-5xl md:text-6xl">
            {t("hero.title")}
          </h1>
          <p className="mt-4 text-lg text-brand-accent sm:text-xl">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/catalog"
              className="inline-flex items-center rounded-lg bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-dark transition-colors"
            >
              {t("hero.cta")}
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center rounded-lg border border-brand-primary px-6 py-3 text-sm font-semibold text-brand-primary hover:bg-brand-primary hover:text-white transition-colors"
            >
              {t("hero.chatCta")}
            </Link>
          </div>
        </div>
      </section>

      {/* USP bar */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-8 px-4 py-4 text-xs text-brand-accent">
          <span>🌿 Økologisk certificeret</span>
          <span>🐑 Mulesing-fri merinould</span>
          <span>🏠 Eget farveri i Bredsten</span>
          <span>🚚 Gratis fragt over 499 DKK</span>
          <span>🔄 30 dages returret</span>
        </div>
      </section>

      {/* Category Grid */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.key}
              href={`/catalog?gender=${cat.gender}`}
              className="group flex flex-col items-center rounded-xl border border-border bg-surface-raised p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-secondary-light text-4xl">
                {cat.icon}
              </div>
              <span className="mt-4 text-sm font-medium text-foreground group-hover:text-brand-primary">
                {t(`categories.${cat.key}`)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            {t("featured.title")}
          </h2>
          <Link
            href="/catalog"
            className="text-sm font-medium text-brand-primary hover:underline"
          >
            {tc("catalog")} →
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-[3/4] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : featured.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-brand-accent">
            {tc("noResults")}
          </p>
        )}
      </section>

      {/* AI Assistant CTA */}
      <section className="bg-brand-primary py-16 px-4 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Prøv vores AI-assistent
          </h2>
          <p className="mt-3 text-sm text-white/80">
            Fortæl os hvad du leder efter, og vores AI sammensætter det perfekte outfit i naturlige materialer.
          </p>
          <Link
            href="/chat"
            className="mt-6 inline-flex items-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-primary hover:bg-brand-secondary-light transition-colors"
          >
            Start en samtale →
          </Link>
        </div>
      </section>
    </div>
  );
}
