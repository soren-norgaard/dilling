"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import { DillingImage } from "@/components/ui/dilling-image";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

const transport = new DefaultChatTransport({ api: "/api/agent/chat" });

function getMessageText(message: { parts?: { type: string; text?: string }[]; content?: string }): string {
  if (message.parts) {
    return message.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("");
  }
  return message.content ?? "";
}

interface ProductHit {
  slug?: string;
  name?: string;
  images?: string[];
  priceAmount?: number;
  priceCurrency?: string;
  translations?: { locale: string; name: string; description?: string }[];
  prices?: { currency: string; amount: number | string }[];
  material?: string;
  sizes?: string[];
  colorName?: string;
  description?: string;
}

interface OutfitLayer {
  layer: string;
  products: ProductHit[];
}

interface ToolResults {
  products: ProductHit[];
  outfit: OutfitLayer[];
  gifts: { products: ProductHit[]; budget: number | null };
  sizeRec: { recommendedSize?: string; tip?: string; sizeChart?: Record<string, string> } | null;
  comparison: { slug: string; name: string; material: string; price: number | null }[];
  materialInfo: { title?: string; content?: string }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isToolPart(part: any): part is { type: string; toolName?: string; state?: string; output?: Record<string, unknown> } {
  if (!part || typeof part.type !== "string") return false;
  // AI SDK v6: tool parts have type "dynamic-tool" or "tool-<name>"
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getToolName(part: any): string {
  if (part.toolName) return part.toolName;
  if (typeof part.type === "string" && part.type.startsWith("tool-")) return part.type.slice(5);
  return "";
}

function getToolResults(message: { parts?: Array<Record<string, unknown>> }): ToolResults {
  const result: ToolResults = { products: [], outfit: [], gifts: { products: [], budget: null }, sizeRec: null, comparison: [], materialInfo: [] };
  if (!message.parts) return result;

  for (const part of message.parts) {
    if (!isToolPart(part) || part.state !== "output-available") continue;
    const r = part.output as Record<string, unknown> | undefined;
    if (!r) continue;
    const toolName = getToolName(part);

    if (toolName === "buildOutfit" && r?.outfit) {
      result.outfit.push(...(r.outfit as OutfitLayer[]));
    } else if (toolName === "findGift" && r?.gifts) {
      result.gifts.products.push(...(r.gifts as ProductHit[]));
      if (r.budget) result.gifts.budget = r.budget as number;
    } else if (toolName === "getSizeRecommendation" && r?.recommendedSize) {
      result.sizeRec = r as ToolResults["sizeRec"];
    } else if (toolName === "compareProducts" && r?.comparison) {
      result.comparison.push(...(r.comparison as ToolResults["comparison"]));
    } else if ((toolName === "getMaterialInfo") && r?.materialInfo) {
      result.materialInfo.push(...(r.materialInfo as ToolResults["materialInfo"]));
    } else if (r?.products) {
      result.products.push(...(r.products as ProductHit[]));
    }
  }
  return result;
}

/* ─── Product Card ───────────────────────────────────────── */
function ProductCard({ product }: { product: ProductHit }) {
  const name =
    product.name ??
    product.translations?.find((t) => t.locale === "DA")?.name ??
    product.slug ??
    "Produkt";
  const price =
    product.priceAmount ??
    (product.prices?.find((p) => p.currency === "DKK")
      ? Number(product.prices.find((p) => p.currency === "DKK")!.amount)
      : null);
  const image = product.images?.[0];
  const materialLabel = product.material?.replace(/_/g, " ").toLowerCase();

  return (
    <Link
      href={`/catalog/item/${product.slug ?? ""}`}
      className="group flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-3 hover:border-brand-primary hover:shadow-md transition-all"
    >
      <div className="relative h-16 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-surface">
        <DillingImage
          src={image}
          alt={name}
          fill
          sizes="56px"
          className="object-cover"
          fallback={<div className="flex h-16 w-14 items-center justify-center rounded-lg bg-surface text-brand-accent/30 text-xs">?</div>}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground line-clamp-1 group-hover:text-brand-primary transition-colors">{name}</p>
        {materialLabel && (
          <p className="text-xs text-brand-accent capitalize">{materialLabel}</p>
        )}
        {price !== null && (
          <p className="text-sm font-semibold text-brand-primary">{formatPrice(price, "DKK")}</p>
        )}
      </div>
    </Link>
  );
}

/* ─── Outfit Card ────────────────────────────────────────── */
function OutfitCard({ outfit }: { outfit: OutfitLayer[] }) {
  const total = outfit.reduce((sum, layer) => {
    const p = layer.products[0];
    if (!p) return sum;
    const price = p.priceAmount ?? (p.prices?.find((pr) => pr.currency === "DKK") ? Number(p.prices!.find((pr) => pr.currency === "DKK")!.amount) : 0);
    return sum + (price ?? 0);
  }, 0);

  return (
    <div className="w-full max-w-[85%] rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">👗</span>
        <span className="text-sm font-semibold text-brand-primary">Dit outfit</span>
      </div>
      <div className="flex flex-col gap-2">
        {outfit.map((layer, i) => {
          const p = layer.products[0];
          if (!p) return null;
          const name = p.name ?? p.translations?.find((t) => t.locale === "DA")?.name ?? "—";
          const price = p.priceAmount ?? (p.prices?.find((pr) => pr.currency === "DKK") ? Number(p.prices!.find((pr) => pr.currency === "DKK")!.amount) : null);
          const image = p.images?.[0];

          return (
            <Link
              key={i}
              href={`/catalog/item/${p.slug ?? ""}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-2 hover:border-brand-primary transition-colors"
            >
              <div className="relative h-12 w-10 flex-shrink-0 overflow-hidden rounded bg-surface">
                <DillingImage
                  src={image}
                  alt={name}
                  fill
                  sizes="40px"
                  className="object-cover"
                  fallback={<div className="flex h-12 w-10 items-center justify-center text-brand-accent/30 text-[10px]">?</div>}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-brand-accent uppercase tracking-wide">{layer.layer}</p>
                <p className="text-sm text-foreground line-clamp-1">{name}</p>
              </div>
              {price !== null && (
                <span className="flex-shrink-0 text-sm font-medium text-brand-primary">{formatPrice(price, "DKK")}</span>
              )}
            </Link>
          );
        })}
      </div>
      {total > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-brand-primary/20 pt-3">
          <span className="text-sm font-medium text-foreground">Total</span>
          <span className="text-base font-bold text-brand-primary">{formatPrice(total, "DKK")}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Size Recommendation Card ───────────────────────────── */
function SizeRecCard({ sizeRec }: { sizeRec: NonNullable<ToolResults["sizeRec"]> }) {
  return (
    <div className="w-full max-w-[85%] rounded-xl border border-brand-accent/20 bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">📏</span>
        <span className="text-sm font-semibold text-brand-accent">Størrelses-anbefaling</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white text-xl font-bold">
          {sizeRec.recommendedSize}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Vi anbefaler størrelse {sizeRec.recommendedSize}</p>
          {sizeRec.tip && <p className="text-xs text-brand-accent mt-0.5">{sizeRec.tip}</p>}
        </div>
      </div>
      {sizeRec.sizeChart && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(sizeRec.sizeChart).map(([size, eu]) => (
            <span
              key={size}
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                size === sizeRec.recommendedSize
                  ? "bg-brand-primary text-white font-semibold"
                  : "bg-surface-raised text-brand-accent border border-border"
              }`}
            >
              {size} ({eu})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Gift Card ──────────────────────────────────────────── */
function GiftCard({ products, budget }: { products: ProductHit[]; budget: number }) {
  return (
    <div className="w-full max-w-[85%] rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎁</span>
          <span className="text-sm font-semibold text-brand-primary">Gaveforslag</span>
        </div>
        <span className="text-xs text-brand-accent">Budget: {formatPrice(budget, "DKK")}</span>
      </div>
      <div className="flex flex-col gap-2">
        {products.slice(0, 4).map((p, i) => (
          <ProductCard key={i} product={p} />
        ))}
      </div>
    </div>
  );
}

/* ─── Material Info Card ─────────────────────────────────── */
function MaterialCard({ info }: { info: { title?: string; content?: string }[] }) {
  return (
    <div className="w-full max-w-[85%] rounded-xl border border-brand-accent/20 bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">🧶</span>
        <span className="text-sm font-semibold text-brand-accent">Materiale info</span>
      </div>
      {info.map((article, i) => (
        <div key={i} className={i > 0 ? "mt-2 border-t border-border pt-2" : ""}>
          {article.title && <p className="text-sm font-medium text-foreground">{article.title}</p>}
          {article.content && <p className="mt-1 text-xs text-brand-accent leading-relaxed line-clamp-6">{article.content}</p>}
        </div>
      ))}
    </div>
  );
}

/* ─── Comparison Card ────────────────────────────────────── */
function ComparisonCard({ comparison }: { comparison: ToolResults["comparison"] }) {
  return (
    <div className="w-full max-w-[85%] overflow-x-auto rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">⚖️</span>
        <span className="text-sm font-semibold text-brand-accent">Sammenligning</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="p-1.5 text-left font-medium text-brand-accent">Produkt</th>
            <th className="p-1.5 text-left font-medium text-brand-accent">Materiale</th>
            <th className="p-1.5 text-right font-medium text-brand-accent">Pris</th>
          </tr>
        </thead>
        <tbody>
          {comparison.map((p) => (
            <tr key={p.slug} className="border-b border-border/50 last:border-0">
              <td className="p-1.5 text-foreground">{p.name}</td>
              <td className="p-1.5 text-foreground capitalize">{p.material?.replace(/_/g, " ").toLowerCase()}</td>
              <td className="p-1.5 text-right text-brand-primary font-medium">{p.price ? formatPrice(p.price, "DKK") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Tool Call Indicator ────────────────────────────────── */
function ToolIndicator({ toolName }: { toolName: string }) {
  const labels: Record<string, string> = {
    searchProducts: "Søger i kataloget...",
    getProductDetails: "Henter produktdetaljer...",
    buildOutfit: "Sammensætter dit outfit...",
    findGift: "Finder gaveforslag...",
    getMaterialInfo: "Henter materialeinfo...",
    getSizeRecommendation: "Beregner din størrelse...",
    addToCart: "Tilføjer til kurven...",
    getCart: "Henter kurv...",
    compareProducts: "Sammenligner produkter...",
    recommendByMood: "Finder produkter til dit mood...",
    getSeasonalPicks: "Finder sæsonens favoritter...",
  };
  return (
    <div className="flex items-center gap-2 text-xs text-brand-accent animate-pulse">
      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {labels[toolName] ?? "Arbejder på det..."}
    </div>
  );
}

/* ─── Main Chat Page ─────────────────────────────────────── */
export default function ChatPage() {
  const t = useTranslations("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({ transport });
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const suggestions = [
    { icon: "🎿", label: "Klæd mig på til skitur", prompt: "Klæd mig på til en skitur i koldt vejr" },
    { icon: "🎁", label: "Find en gave", prompt: "Find en gave til min kæreste under 500 kr" },
    { icon: "📏", label: "Hjælp med størrelse", prompt: "Jeg er 175 cm og 70 kg kvinde — hvilken størrelse skal jeg vælge?" },
    { icon: "🧶", label: "Om merinould", prompt: "Hvorfor er merinould godt til skiundertøj?" },
    { icon: "🏃", label: "Løbetøj", prompt: "Jeg skal ud og løbe i koldt vejr — hvad anbefaler du?" },
    { icon: "👶", label: "Babytøj", prompt: "Mit barn er 68 cm — hvad anbefaler du til vinter?" },
  ];

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col px-4 py-4">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary text-white text-3xl font-bold">
              D
            </div>
            <div>
              <h1 className="text-2xl font-bold text-brand-primary">Din personlige stylist</h1>
              <p className="mt-2 max-w-md text-sm text-brand-accent">
                Jeg hjælper dig med at finde det perfekte tøj i naturmaterialer — fra størrelse til komplet outfit.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  onClick={() => sendMessage({ text: s.prompt })}
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-left text-sm text-foreground hover:border-brand-primary hover:text-brand-primary transition-colors"
                >
                  <span className="text-base">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-4">
            {messages.map((msg) => {
              const text = getMessageText(msg);
              const { products, outfit, gifts, sizeRec, comparison, materialInfo } = getToolResults(msg);
              const pendingTools = (msg.parts ?? []).filter(
                (p) => isToolPart(p) && p.state !== "output-available" && p.state !== "output-error"
              );
              const hasRichContent = outfit.length > 0 || gifts.products.length > 0 || sizeRec || comparison.length > 0 || materialInfo.length > 0 || products.length > 0;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  {text && (
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-brand-primary text-white"
                          : "bg-surface text-foreground"
                      }`}
                    >
                      {msg.role === "user" ? (
                        text
                      ) : (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            ul: ({ children }) => <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>,
                            li: ({ children }) => <li className="mb-0.5">{children}</li>,
                            h3: ({ children }) => <p className="font-semibold mb-1 mt-2 first:mt-0">{children}</p>,
                            h2: ({ children }) => <p className="font-semibold mb-1 mt-2 first:mt-0">{children}</p>,
                            a: ({ href, children }) => <a href={href} className="text-brand-primary underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                            img: () => null,
                          }}
                        >
                          {text.replace(/!\[[^\]]*\]\([^)]+\)/g, "")}
                        </ReactMarkdown>
                      )}
                    </div>
                  )}
                  {pendingTools.map((p, i) => (
                    <ToolIndicator
                      key={i}
                      toolName={getToolName(p)}
                    />
                  ))}
                  {/* Rich content cards */}
                  {outfit.length > 0 && <OutfitCard outfit={outfit} />}
                  {sizeRec && <SizeRecCard sizeRec={sizeRec} />}
                  {gifts.products.length > 0 && gifts.budget !== null && (
                    <GiftCard products={gifts.products} budget={gifts.budget} />
                  )}
                  {comparison.length > 0 && <ComparisonCard comparison={comparison} />}
                  {materialInfo.length > 0 && <MaterialCard info={materialInfo} />}
                  {/* Regular product results (not from outfit/gifts) */}
                  {outfit.length === 0 && gifts.products.length === 0 && products.length > 0 && (
                    <div className="grid w-full max-w-[85%] gap-2 sm:grid-cols-2">
                      {products.slice(0, 6).map((p, i) => (
                        <ProductCard key={i} product={p} />
                      ))}
                      {products.length > 6 && (
                        <p className="col-span-full text-xs text-brand-accent text-center">
                          +{products.length - 6} flere produkter
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-center gap-2 text-xs text-brand-accent animate-pulse">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                Din stylist tænker...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        id="chat-page-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || isLoading) return;
          sendMessage({ text: input });
          setInput("");
        }}
        className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-3"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("placeholder")}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-brand-accent/60 focus:outline-none"
          disabled={isLoading}
        />
        <Button type="submit" size="sm" disabled={!input.trim() || isLoading}>
          Send
        </Button>
      </form>
    </div>
  );
}
