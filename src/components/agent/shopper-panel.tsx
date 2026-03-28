"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { DillingImage } from "@/components/ui/dilling-image";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/lib/stores";
import { formatPrice } from "@/lib/utils";

const transport = new DefaultChatTransport({ api: "/api/agent/shopper" });

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
  material?: string;
  translations?: { locale: string; name: string }[];
  prices?: { currency: string; amount: number | string }[];
}

function getToolResultData(message: {
  parts?: {
    type: string;
    toolInvocation?: {
      toolName: string;
      state: string;
      result?: {
        products?: ProductHit[];
        gifts?: ProductHit[];
        outfit?: { layer: string; products: ProductHit[] }[];
        comparison?: { slug: string; name: string; material: string; price: number | null; images: string[] }[];
        materialInfo?: { title: string; content: string }[];
      };
    };
  }[];
}): { products: ProductHit[]; comparison: { slug: string; name: string; material: string; price: number | null }[]; outfit: { layer: string; products: ProductHit[] }[]; materialInfo: { title: string; content: string }[] } {
  const products: ProductHit[] = [];
  const comparison: { slug: string; name: string; material: string; price: number | null }[] = [];
  const outfit: { layer: string; products: ProductHit[] }[] = [];
  const materialInfo: { title: string; content: string }[] = [];

  if (!message.parts) return { products, comparison, outfit, materialInfo };

  for (const part of message.parts) {
    if (part.type === "tool-invocation" && part.toolInvocation?.state === "result") {
      const result = part.toolInvocation.result;
      if (result?.products) products.push(...result.products);
      if (result?.gifts) products.push(...result.gifts);
      if (result?.outfit) outfit.push(...result.outfit);
      if (result?.comparison) comparison.push(...result.comparison);
      if (result?.materialInfo) materialInfo.push(...result.materialInfo);
    }
  }
  return { products, comparison, outfit, materialInfo };
}

function ShopperProductCard({ product }: { product: ProductHit }) {
  const name = product.name ?? product.translations?.find((t) => t.locale === "DA")?.name ?? product.slug ?? "Product";
  const price = product.priceAmount ?? (product.prices?.find((p) => p.currency === "DKK") ? Number(product.prices.find((p) => p.currency === "DKK")!.amount) : null);
  const image = product.images?.[0];

  return (
    <Link
      href={`/catalog/item/${product.slug ?? ""}`}
      className="flex flex-col rounded-lg border border-border bg-background p-2 text-xs hover:border-brand-primary transition-colors"
    >
      {image ? (
        <div className="relative aspect-square w-full overflow-hidden rounded">
          <DillingImage src={image} alt={name} fill sizes="120px" className="object-cover" />
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded bg-surface text-brand-accent/40">?</div>
      )}
      <p className="mt-1.5 font-medium text-foreground line-clamp-2">{name}</p>
      {price !== null && <p className="text-brand-accent text-[11px]">{formatPrice(price, "DKK")}</p>}
    </Link>
  );
}

function OutfitCard({ outfit }: { outfit: { layer: string; products: ProductHit[] }[] }) {
  const total = outfit.reduce((sum, l) => {
    const first = l.products[0];
    const price = first?.priceAmount ?? (first?.prices?.find((p) => p.currency === "DKK") ? Number(first.prices.find((p) => p.currency === "DKK")!.amount) : 0);
    return sum + (price ?? 0);
  }, 0);

  return (
    <div className="rounded-lg border border-brand-primary/30 bg-brand-primary/5 p-3">
      <p className="mb-2 text-xs font-semibold text-brand-primary">Outfit</p>
      <div className="flex flex-col gap-2">
        {outfit.map((layer, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-20 flex-shrink-0 font-medium text-brand-accent capitalize">{layer.layer}</span>
            <span className="text-foreground">{layer.products[0]?.name ?? layer.products[0]?.translations?.find((t) => t.locale === "DA")?.name ?? "—"}</span>
          </div>
        ))}
      </div>
      {total > 0 && <p className="mt-2 text-xs font-semibold text-foreground">Total: {formatPrice(total, "DKK")}</p>}
    </div>
  );
}

