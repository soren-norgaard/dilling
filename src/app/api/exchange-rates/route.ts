import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/exchange-rates
 * Returns current exchange rates (DKK base).
 * Tries external API first, then falls back to DB, then hardcoded defaults.
 */
export async function GET() {
  // Default rates (DKK base)
  const defaults: Record<string, number> = {
    DKK: 1,
    EUR: 0.134,
    SEK: 1.54,
    NOK: 1.56,
    GBP: 0.115,
    USD: 0.145,
  };

  // Try fetching from exchangerate-api.com if key is configured
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/latest/DKK`,
        { next: { revalidate: 3600 } } // cache 1 hour
      );
      if (res.ok) {
        const data = await res.json();
        const conversionRates = data.conversion_rates;
        if (conversionRates) {
          const rates: Record<string, number> = {};
          for (const code of Object.keys(defaults)) {
            rates[code] = conversionRates[code] ?? defaults[code];
          }

          // Persist to DB for fallback
          for (const [code, rate] of Object.entries(rates)) {
            await db.exchangeRate.upsert({
              where: { pair: `DKK_${code}` },
              update: { rate, updatedAt: new Date() },
              create: { pair: `DKK_${code}`, rate },
            });
          }

          return NextResponse.json({ source: "api", base: "DKK", rates });
        }
      }
    } catch {
      // Fall through to DB
    }
  }

  // Fallback: read from DB
  try {
    const dbRates = await db.exchangeRate.findMany();
    if (dbRates.length > 0) {
      const rates: Record<string, number> = {};
      for (const r of dbRates) {
        const target = r.pair.replace("DKK_", "");
        rates[target] = r.rate;
      }
      if (!rates.DKK) rates.DKK = 1;
      return NextResponse.json({ source: "database", base: "DKK", rates });
    }
  } catch {
    // Fall through to defaults
  }

  return NextResponse.json({ source: "defaults", base: "DKK", rates: defaults });
}
