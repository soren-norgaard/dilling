"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { ProductCard, type ProductCardData } from "@/components/catalog/product-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const GENDERS = ["WOMEN", "MEN", "CHILDREN", "BABY"] as const;
const MATERIALS = [
  "MERINO_WOOL",
  "COTTON",
  "WOOL_SILK",
  "CASHMERE",
  "LAMB_WOOL",
  "MERINO_FLEECE",
  "MERINO_TERRY",
] as const;

const PAGE_SIZE = 20;

export default function CatalogPage() {
  const t = useTranslations("catalog");
  const tg = useTranslations("genders");
  const tm = useTranslations("materials");

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentGender = searchParams.get("gender") ?? "";
  const currentMaterial = searchParams.get("material") ?? "";
  const currentSort = searchParams.get("sort") ?? "createdAt:desc";
  const currentPage = parseInt(searchParams.get("page") ?? "1", 10);
  const currentQuery = searchParams.get("q") ?? "";

  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key !== "page") params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams();
    if (currentQuery) params.set("q", currentQuery);
    if (currentGender) params.set("gender", currentGender);
    if (currentMaterial) params.set("material", currentMaterial);
    params.set("sort", currentSort);
    params.set("page", String(currentPage));
    params.set("limit", String(PAGE_SIZE));

    fetch(`/api/catalog?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) return { products: [], total: 0 };
        return res.json();
      })
      .then((data) => {
        setProducts(data.products ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [currentGender, currentMaterial, currentSort, currentPage, currentQuery]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>

      {/* Filters row */}
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <Select
          label={t("filters.gender")}
          id="gender-filter"
          value={currentGender}
          onChange={(e) => updateFilter("gender", e.target.value)}
          options={[
            { value: "", label: "—" },
            ...GENDERS.map((g) => ({ value: g, label: tg(g) })),
          ]}
        />
        <Select
          label={t("filters.material")}
          id="material-filter"
          value={currentMaterial}
          onChange={(e) => updateFilter("material", e.target.value)}
          options={[
            { value: "", label: "—" },
            ...MATERIALS.map((m) => ({ value: m, label: tm(m) })),
          ]}
        />
        <Select
          label={t("filters.sort")}
          id="sort-filter"
          value={currentSort}
          onChange={(e) => updateFilter("sort", e.target.value)}
          options={[
            { value: "createdAt:desc", label: t("sort.newest") },
            { value: "priceAmount:asc", label: t("sort.priceAsc") },
            { value: "priceAmount:desc", label: t("sort.priceDesc") },
            { value: "name:asc", label: t("sort.name") },
          ]}
        />
        {(currentGender || currentMaterial) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const params = new URLSearchParams();
              params.set("sort", currentSort);
              router.push(`${pathname}?${params.toString()}`);
            }}
          >
            {t("filters.clearAll")}
          </Button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-[3/4] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="mt-12 text-center text-brand-accent">{t("title")} — 0</p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => updateFilter("page", String(currentPage - 1))}
              >
                ←
              </Button>
              <span className="text-sm text-brand-accent">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => updateFilter("page", String(currentPage + 1))}
              >
                →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
