/**
 * Dilling Database Seeder
 *
 * Seeds the database with 1800 scraped products from dk.dilling.com
 * and configures Meilisearch indexes.
 *
 * Usage: npx tsx scripts/seed.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { MeiliSearch } from "meilisearch";
import { readFileSync } from "fs";
import { join } from "path";
import { buildSizeGuide } from "../src/lib/size-charts";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://dilling:dilling_dev_2026@localhost:5432/dilling";

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST ?? "http://localhost:7700";
const MEILISEARCH_KEY = process.env.MEILISEARCH_MASTER_KEY ?? "dilling_search_key_2026";

const DKK_TO_EUR = 0.134;

interface ScrapedProduct {
  slug: string;
  sku: string;
  url: string;
  name: string;
  nameDa: string;
  priceDKK: number;
  gender: string;
  material: string;
  tags: string[];
  images: string[];
  sizes: string[];
  colorName: string;
  colorHex: string;
  productType: string;
  // Enriched fields from real page scrape
  description?: string;
  materialDescription?: string;
  materialWeight?: string;
  layer?: string;
  fit?: string;
  fitKey?: string;
  layerKey?: string;
  sizeGuideImage?: string;
}

function loadScrapedProducts(): ScrapedProduct[] {
  const seedPath = join(__dirname, "products-seed.json");
  const raw = readFileSync(seedPath, "utf-8");
  return JSON.parse(raw) as ScrapedProduct[];
}

// Map gender/material to valid Prisma enum values
const GENDER_MAP: Record<string, string> = {
  WOMEN: "WOMEN", MEN: "MEN", CHILDREN: "CHILDREN", BABY: "BABY", UNISEX: "UNISEX",
};
const MATERIAL_MAP: Record<string, string> = {
  MERINO_WOOL: "MERINO_WOOL", COTTON: "COTTON", WOOL_SILK: "WOOL_SILK",
  CASHMERE: "CASHMERE", LAMB_WOOL: "LAMB_WOOL", MERINO_FLEECE: "MERINO_FLEECE",
  MERINO_TERRY: "MERINO_TERRY", RECYCLED_NYLON: "MERINO_WOOL",
  RECYCLED_POLYESTER: "MERINO_WOOL", WOOL_COTTON: "COTTON",
  MERINO_ALPACA: "MERINO_WOOL", SOFTSHELL: "MERINO_WOOL",
};

function genderCategory(gender: string): string {
  switch (gender) {
    case "WOMEN": return "dame";
    case "MEN": return "herre";
    case "CHILDREN": return "boern";
    case "BABY": return "baby";
    default: return "dame";
  }
}

async function main() {
  console.log("🧶 Dilling Database Seeder");
  console.log("=".repeat(40));

  // Load scraped products
  const scraped = loadScrapedProducts();
  console.log(`\n📦 Loaded ${scraped.length} scraped products`);

  // Connect to database
  const pool = new Pool({ connectionString: DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Connect to Meilisearch
  const meili = new MeiliSearch({ host: MEILISEARCH_HOST, apiKey: MEILISEARCH_KEY });

  try {
    // 1. Seed categories
    console.log("\n📁 Seeding categories...");
    const categories = [
      { slug: "dame", translations: [{ locale: "DA", name: "Dame" }, { locale: "EN", name: "Women" }] },
      { slug: "herre", translations: [{ locale: "DA", name: "Herre" }, { locale: "EN", name: "Men" }] },
      { slug: "boern", translations: [{ locale: "DA", name: "Børn" }, { locale: "EN", name: "Children" }] },
      { slug: "baby", translations: [{ locale: "DA", name: "Baby" }, { locale: "EN", name: "Baby" }] },
      { slug: "activewear", translations: [{ locale: "DA", name: "Activewear" }, { locale: "EN", name: "Activewear" }] },
      { slug: "undertoej", translations: [{ locale: "DA", name: "Undertøj" }, { locale: "EN", name: "Underwear" }] },
      { slug: "hverdagstoej", translations: [{ locale: "DA", name: "Hverdagstøj" }, { locale: "EN", name: "Everyday Wear" }] },
      { slug: "sokker", translations: [{ locale: "DA", name: "Sokker og strømper" }, { locale: "EN", name: "Socks" }] },
      { slug: "accessories", translations: [{ locale: "DA", name: "Accessories" }, { locale: "EN", name: "Accessories" }] },
    ];

    for (const cat of categories) {
      await prisma.category.upsert({
        where: { slug: cat.slug },
        update: {},
        create: {
          slug: cat.slug,
          translations: {
            create: cat.translations.map((t) => ({
              locale: t.locale as "DA" | "EN",
              name: t.name,
            })),
          },
        },
      });
    }
    console.log(`  ✅ ${categories.length} categories seeded`);

    // 2. Seed products from scraped data
    console.log(`\n🧶 Seeding ${scraped.length} products...`);
    let seeded = 0;

    for (const p of scraped) {
      const gender = GENDER_MAP[p.gender] ?? "WOMEN";
      const material = MATERIAL_MAP[p.material] ?? "MERINO_WOOL";
      const eurPrice = Math.round(p.priceDKK * DKK_TO_EUR * 100) / 100;

      // Build descriptions
      const descDa = p.description || `${p.productType} i ${p.material.toLowerCase().replace(/_/g, " ")}. Fra dk.dilling.com.`;
      const descEn = p.description
        ? p.description  // Real descriptions are in Danish, still better than generated
        : `${p.productType} in ${p.material.toLowerCase().replace(/_/g, " ")}. From dk.dilling.com.`;

      // Build care instructions from material data
      const careInfo = [p.materialDescription, p.materialWeight, p.layer, p.fit].filter(Boolean).join(". ");

      // Build size guide from standard charts
      const sizeGuide = buildSizeGuide(p.gender, p.sizes);

      try {
        const existing = await prisma.product.findUnique({ where: { sku: p.sku } });

        if (existing) {
          // Update ALL fields for existing products
          await prisma.product.update({
            where: { sku: p.sku },
            data: {
              images: p.images,
              sizes: p.sizes.length > 0 ? p.sizes : undefined,
              colors: [{ name: p.colorName, hex: p.colorHex }],
              materialWeight: p.materialWeight || null,
              fit: p.fit || null,
              layer: p.layer || null,
              sizeGuide: sizeGuide ?? undefined,
            },
          });
          // Update translations
          await prisma.productTranslation.updateMany({
            where: { productId: existing.id, locale: "DA" },
            data: { name: p.nameDa, description: descDa, careInstructions: careInfo },
          });
          await prisma.productTranslation.updateMany({
            where: { productId: existing.id, locale: "EN" },
            data: { name: p.name, description: descEn, careInstructions: careInfo },
          });
          // Update prices
          await prisma.price.updateMany({
            where: { productId: existing.id, currency: "DKK" },
            data: { amount: p.priceDKK },
          });
          await prisma.price.updateMany({
            where: { productId: existing.id, currency: "EUR" },
            data: { amount: eurPrice },
          });
        } else {
          await prisma.product.create({
            data: {
              sku: p.sku,
              slug: p.slug,
              material: material as any,
              gender: gender as any,
              tags: p.tags as any[],
              images: p.images,
              sizes: p.sizes,
              colors: [{ name: p.colorName, hex: p.colorHex }],
              certifications: [],
              materialWeight: p.materialWeight || null,
              fit: p.fit || null,
              layer: p.layer || null,
              sizeGuide: sizeGuide ?? undefined,
              translations: {
                create: [
                  { locale: "DA" as const, name: p.nameDa, description: descDa, careInstructions: careInfo },
                  { locale: "EN" as const, name: p.name, description: descEn, careInstructions: careInfo },
                ],
              },
              prices: {
                create: [
                  { currency: "DKK" as const, amount: p.priceDKK },
                  { currency: "EUR" as const, amount: eurPrice },
                ],
              },
            },
          });
        }
        seeded++;
        if (seeded % 100 === 0) {
          console.log(`  Progress: ${seeded}/${scraped.length}`);
        }
      } catch (e) {
        // Skip duplicates (same slug but different SKU)
      }
    }
    console.log(`  ✅ ${seeded} products seeded`);

    // 3. Link products to categories
    console.log("\n🔗 Linking products to categories...");
    const allProducts = await prisma.product.findMany({ select: { id: true, gender: true, tags: true } });
    const catMap = new Map<string, string>();
    const allCats = await prisma.category.findMany({ select: { id: true, slug: true } });
    for (const c of allCats) catMap.set(c.slug, c.id);

    for (const prod of allProducts) {
      const genderCat = catMap.get(genderCategory(prod.gender));
      if (genderCat) {
        await prisma.categoriesOnProducts.upsert({
          where: { productId_categoryId: { productId: prod.id, categoryId: genderCat } },
          update: {},
          create: { productId: prod.id, categoryId: genderCat },
        }).catch(() => {});
      }
    }
    console.log(`  ✅ Products linked to categories`);

    // 4. Configure Meilisearch
    console.log("\n🔍 Configuring Meilisearch...");
    const productsIndex = meili.index("products");

    await productsIndex.updateSettings({
      searchableAttributes: ["name", "sku", "material", "description", "productType", "colorName", "materialDescription"],
      filterableAttributes: [
        "gender", "material", "tags", "priceAmount", "sizes", "colorName", "isActive", "productType",
        "fit", "layer", "materialWeight",
      ],
      sortableAttributes: ["priceAmount", "name", "createdAt"],
      rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
      synonyms: {
        merinould: ["merino wool", "merino", "uld"],
        uld: ["wool", "merinould"],
        bomuld: ["cotton", "økologisk bomuld"],
        dame: ["women", "kvinder"],
        herre: ["men", "mænd"],
        børn: ["children", "kids", "born"],
        baby: ["infant", "spædbarn"],
        undertøj: ["underwear", "base layer"],
        undertrøje: ["base layer top", "undershirt"],
        leggings: ["tights", "strømpebukser"],
        t_shirt: ["tee", "t-shirt"],
        trøje: ["sweater", "pullover"],
        hættetrøje: ["hoodie"],
        bukser: ["pants", "trousers"],
      },
    });

    // Index all products
    const indexProducts = await prisma.product.findMany({
      include: { translations: true, prices: true },
    });

    const docs = indexProducts.map((p) => {
      const da = p.translations.find((t) => t.locale === "DA");
      const en = p.translations.find((t) => t.locale === "EN");
      const dkk = p.prices.find((pr) => pr.currency === "DKK");

      return {
        id: p.id,
        sku: p.sku,
        slug: p.slug,
        name: da?.name ?? en?.name ?? p.slug,
        description: da?.description ?? en?.description ?? "",
        gender: p.gender,
        material: p.material,
        tags: p.tags,
        sizes: p.sizes,
        colors: p.colors,
        colorName: (p.colors as any[])?.[0]?.name ?? "",
        images: p.images,
        priceAmount: dkk ? Number(dkk.amount) : 0,
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
        materialWeight: p.materialWeight ?? "",
        fit: p.fit ?? "",
        layer: p.layer ?? "",
      };
    });

    await productsIndex.addDocuments(docs, { primaryKey: "id" });
    console.log(`  ✅ ${docs.length} products indexed in Meilisearch`);

    // 5. Seed exchange rates
    console.log("\n💱 Seeding exchange rates...");
    const rates = [
      { baseCurrency: "DKK", targetCurrency: "EUR", rate: 0.134 },
      { baseCurrency: "DKK", targetCurrency: "SEK", rate: 1.54 },
      { baseCurrency: "DKK", targetCurrency: "NOK", rate: 1.56 },
      { baseCurrency: "DKK", targetCurrency: "GBP", rate: 0.115 },
      { baseCurrency: "DKK", targetCurrency: "USD", rate: 0.145 },
    ];

    for (const rate of rates) {
      await prisma.exchangeRate.upsert({
        where: {
          baseCurrency_targetCurrency: {
            baseCurrency: rate.baseCurrency as "DKK",
            targetCurrency: rate.targetCurrency as "EUR" | "SEK" | "NOK" | "GBP" | "USD",
          },
        },
        update: { rate: rate.rate },
        create: {
          baseCurrency: rate.baseCurrency as "DKK",
          targetCurrency: rate.targetCurrency as "EUR" | "SEK" | "NOK" | "GBP" | "USD",
          rate: rate.rate,
        },
      });
    }
    console.log(`  ✅ ${rates.length} exchange rates seeded`);

    console.log("\n✅ Seed complete!");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(console.error);
