"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { DillingImage } from "@/components/ui/dilling-image";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isToolPart(part: any): part is { type: string; toolName?: string; state?: string; output?: Record<string, unknown> } {
  if (!part || typeof part.type !== "string") return false;
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getToolNameFromPart(part: any): string {
  if (part.toolName) return part.toolName;
  if (typeof part.type === "string" && part.type.startsWith("tool-")) return part.type.slice(5);
  return "";
}

/** Extract tool result data (products, outfit, comparison, material info) from message parts */
function getToolResultData(message: { parts?: Array<Record<string, unknown>> }): {
  products: ProductHit[];
  outfit: { layer: string; products: ProductHit[] }[];
  comparison: { slug: string; name: string; material: string; price: number | null; sizes?: string[]; certifications?: string[] }[];
  materialInfo: { title?: string; content?: string; keywords?: string[] }[];
  giftBudget: number | null;
} {
  const products: ProductHit[] = [];
  const outfit: { layer: string; products: ProductHit[] }[] = [];
  const comparison: { slug: string; name: string; material: string; price: number | null; sizes?: string[]; certifications?: string[] }[] = [];
  const materialInfo: { title?: string; content?: string; keywords?: string[] }[] = [];
  let giftBudget: number | null = null;

  if (!message.parts) return { products, outfit, comparison, materialInfo, giftBudget };

  for (const part of message.parts) {
    if (!isToolPart(part) || part.state !== "output-available") continue;
    const result = part.output as Record<string, unknown> | undefined;
    if (!result) continue;
    if (result?.products) products.push(...(result.products as ProductHit[]));
    if (result?.gifts) {
      products.push(...(result.gifts as ProductHit[]));
      if (result?.budget) giftBudget = result.budget as number;
    }
    if (result?.outfit) outfit.push(...(result.outfit as { layer: string; products: ProductHit[] }[]));
    if (result?.comparison) comparison.push(...(result.comparison as typeof comparison));
    if (result?.materialInfo) materialInfo.push(...(result.materialInfo as typeof materialInfo));
  }
  return { products, outfit, comparison, materialInfo, giftBudget };
}

/** Outfit bundle card — shows layers with products and total price */
function OutfitBundleCard({ outfit }: { outfit: { layer: string; products: ProductHit[] }[] }) {
  const total = outfit.reduce((sum, l) => {
    const first = l.products[0];
    const price = first?.priceAmount ?? (first?.prices?.find((p) => p.currency === "DKK") ? Number(first.prices.find((p) => p.currency === "DKK")!.amount) : 0);
    return sum + (price ?? 0);
  }, 0);

  return (
    <div className="w-full max-w-[90%] rounded-lg border border-brand-primary/30 bg-brand-primary/5 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-primary"><path d="M20.38 3.46 16 2 12 5.5 8 2 3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>
        <span className="text-xs font-semibold text-brand-primary">Komplet outfit</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {outfit.map((layer, i) => {
          const p = layer.products[0];
          const name = p?.name ?? p?.translations?.find((t) => t.locale === "DA")?.name ?? "—";
          const price = p?.priceAmount ?? (p?.prices?.find((pr) => pr.currency === "DKK") ? Number(p.prices!.find((pr) => pr.currency === "DKK")!.amount) : null);
          return (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-16 flex-shrink-0 font-medium text-brand-accent capitalize">{layer.layer}</span>
                <span className="text-foreground line-clamp-1">{name}</span>
              </div>
              {price !== null && <span className="flex-shrink-0 text-brand-accent">{formatPrice(price, "DKK")}</span>}
            </div>
          );
        })}
      </div>
      {total > 0 && (
        <div className="mt-2 flex items-center justify-between border-t border-brand-primary/20 pt-2 text-xs font-semibold">
          <span className="text-foreground">Total</span>
          <span className="text-brand-primary">{formatPrice(total, "DKK")}</span>
        </div>
      )}
    </div>
  );
}

