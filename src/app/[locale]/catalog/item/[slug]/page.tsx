"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { DillingImage } from "@/components/ui/dilling-image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartStore } from "@/lib/stores";
import { formatPrice } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

interface ProductDetail {
  id: string;
  slug: string;
  sku: string;
  material: string | null;
  gender: string;
  tags: string[];
  images: string[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  certifications: string[];
  sizeGuide: Record<string, Record<string, string>> | null;
  materialWeight: string | null;
  layer: string | null;
  fit: string | null;
  translations: { locale: string; name: string; description: string; careInstructions: string }[];
  prices: { currency: string; amount: number | string }[];
  categories: { category: { translations: { locale: string; name: string }[] } }[];
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useTranslations("catalog.product");
  const tc = useTranslations("common");
  const tm = useTranslations("materials");

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/catalog/item/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setProduct(data);
          if (data.sizes?.length) setSelectedSize(data.sizes[0]);
          if (data.colors?.length) setSelectedColor(data.colors[0]?.name ?? "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-brand-accent">Product not found</p>
        <Link href="/catalog" className="mt-4 inline-block text-sm font-medium text-brand-primary underline">
          {tc("back")}
        </Link>
      </div>
    );
  }

  const translation = product.translations.find((t) => t.locale === "DA") ?? product.translations[0];
  const price = product.prices.find((p) => p.currency === "DKK");
  const priceAmount = price ? Number(price.amount) : null;

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor || priceAmount === null) return;
    addItem({
      productId: product.id,
      productName: translation?.name ?? product.slug,
      slug: product.slug,
      size: selectedSize,
      color: selectedColor,
      quantity: 1,
      price: priceAmount,
      currency: "DKK",
      image: product.images[0],
    });
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/catalog" className="mb-6 inline-flex items-center gap-1 text-sm text-brand-accent hover:text-brand-primary">
        ← {tc("back")}
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Images */}
        <div className="flex flex-col gap-3">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface">
            {product.images.length > 0 ? (
              <DillingImage
                src={product.images[selectedImage]}
                alt={translation?.name ?? ""}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-brand-accent/40">
                No image
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    i === selectedImage ? "border-brand-primary" : "border-border"
                  }`}
                >
                  <DillingImage src={img} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {translation?.name}
            </h1>
            {product.material && (
              <span className="text-sm text-brand-accent">{tm(product.material as keyof IntlMessages["materials"])}</span>
            )}
          </div>

          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <Badge key={tag}>{tag.replace(/_/g, " ")}</Badge>
              ))}
            </div>
          )}

          {priceAmount !== null && (
            <p className="text-xl font-bold text-foreground">
              {formatPrice(priceAmount, "DKK")}
            </p>
          )}

          {translation?.description && (
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("description")}</h2>
              <p className="mt-1 text-sm text-brand-accent leading-relaxed">
                {translation.description}
              </p>
            </div>
          )}

          {/* Product attributes */}
          {(product.fit || product.layer || product.materialWeight) && (
            <div className="flex flex-wrap gap-2">
              {product.layer && (
                <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2.5 py-1 text-xs text-brand-accent border border-border">
                  🧶 {product.layer}
                </span>
              )}
              {product.fit && (
                <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2.5 py-1 text-xs text-brand-accent border border-border">
                  📐 Pasform: {product.fit}
                </span>
              )}
              {product.materialWeight && (
                <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2.5 py-1 text-xs text-brand-accent border border-border">
                  ⚖️ {product.materialWeight}
                </span>
              )}
            </div>
          )}

          {/* Size selector */}
          {product.sizes.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">{tc("size")}</h2>
                {product.sizeGuide && (
                  <button
                    onClick={() => setShowSizeGuide(!showSizeGuide)}
                    className="text-xs font-medium text-brand-primary hover:underline"
                  >
                    {showSizeGuide ? "Skjul størrelsesguide" : "Størrelsesguide"}
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      selectedSize === size
                        ? "border-brand-primary bg-brand-primary text-white"
                        : "border-border text-foreground hover:border-brand-primary"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {/* Size guide table */}
              {showSizeGuide && product.sizeGuide && (
                <div className="mt-3 rounded-lg border border-border bg-surface p-4">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Størrelsesguide (cm)</h3>
                  {/* Product attributes */}
                  <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-brand-accent">
                    {product.fit && <span><strong>Pasform:</strong> {product.fit}</span>}
                    {product.layer && <span><strong>Lag:</strong> {product.layer}</span>}
                    {product.materialWeight && <span><strong>Materialevægt:</strong> {product.materialWeight}</span>}
                  </div>
                  {/* Measurement table */}
                  {(() => {
                    const guide = product.sizeGuide;
                    const sizeKeys = Object.keys(guide);
                    if (sizeKeys.length === 0) return null;
                    const measureKeys = Object.keys(guide[sizeKeys[0]]);
                    const labels: Record<string, string> = {
                      chest: "Bryst", waist: "Talje", hips: "Hofte", height: "Højde",
                    };
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="py-1.5 pr-3 text-left font-semibold text-foreground">Str.</th>
                              {measureKeys.map((key) => (
                                <th key={key} className="px-2 py-1.5 text-center font-semibold text-foreground">
                                  {labels[key] ?? key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sizeKeys.map((size) => (
                              <tr
                                key={size}
                                className={`border-b border-border/50 ${
                                  size === selectedSize ? "bg-brand-primary/10 font-medium" : ""
                                }`}
                              >
                                <td className="py-1.5 pr-3 font-medium text-foreground">{size}</td>
                                {measureKeys.map((key) => (
                                  <td key={key} className="px-2 py-1.5 text-center text-brand-accent">
                                    {guide[size]?.[key] ?? "—"}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Color selector */}
          {product.colors.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground">{tc("color")}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c.name)}
                    title={c.name}
                    className={`h-10 w-10 rounded-full border-2 transition-all ${
                      selectedColor === c.name
                        ? "border-brand-primary ring-2 ring-brand-primary ring-offset-2"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Add to cart */}
          <Button
            size="lg"
            className="mt-2"
            onClick={handleAddToCart}
            disabled={!selectedSize || !selectedColor || added}
          >
            {added ? t("addedToCart") : tc("addToCart")}
          </Button>

          {/* Care instructions */}
          {translation?.careInstructions && (
            <div className="mt-4 rounded-lg border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold text-foreground">{t("careInstructions")}</h2>
              <p className="mt-1 text-sm text-brand-accent leading-relaxed">
                {translation.careInstructions}
              </p>
            </div>
          )}

          {/* Certifications */}
          {product.certifications.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.certifications.map((cert) => (
                <Badge key={cert} variant="success">{cert}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
