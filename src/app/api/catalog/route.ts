import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { searchClient, INDEXES } from "@/lib/meilisearch";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") ?? "";
  const gender = searchParams.get("gender");
  const material = searchParams.get("material");
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") ?? "createdAt:desc";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  const locale = searchParams.get("locale") ?? "DA";

  try {
    // Try Meilisearch first
    const filters: string[] = ["isActive = true"];
    if (gender) filters.push(`gender = "${gender}"`);
    if (material) filters.push(`material = "${material}"`);
    if (category) filters.push(`category = "${category}"`);

    const searchResult = await searchClient.index(INDEXES.PRODUCTS).search(query, {
      filter: filters.join(" AND "),
      sort: [sort],
      offset: (page - 1) * limit,
      limit,
    });

    return NextResponse.json({
      products: searchResult.hits,
      total: searchResult.estimatedTotalHits,
      page,
      limit,
    });
  } catch {
    // Fallback to Prisma
    try {
      const where: Record<string, unknown> = { isActive: true };
      if (gender) where.gender = gender;
      if (material) where.material = material;

      const [products, total] = await Promise.all([
        db.product.findMany({
          where,
          include: {
            translations: { where: { locale: locale as "DA" | "EN" } },
            prices: true,
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        db.product.count({ where }),
      ]);

      return NextResponse.json({
        products,
        total,
        page,
        limit,
      });
    } catch (dbError) {
      console.error("Catalog DB fallback error:", dbError);
      return NextResponse.json({
        products: [],
        total: 0,
        page,
        limit,
        error: "Search and database are currently unavailable",
      });
    }
  }
}
