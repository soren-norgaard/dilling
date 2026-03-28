import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
import { z } from "zod";
import { agentModel, registerToolSchemas } from "@/lib/ai";
import { db } from "@/lib/db";
import { searchClient, INDEXES } from "@/lib/meilisearch";
import { searchKnowledgeBase } from "@/lib/knowledge-base";

/** Zod schemas for shopper-specific tools */
const schemas = {
  searchProducts: z.object({
    query: z.string().describe("Search query text"),
    gender: z.enum(["WOMEN", "MEN", "CHILDREN", "BABY"]).optional(),
    material: z.enum(["MERINO_WOOL", "COTTON", "WOOL_SILK", "CASHMERE", "LAMB_WOOL", "MERINO_FLEECE", "MERINO_TERRY"]).optional(),
    maxPrice: z.number().optional().describe("Maximum price in DKK"),
    limit: z.number().optional().default(8),
  }),
  buildOutfit: z.object({
    activity: z.string().describe("Activity: skiing, hiking, running, yoga, everyday"),
    gender: z.enum(["WOMEN", "MEN", "CHILDREN", "BABY"]),
    climate: z.enum(["cold", "mild", "warm"]).optional(),
  }),
  findGift: z.object({
    budget: z.number().describe("Maximum budget in DKK"),
    recipientGender: z.enum(["WOMEN", "MEN", "CHILDREN", "BABY"]),
    occasion: z.string().optional(),
  }),
  compareProducts: z.object({
    slugs: z.array(z.string()).min(2).describe("Product slugs to compare"),
  }),
  addToCart: z.object({
    productSlug: z.string(),
    size: z.string(),
    color: z.string(),
    quantity: z.number().optional().default(1),
  }),
  getMaterialInfo: z.object({
    material: z.string().describe("Material name"),
  }),
} as const;

const jsonSchemaMap: Record<string, object> = {};
for (const [name, schema] of Object.entries(schemas)) {
  const js = z.toJSONSchema(schema);
  const { $schema, ...rest } = js as Record<string, unknown>;
  jsonSchemaMap[name] = rest;
}
registerToolSchemas(jsonSchemaMap);

const SHOPPER_PROMPT = `You are Dilling's personal shopping assistant — a dedicated style advisor focused on helping users find and purchase products efficiently.

About Dilling:
- Danish family-owned company (est. 1916, Bredsten, Denmark)
- Organic merino wool & cotton clothing
- Products for women, men, children, and babies
- Nordic Swan Ecolabel certified, GOTS organic cotton, mulesing-free merino

Your role:
- Guide users through product selection with focused recommendations
- Build complete outfits for activities and occasions
- Compare products to help with decisions
- Manage cart additions
- Stay concise and action-oriented — prioritize showing products over lengthy descriptions
- Always search the catalog — never invent products

When a user describes what they need, immediately search for relevant products and present options with clear pricing.
For outfit building, suggest layered combinations and offer to add all items at once.
When comparing, highlight the key differences that matter for the user's use case.`;

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    const modelMessages = messages[0]?.parts
      ? await convertToModelMessages(messages)
      : messages;

    const result = streamText({
      model: agentModel,
      system: SHOPPER_PROMPT,
      messages: modelMessages,
      tools: {
        searchProducts: tool({
          description: "Search products with optional filters",
          parameters: schemas.searchProducts,
          execute: async ({ query, gender, material, maxPrice, limit }) => {
            try {
              const filters: string[] = ["isActive = true"];
              if (gender) filters.push(`gender = "${gender}"`);
              if (material) filters.push(`material = "${material}"`);
              if (maxPrice) filters.push(`priceAmount <= ${maxPrice}`);
              const result = await searchClient.index(INDEXES.PRODUCTS).search(query, {
                filter: filters.join(" AND "),
                limit: limit ?? 8,
              });
              return { products: result.hits, total: result.estimatedTotalHits };
            } catch {
              const where: Record<string, unknown> = { isActive: true };
              if (gender) where.gender = gender;
              if (material) where.material = material;
              const products = await db.product.findMany({
                where,
                include: { translations: true, prices: true },
                take: limit ?? 8,
              });
              return { products, total: products.length };
            }
          },
        }),

        buildOutfit: tool({
          description: "Build a complete outfit for an activity",
          parameters: schemas.buildOutfit,
          execute: async ({ activity, gender, climate }) => {
            const layers = climate === "warm"
              ? ["t-shirt", "shorts", "socks"]
              : climate === "cold"
                ? ["base layer top", "base layer leggings", "socks", "hat"]
                : ["base layer", "leggings", "socks"];

            const outfitParts = await Promise.all(
              layers.map(async (layer) => {
                try {
                  const result = await searchClient.index(INDEXES.PRODUCTS).search(
                    `${activity} ${layer}`,
                    { filter: `gender = "${gender}" AND isActive = true`, limit: 2 }
                  );
                  return { layer, products: result.hits };
                } catch {
                  return { layer, products: [] };
                }
              })
            );
            return { activity, gender, climate, outfit: outfitParts };
          },
        }),

        findGift: tool({
          description: "Find gift suggestions within a budget",
          parameters: schemas.findGift,
          execute: async ({ budget, recipientGender }) => {
            try {
              const result = await searchClient.index(INDEXES.PRODUCTS).search("", {
                filter: `gender = "${recipientGender}" AND isActive = true AND priceAmount <= ${budget}`,
                limit: 8,
                sort: ["priceAmount:desc"],
              });
              return { gifts: result.hits, budget };
            } catch {
              return { gifts: [], budget };
            }
          },
        }),

        compareProducts: tool({
          description: "Compare products side by side",
          parameters: schemas.compareProducts,
          execute: async ({ slugs }) => {
            const products = await db.product.findMany({
              where: { slug: { in: slugs } },
              include: { translations: true, prices: true },
            });
            return {
              comparison: products.map((p) => ({
                slug: p.slug,
                name: p.translations.find((t) => t.locale === "DA")?.name ?? p.slug,
                material: p.material,
                sizes: p.sizes,
                certifications: p.certifications,
                price: p.prices.find((pr) => pr.currency === "DKK") ? Number(p.prices.find((pr) => pr.currency === "DKK")!.amount) : null,
                images: p.images,
              })),
            };
          },
        }),

        addToCart: tool({
          description: "Add a product to the cart",
          parameters: schemas.addToCart,
          execute: async ({ productSlug, size, color, quantity }) => {
            const product = await db.product.findUnique({
              where: { slug: productSlug },
              include: { translations: true, prices: true },
            });
            if (!product) return { error: "Product not found" };
            const price = product.prices.find((p) => p.currency === "DKK");
            return {
              added: true,
              product: {
                id: product.id,
                slug: product.slug,
                name: product.translations.find((t) => t.locale === "DA")?.name ?? product.slug,
                size, color, quantity,
                price: price ? Number(price.amount) : 0,
                currency: "DKK",
                image: product.images[0] ?? null,
              },
            };
          },
        }),

        getMaterialInfo: tool({
          description: "Get material information and care instructions",
          parameters: schemas.getMaterialInfo,
          execute: async ({ material }) => {
            const articles = searchKnowledgeBase(material, { category: "Materials", limit: 2 });
            const careArticles = searchKnowledgeBase(`${material} care`, { category: "Care", limit: 1 });
            return { materialInfo: articles, careInfo: careArticles };
          },
        }),
      },
      stopWhen: stepCountIs(8),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Shopper agent error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Shopper agent error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
