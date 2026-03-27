/**
 * Dilling Database Seeder
 *
 * Seeds the database with product data and configures Meilisearch indexes.
 *
 * Usage: npx tsx scripts/seed.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { MeiliSearch } from "meilisearch";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://dilling:dilling_dev_2026@localhost:5432/dilling";

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST ?? "http://localhost:7700";
const MEILISEARCH_KEY = process.env.MEILISEARCH_MASTER_KEY ?? "dilling_search_key_2026";

async function main() {
  console.log("🧶 Dilling Database Seeder");
  console.log("=".repeat(40));

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
      // Sub-categories
      { slug: "activewear", translations: [{ locale: "DA", name: "Activewear" }, { locale: "EN", name: "Activewear" }] },
      { slug: "undertoej", translations: [{ locale: "DA", name: "Undertøj" }, { locale: "EN", name: "Underwear" }] },
      { slug: "hverdagstoej", translations: [{ locale: "DA", name: "Hverdagstøj" }, { locale: "EN", name: "Everyday Wear" }] },
      { slug: "sokker", translations: [{ locale: "DA", name: "Sokker" }, { locale: "EN", name: "Socks" }] },
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

    // 2. Seed sample products
    console.log("\n🧶 Seeding sample products...");
    const sampleProducts = [
      {
        sku: "fg-9926-0611-263",
        slug: "dame-merinould-t-shirt-sort",
        material: "MERINO_WOOL" as const,
        gender: "WOMEN" as const,
        tags: ["NEW", "ACTIVEWEAR"] as Array<"NEW" | "ACTIVEWEAR">,
        images: ["https://res.cloudinary.com/dilling/image/upload/v1/products/fg-9926-0611-263.jpg"],
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: [{ name: "Sort", hex: "#000000" }],
        certifications: ["GOTS"],
        translations: [
          { locale: "DA", name: "Dame merinould T-shirt", description: "Blød T-shirt i 100% merinould. Temperaturregulerende og lugtreducerende." },
          { locale: "EN", name: "Women's Merino Wool T-shirt", description: "Soft T-shirt in 100% merino wool. Temperature regulating and odor resistant." },
        ],
        prices: [
          { currency: "DKK", amount: 299.00 },
          { currency: "EUR", amount: 39.95 },
        ],
      },
      {
        sku: "mg-8845-0432-157",
        slug: "herre-merinould-base-layer-navy",
        material: "MERINO_WOOL" as const,
        gender: "MEN" as const,
        tags: ["ACTIVEWEAR"] as Array<"ACTIVEWEAR">,
        images: ["https://res.cloudinary.com/dilling/image/upload/v1/products/mg-8845-0432-157.jpg"],
        sizes: ["S", "M", "L", "XL", "XXL"],
        colors: [{ name: "Navy", hex: "#1B2838" }],
        certifications: [],
        translations: [
          { locale: "DA", name: "Herre merinould base layer", description: "Varm base layer i merinould til ski og vandring." },
          { locale: "EN", name: "Men's Merino Wool Base Layer", description: "Warm merino wool base layer for skiing and hiking." },
        ],
        prices: [
          { currency: "DKK", amount: 449.00 },
          { currency: "EUR", amount: 59.95 },
        ],
      },
      {
        sku: "fg-7733-0288-094",
        slug: "dame-bomuld-boxershorts-hvid",
        material: "COTTON" as const,
        gender: "WOMEN" as const,
        tags: [] as Array<never>,
        images: ["https://res.cloudinary.com/dilling/image/upload/v1/products/fg-7733-0288-094.jpg"],
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: [{ name: "Hvid", hex: "#FFFFFF" }, { name: "Sort", hex: "#000000" }],
        certifications: ["GOTS"],
        translations: [
          { locale: "DA", name: "Dame bomuld boxershorts", description: "Økologisk bomuld boxershorts i blød jersey." },
          { locale: "EN", name: "Women's Cotton Boxershorts", description: "Organic cotton boxershorts in soft jersey." },
        ],
        prices: [
          { currency: "DKK", amount: 149.00 },
          { currency: "EUR", amount: 19.95 },
        ],
      },
      {
        sku: "kg-5522-0199-041",
        slug: "boern-uld-silke-body-natur",
        material: "WOOL_SILK" as const,
        gender: "CHILDREN" as const,
        tags: ["SWAN_MARK"] as Array<"SWAN_MARK">,
        images: ["https://res.cloudinary.com/dilling/image/upload/v1/products/kg-5522-0199-041.jpg"],
        sizes: ["80", "86", "92", "98", "104", "110"],
        colors: [{ name: "Natur", hex: "#F5F0E8" }],
        certifications: ["Nordic Swan"],
        translations: [
          { locale: "DA", name: "Børn uld/silke body", description: "Blød body i uld/silke blanding. Perfekt til sensitive børnehud." },
          { locale: "EN", name: "Children's Wool/Silk Bodysuit", description: "Soft bodysuit in wool/silk blend. Perfect for sensitive children's skin." },
        ],
        prices: [
          { currency: "DKK", amount: 199.00 },
          { currency: "EUR", amount: 26.95 },
        ],
      },
      {
        sku: "mg-6644-0355-128",
        slug: "herre-merinould-boxershorts-sort",
        material: "MERINO_WOOL" as const,
        gender: "MEN" as const,
        tags: [] as Array<never>,
        images: ["https://res.cloudinary.com/dilling/image/upload/v1/products/mg-6644-0355-128.jpg"],
        sizes: ["S", "M", "L", "XL", "XXL"],
        colors: [{ name: "Sort", hex: "#000000" }, { name: "Navy", hex: "#1B2838" }],
        certifications: [],
        translations: [
          { locale: "DA", name: "Herre merinould boxershorts", description: "Komfortable boxershorts i 100% merinould." },
          { locale: "EN", name: "Men's Merino Wool Boxershorts", description: "Comfortable boxershorts in 100% merino wool." },
        ],
        prices: [
          { currency: "DKK", amount: 249.00 },
          { currency: "EUR", amount: 33.95 },
        ],
      },
    ];

    for (const p of sampleProducts) {
      const product = await prisma.product.upsert({
        where: { sku: p.sku },
        update: {},
        create: {
          sku: p.sku,
          slug: p.slug,
          material: p.material,
          gender: p.gender,
          tags: p.tags,
          images: p.images,
          sizes: p.sizes,
          colors: p.colors,
          certifications: p.certifications,
          translations: {
            create: p.translations.map((t) => ({
              locale: t.locale as "DA" | "EN",
              name: t.name,
              description: t.description,
            })),
          },
          prices: {
            create: p.prices.map((pr) => ({
              currency: pr.currency as "DKK" | "EUR",
              amount: pr.amount,
            })),
          },
        },
      });
      console.log(`  ✅ ${p.translations[0].name} (${p.sku})`);
    }

    // 3. Configure Meilisearch
    console.log("\n🔍 Configuring Meilisearch...");
    const productsIndex = meili.index("products");

    await productsIndex.updateSettings({
      searchableAttributes: ["name", "sku", "categoryPath", "material", "description"],
      filterableAttributes: [
        "gender", "material", "tags", "category", "priceAmount", "sizes", "colors", "isActive",
      ],
      sortableAttributes: ["priceAmount", "name", "createdAt"],
      rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
      synonyms: {
        merinould: ["merino wool", "merino"],
        uld: ["wool"],
        bomuld: ["cotton"],
        dame: ["women"],
        herre: ["men"],
        børn: ["children"],
      },
    });

    // Index products
    const allProducts = await prisma.product.findMany({
      include: { translations: true, prices: true },
    });

    const docs = allProducts.map((p) => {
      const daTranslation = p.translations.find((t) => t.locale === "DA");
      const enTranslation = p.translations.find((t) => t.locale === "EN");
      const dkkPrice = p.prices.find((pr) => pr.currency === "DKK");

      return {
        id: p.id,
        sku: p.sku,
        slug: p.slug,
        name: daTranslation?.name ?? enTranslation?.name ?? p.slug,
        description: daTranslation?.description ?? enTranslation?.description ?? "",
        gender: p.gender,
        material: p.material,
        tags: p.tags,
        sizes: p.sizes,
        colors: p.colors,
        images: p.images,
        priceAmount: dkkPrice ? Number(dkkPrice.amount) : 0,
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
      };
    });

    await productsIndex.addDocuments(docs);
    console.log(`  ✅ ${docs.length} products indexed in Meilisearch`);

    // 4. Seed exchange rates
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