function ComparisonCard({ comparison }: { comparison: { slug: string; name: string; material: string; price: number | null }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface p-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="p-1 text-left text-brand-accent font-medium">Produkt</th>
            <th className="p-1 text-left text-brand-accent font-medium">Materiale</th>
            <th className="p-1 text-right text-brand-accent font-medium">Pris</th>
          </tr>
        </thead>
        <tbody>
          {comparison.map((p) => (
            <tr key={p.slug} className="border-b border-border/50 last:border-0">
              <td className="p-1 text-foreground">{p.name}</td>
              <td className="p-1 text-foreground">{p.material}</td>
              <td className="p-1 text-right text-foreground">{p.price ? formatPrice(p.price, "DKK") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MaterialCard({ info }: { info: { title: string; content: string }[] }) {
  return (
    <div className="rounded-lg border border-brand-accent/20 bg-surface p-3">
      {info.map((article, i) => (
        <div key={i} className={i > 0 ? "mt-2 border-t border-border pt-2" : ""}>
          <p className="text-xs font-semibold text-foreground">{article.title}</p>
          <p className="mt-1 text-xs text-brand-accent leading-relaxed line-clamp-4">{article.content}</p>
        </div>
      ))}
    </div>
  );
}

export function ShopperPanel() {
  const t = useTranslations("chat");
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addItem = useCartStore((s) => s.addItem);

  const { messages, sendMessage, status } = useChat({ transport });
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const quickActions = [
    { label: "Skitur outfit", prompt: "Byg et komplet outfit til skitur" },
    { label: "Gave under 500 kr", prompt: "Find en gave til en kvinde under 500 kr" },
    { label: "Sammenlign base layers", prompt: "Sammenlign jeres merinould base layers for kvinder" },
    { label: "Hvad er merinould?", prompt: "Hvad er merinould og hvorfor er det godt?" },
  ];

  return (
    <>
      {/* Toggle button — positioned above the main chat button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-24 right-6 z-[79] flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary/80 text-white shadow-md transition-transform hover:scale-105 active:scale-95"
        aria-label={isOpen ? "Luk shopping assistent" : "Åbn shopping assistent"}
        title="Shopping Assistent"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-x-3 bottom-40 z-[79] flex h-[60vh] max-h-[36rem] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl sm:inset-x-auto sm:right-6 sm:left-auto sm:w-[28rem]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-brand-primary px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
              <p className="text-sm font-semibold">Shopping Assistent</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-brand-accent">Hej! Jeg er din shopping-assistent. Jeg kan hjælpe dig med at sammensætte outfits, finde gaver og sammenligne produkter.</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickActions.map((a) => (
                    <button
                      key={a.label}
                      onClick={() => sendMessage({ text: a.prompt })}
                      className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground hover:border-brand-primary hover:text-brand-primary transition-colors"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((msg) => {
                  const text = getMessageText(msg);
                  const { products, comparison, outfit, materialInfo } = getToolResultData(msg);

                  return (
                    <div key={msg.id} className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      {text && (
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${msg.role === "user" ? "bg-brand-primary text-white" : "bg-surface text-foreground"}`}>
                          {text}
                        </div>
                      )}
                      {outfit.length > 0 && (
                        <div className="w-full max-w-[90%]">
                          <OutfitCard outfit={outfit} />
                        </div>
                      )}
                      {comparison.length > 0 && (
                        <div className="w-full max-w-[90%]">
                          <ComparisonCard comparison={comparison} />
                        </div>
                      )}
                      {materialInfo.length > 0 && (
                        <div className="w-full max-w-[90%]">
                          <MaterialCard info={materialInfo} />
                        </div>
                      )}
                      {products.length > 0 && (
                        <div className="grid w-full max-w-[90%] grid-cols-2 gap-1.5">
                          {products.slice(0, 6).map((p, i) => (
                            <ShopperProductCard key={i} product={p} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex items-center gap-2 px-1 text-xs text-brand-accent">
                    <span className="animate-pulse">Finder produkter...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim() || isLoading) return;
              sendMessage({ text: input });
              setInput("");
            }}
            className="flex items-center gap-2 border-t border-border px-3 py-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hvad leder du efter?"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-brand-accent/60 focus:outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-white disabled:opacity-50 transition-opacity"
              aria-label="Send"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
