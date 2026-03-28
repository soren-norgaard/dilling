"use client";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { DillingImage } from "@/components/ui/dilling-image";
import { formatPrice } from "@/lib/utils";

export interface ProductCardData {
  slug: string;
  images: string[];
  tags?: string[];
  material?: string | null;
  translations?: { locale: string; name: string; description?: string }[];
  prices?: { currency: string; amount: number | string }[];
  // Flat fields from Meilisearch hits
  name?: string;
  description?: string;
  priceAmount?: number;
  priceCurrency?: string;
}

interface ProductCardProps {
  product: ProductCardData;
  locale?: string;
  currency?: string;
}

export function ProductCard({
  product,
  locale = "DA",
  currency = "DKK",
}: ProductCardProps) {
  const name =
    product.name ??
    product.translations?.find((t) => t.locale === locale)?.name ??
    product.translations?.[0]?.name ??
    product.slug;

  const price =
    product.priceAmount ??
    (product.prices?.find((p) => p.currency === currency)?.amount
      ? Number(product.prices.find((p) => p.currency === currency)!.amount)
      : null);

  const cur = product.priceCurrency ?? currency;
  const image = product.images?.[0];

  return (
    <Link
      href={`/catalog/item/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface-raised transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface">
        <DillingImage
          src={image}
          alt={name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {product.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="default" className="text-[10px]">
                {tag.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-brand-primary transition-colors">
          {name}
        </h3>
        {product.material && (
          <span className="text-xs text-brand-accent">
            {product.material.replace(/_/g, " ")}
          </span>
        )}
        {price !== null && (
          <span className="mt-auto pt-1 text-sm font-semibold text-foreground">
            {formatPrice(price, cur)}
          </span>
        )}
      </div>
    </Link>
  );
}
