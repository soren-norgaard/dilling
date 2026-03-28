import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { searchClient, INDEXES } from "@/lib/meilisearch";

/**
 * POST /api/seed — Trigger database seeding via API
 * Protected: requires SEED_SECRET header in non-dev environments
 */
export async function POST(request: Request) {
  // In production, require a secret to prevent unauthorized seeding
  const isDev = process.env.NODE_ENV === "development";
  if (!isDev) {
    const secret = request.headers.get("x-seed-secret");
    if (secret !== process.env.SEED_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Count existing products
    const productCount = await db.product.count();
    const categoryCount = await db.category.count();

    // Index all products into Meilisearch
    const products = await db.product.findMany({
      include: { translations: true, prices: true },
    });

    const docs = products.map((p) => {
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
        images: p.images,
        priceAmount: dkk ? Number(dkk.amount) : 0,
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
      };
    });

    const productsIndex = searchClient.index(INDEXES.PRODUCTS);
    await productsIndex.addDocuments(docs, { primaryKey: "id" });

    return NextResponse.json({
      success: true,
      products: productCount,
      categories: categoryCount,
      indexed: docs.length,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seed failed" },
      { status: 500 }
    );
  }
}