/** Comparison card — side-by-side table */
function ComparisonCard({ comparison }: { comparison: { slug: string; name: string; material: string; price: number | null; sizes?: string[]; certifications?: string[] }[] }) {
  return (
    <div className="w-full max-w-[90%] overflow-x-auto rounded-lg border border-border bg-surface p-2">
      <div className="mb-1.5 flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-accent"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/></svg>
        <span className="text-[11px] font-semibold text-brand-accent">Sammenligning</span>
      </div>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-border">
            <th className="p-1 text-left font-medium text-brand-accent">Produkt</th>
            <th className="p-1 text-left font-medium text-brand-accent">Materiale</th>
            <th className="p-1 text-right font-medium text-brand-accent">Pris</th>
          </tr>
        </thead>
        <tbody>
          {comparison.map((p) => (
            <tr key={p.slug} className="border-b border-border/50 last:border-0">
              <td className="p-1 text-foreground">{p.name}</td>
              <td className="p-1 text-foreground">{p.material?.replace(/_/g, " ").toLowerCase()}</td>
              <td className="p-1 text-right text-foreground">{p.price ? formatPrice(p.price, "DKK") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Material education card */
function MaterialEducationCard({ info }: { info: { title?: string; content?: string }[] }) {
  return (
    <div className="w-full max-w-[90%] rounded-lg border border-brand-accent/20 bg-surface p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-accent"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        <span className="text-[11px] font-semibold text-brand-accent">Materiale info</span>
      </div>
      {info.map((article, i) => (
        <div key={i} className={i > 0 ? "mt-2 border-t border-border pt-2" : ""}>
          {article.title && <p className="text-xs font-medium text-foreground">{article.title}</p>}
          {article.content && <p className="mt-0.5 text-[11px] text-brand-accent leading-relaxed line-clamp-4">{article.content}</p>}
        </div>
      ))}
    </div>
  );
}

/** Gift suggestion card with budget display */
function GiftSuggestionCard({ products, budget }: { products: ProductHit[]; budget: number }) {
  return (
    <div className="w-full max-w-[90%] rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-primary"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>
          <span className="text-xs font-semibold text-brand-primary">Gaveforslag</span>
        </div>
        <span className="text-[11px] text-brand-accent">Budget: {formatPrice(budget, "DKK")}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {products.slice(0, 4).map((p, i) => (
          <ProductMiniCard key={i} product={p} />
        ))}
      </div>
    </div>
  );
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
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded">
        <DillingImage
          src={image}
          alt={name}
          fill
          sizes="40px"
          className="object-cover"
          fallback={
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-surface text-brand-accent/40 text-[10px]">
              ?
            </div>
          }
        />
      </div>
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
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const addItem = useCartStore((s) => s.addItem);

  const { messages, sendMessage, status } = useChat({
    transport,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Web Speech API for voice input
  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "da-DK";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setInput((prev) => prev + transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const hasVoiceSupport = typeof window !== "undefined" && !!(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );

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
    { label: t("suggestions.trackOrder"), prompt: "Hvor er min ordre?" },
  ];

  // Seasonal greeting context
  const getSeasonalGreeting = () => {
    const month = new Date().getMonth();
    if (month >= 10 || month <= 1) return "Det er vintersæson — vil du se vores varmeste merinould base layers?";
    if (month >= 2 && month <= 4) return "Forår er her — udforsk vores lette bomuld og activewear kollektion!";
    if (month >= 5 && month <= 7) return "Sommertid — perfekt til vores lette bomuldstøj og tynde merinould.";
    return "Efteråret kalder — tid til varme lag i merinould!";
  };

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
        <div className="fixed inset-x-3 bottom-24 z-[80] flex h-[70vh] max-h-[32rem] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl sm:inset-x-auto sm:right-6 sm:left-auto sm:w-96">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-brand-primary px-4 py-3 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
              D
            </div>
            <div>
              <p className="text-sm font-semibold">{t("title")}</p>
              <p className="text-[11px] opacity-80">Din personlige stylist</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-brand-accent">{t("greeting")}</p>
                <p className="text-xs text-brand-accent/80 italic">{getSeasonalGreeting()}</p>
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
                  const { products, outfit, comparison, materialInfo, giftBudget } = getToolResultData(msg);
                  const pendingTools = (msg.parts ?? []).filter(
                    (p) => isToolPart(p) && p.state !== "output-available" && p.state !== "output-error"
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
                          {msg.role === "user" ? (
                            text
                          ) : (
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                ul: ({ children }) => <ul className="mb-1.5 ml-3 list-disc last:mb-0">{children}</ul>,
                                ol: ({ children }) => <ol className="mb-1.5 ml-3 list-decimal last:mb-0">{children}</ol>,
                                li: ({ children }) => <li className="mb-0.5">{children}</li>,
                                h3: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                                h2: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                                a: ({ href, children }) => <a href={href} className="text-brand-primary underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                                img: () => null,
                              }}
                            >
                              {text.replace(/!\[[^\]]*\]\([^)]+\)/g, "")}
                            </ReactMarkdown>
                          )}
                        </div>
                      )}
                      {/* Tool call indicators */}
                      {pendingTools.map((p, i) => (
                        <ToolCallIndicator
                          key={i}
                          toolName={getToolNameFromPart(p)}
                        />
                      ))}
                      {/* Rich cards */}
                      {outfit.length > 0 && <OutfitBundleCard outfit={outfit} />}
                      {comparison.length > 0 && <ComparisonCard comparison={comparison} />}
                      {materialInfo.length > 0 && <MaterialEducationCard info={materialInfo} />}
                      {giftBudget !== null && products.length > 0 && (
                        <GiftSuggestionCard products={products} budget={giftBudget} />
                      )}
                      {/* Product results (non-gift) */}
                      {giftBudget === null && products.length > 0 && (
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
            {hasVoiceSupport && (
              <button
                type="button"
                onClick={toggleVoice}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isListening ? "bg-red-500 text-white animate-pulse" : "text-brand-accent hover:text-brand-primary"}`}
                aria-label={isListening ? "Stop recording" : "Start voice input"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
                </svg>
              </button>
            )}
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
