"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

const transport = new DefaultChatTransport({ api: "/api/agent/chat" });

/** Extract text from a message's parts or content */
function getMessageText(message: { parts?: { type: string; text?: string }[]; content?: string }): string {
  if (message.parts) {
    return message.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("");
  }
  return message.content ?? "";
}

/** Extract tool result products from message parts */
function getToolResultProducts(message: { parts?: { type: string; toolInvocation?: { toolName: string; state: string; result?: { products?: ProductHit[]; gifts?: ProductHit[]; outfit?: { layer: string; products: ProductHit[] }[] } } }[] }): ProductHit[] {
  if (!message.parts) return [];
  const products: ProductHit[] = [];
  for (const part of message.parts) {
    if (part.type === "tool-invocation" && part.toolInvocation?.state === "result") {
      const result = part.toolInvocation.result;
      if (result?.products) products.push(...result.products);
      if (result?.gifts) products.push(...result.gifts);
      if (result?.outfit) {
        for (const layer of result.outfit) {
          products.push(...layer.products);
        }
      }
    }
  }
  return products;
}

interface ProductHit {
  slug?: string;
  name?: string;
  images?: string[];
  priceAmount?: number;
  priceCurrency?: string;
  material?: string;
  translations?: { locale: string; name: string }[];
  prices?: { currency: string; amount: number | string }[];
}

function ProductMiniCard({ product }: { product: ProductHit }) {
  const name =
    product.name ??
    product.translations?.find((t) => t.locale === "DA")?.name ??
    product.slug ??
    "Product";
  const price =
    product.priceAmount ??
    (product.prices?.find((p) => p.currency === "DKK")
      ? Number(product.prices.find((p) => p.currency === "DKK")!.amount)
      : null);
  const image = product.images?.[0];

  return (
    <Link
      href={`/catalog/item/${product.slug ?? ""}`}
      className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2 text-xs hover:border-brand-primary transition-colors"
    >
      {image ? (
        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded">
          <Image src={image} alt={name} fill sizes="40px" className="object-cover" />
        </div>
      ) : (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-surface text-brand-accent/40 text-[10px]">
          ?
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground line-clamp-1">{name}</p>
        {price !== null && (
          <p className="text-brand-accent">{formatPrice(price, "DKK")}</p>
        )}
      </div>
    </Link>
  );
}

function ToolCallIndicator({ toolName }: { toolName: string }) {
  const labels: Record<string, string> = {
    searchProducts: "Søger produkter...",
    getProductDetails: "Henter detaljer...",
    getCategories: "Finder kategorier...",
    getFAQ: "Søger i FAQ...",
    buildOutfit: "Sammensætter outfit...",
    findGift: "Finder gaver...",
    getMaterialInfo: "Henter materialeinfo...",
    getSizeRecommendation: "Finder størrelse...",
    addToCart: "Tilføjer til kurv...",
    getCart: "Henter kurv...",
  };

  return (
    <div className="flex items-center gap-2 text-xs text-brand-accent animate-pulse">
      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {labels[toolName] ?? `${toolName}...`}
    </div>
  );
}

export function ChatPanel() {
  const t = useTranslations("chat");
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addItem = useCartStore((s) => s.addItem);

  const { messages, sendMessage, status } = useChat({
    transport,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const suggestions = [
    { label: t("suggestions.dressMe"), prompt: "Klæd mig på til en skitur" },
    { label: t("suggestions.findGift"), prompt: "Find en gave til under 500 kr" },
    { label: t("suggestions.merinoWool"), prompt: "Hvad er merinould?" },
    { label: t("suggestions.myCart"), prompt: "Hvad er i min kurv?" },
  ];

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[80] flex h-[32rem] w-[22rem] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl sm:w-96">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-brand-primary px-4 py-3 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
              D
            </div>
            <div>
              <p className="text-sm font-semibold">{t("title")}</p>
              <p className="text-[11px] opacity-80">Dilling 1916</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-brand-accent">{t("greeting")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => {
                        sendMessage({ text: s.prompt });
                      }}
                      className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground hover:border-brand-primary hover:text-brand-primary transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((msg) => {
                  const text = getMessageText(msg);
                  const products = getToolResultProducts(msg);
                  const pendingTools = (msg.parts ?? []).filter(
                    (p) => p.type === "tool-invocation" && (p as { toolInvocation?: { state: string } }).toolInvocation?.state !== "result"
                  );

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col gap-1.5 ${
                        msg.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      {text && (
                        <div
                          className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-brand-primary text-white"
                              : "bg-surface text-foreground"
                          }`}
                        >
                          {text}
                        </div>
                      )}
                      {/* Tool call indicators */}
                      {pendingTools.map((p, i) => (
                        <ToolCallIndicator
                          key={i}
                          toolName={(p as { toolInvocation?: { toolName: string } }).toolInvocation?.toolName ?? ""}
                        />
                      ))}
                      {/* Product results */}
                      {products.length > 0 && (
                        <div className="flex w-full flex-col gap-1.5 max-w-[85%]">
                          {products.slice(0, 4).map((p, i) => (
                            <ProductMiniCard key={i} product={p} />
                          ))}
                          {products.length > 4 && (
                            <p className="text-[11px] text-brand-accent">
                              +{products.length - 4} mere...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex items-center gap-2 px-1 text-xs text-brand-accent">
                    <span className="animate-pulse">Tænker...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            id="chat-form"
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
              placeholder={t("placeholder")}
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
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
