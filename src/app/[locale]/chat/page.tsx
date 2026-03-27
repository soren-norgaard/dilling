"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslations } from "next-intl";
import Image from "next/image";
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
  translations?: { locale: string; name: string }[];
  prices?: { currency: string; amount: number | string }[];
  material?: string;
}

function getToolResultProducts(message: { parts?: { type: string; toolInvocation?: { toolName: string; state: string; result?: { products?: ProductHit[]; gifts?: ProductHit[]; outfit?: { layer: string; products: ProductHit[] }[] } } }[] }): ProductHit[] {
  if (!message.parts) return [];
  const products: ProductHit[] = [];
  for (const part of message.parts) {
    if (part.type === "tool-invocation" && part.toolInvocation?.state === "result") {
      const r = part.toolInvocation.result;
      if (r?.products) products.push(...r.products);
      if (r?.gifts) products.push(...r.gifts);
      if (r?.outfit) {
        for (const layer of r.outfit) products.push(...layer.products);
      }
    }
  }
  return products;
}

function ProductCard({ product }: { product: ProductHit }) {
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
      className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-3 hover:shadow-md transition-shadow"
    >
      {image ? (
        <div className="relative h-16 w-14 flex-shrink-0 overflow-hidden rounded-lg">
          <Image src={image} alt={name} fill sizes="56px" className="object-cover" />
        </div>
      ) : (
        <div className="flex h-16 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-surface text-brand-accent/40">?</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground line-clamp-1">{name}</p>
        {product.material && (
          <p className="text-xs text-brand-accent">{product.material.replace(/_/g, " ")}</p>
        )}
        {price !== null && (
          <p className="text-sm font-semibold text-foreground">{formatPrice(price, "DKK")}</p>
        )}
      </div>
    </Link>
  );
}

export default function ChatPage() {
  const t = useTranslations("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport,
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const suggestions = [
    { label: t("suggestions.dressMe"), prompt: "Klæd mig på til en skitur i koldt vejr" },
    { label: t("suggestions.findGift"), prompt: "Find en gave til min kæreste under 500 kr" },
    { label: t("suggestions.merinoWool"), prompt: "Fortæl mig om merinould" },
    { label: t("suggestions.trackOrder"), prompt: "Spor min seneste ordre" },
  ];

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col px-4 py-4">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary text-white text-2xl font-bold">
              D
            </div>
            <h1 className="text-2xl font-bold text-brand-primary">{t("title")}</h1>
            <p className="max-w-md text-sm text-brand-accent">{t("greeting")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  onClick={() => {
                    sendMessage({ text: s.prompt });
                  }}
                  className="rounded-full border border-border bg-surface-raised px-4 py-2 text-sm text-foreground hover:border-brand-primary hover:text-brand-primary transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-4">
            {messages.map((msg) => {
              const text = getMessageText(msg);
              const products = getToolResultProducts(msg);
              const pendingTools = (msg.parts ?? []).filter(
                (p) => p.type === "tool-invocation" && (p as { toolInvocation?: { state: string } }).toolInvocation?.state !== "result"
              );

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  {text && (
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-brand-primary text-white"
                          : "bg-surface text-foreground"
                      }`}
                    >
                      {text}
                    </div>
                  )}
                  {pendingTools.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-brand-accent animate-pulse">
                      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Søger...
                    </div>
                  ))}
                  {products.length > 0 && (
                    <div className="grid w-full max-w-[75%] gap-2 sm:grid-cols-2">
                      {products.slice(0, 6).map((p, i) => (
                        <ProductCard key={i} product={p} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="text-xs text-brand-accent animate-pulse">Tænker...</div>
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
