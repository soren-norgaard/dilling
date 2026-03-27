import { streamText, tool, convertToModelMessages } from "ai";
import { z } from "zod";
import { agentModel, registerToolSchemas } from "@/lib/ai";
import { db } from "@/lib/db";
import { searchClient, INDEXES } from "@/lib/meilisearch";
import { searchKnowledgeBase } from "@/lib/knowledge-base";

/** Pre-defined zod schemas (needed for JSON Schema conversion) */
const schemas = {
  searchProducts: z.object({
    query: z.string().describe("Search query text"),
    gender: z.enum(["WOMEN", "MEN", "CHILDREN", "BABY"]).optional().describe("Filter by gender"),
    material: z.enum(["MERINO_WOOL", "COTTON", "WOOL_SILK", "CASHMERE", "LAMB_WOOL", "MERINO_FLEECE", "MERINO_TERRY"]).optional().describe("Filter by material"),
    category: z.string().optional().describe("Filter by category slug"),
    limit: z.number().optional().default(10).describe("Max results to return"),
  }),
  getProductDetails: z.object({ slug: z.string().describe("Product slug") }),
  getCategories: z.object({}),
  getFAQ: z.object({
    query: z.string().describe("The question or topic to search for"),
    category: z.string().optional().describe("Optional category filter: About, Materials, Shipping, Returns, Care, Sizing"),
  }),
  buildOutfit: z.object({
    activity: z.string().describe("Activity: skiing, hiking, running, yoga, everyday, office"),
    gender: z.enum(["WOMEN", "MEN", "CHILDREN", "BABY"]).describe("Target gender"),
    climate: z.enum(["cold", "mild", "warm"]).optional().describe("Weather/climate"),
  }),
  findGift: z.object({
    budget: z.number().describe("Maximum budget in DKK"),
    recipientGender: z.enum(["WOMEN", "MEN", "CHILDREN", "BABY"]).describe("Gift recipient gender"),
    occasion: z.string().optional().describe("Occasion: birthday, christmas, valentines, etc."),
  }),
  getMaterialInfo: z.object({ material: z.string().describe("Material to get info about: merino, cotton, wool-silk, cashmere") }),
  getSizeRecommendation: z.object({
    gender: z.enum(["WOMEN", "MEN", "CHILDREN", "BABY"]).describe("Gender"),
    height: z.number().optional().describe("Height in cm"),
    weight: z.number().optional().describe("Weight in kg"),
    fitPreference: z.enum(["slim", "regular", "relaxed"]).optional().describe("Fit preference"),
  }),
  addToCart: z.object({
    productSlug: z.string().describe("Product slug to add"),
    size: z.string().describe("Selected size"),
    color: z.string().describe("Selected color"),
    quantity: z.number().optional().default(1).describe("Quantity"),
  }),
  getCart: z.object({}),
  compareProducts: z.object({ slugs: z.array(z.string()).min(2).describe("Product slugs to compare") }),
  recommendByMood: z.object({
    mood: z.string().describe("Mood: cozy, active, warm, light, elegant, everyday"),
    gender: z.enum(["WOMEN", "MEN", "CHILDREN", "BABY"]).optional(),
  }),
  getSeasonalPicks: z.object({ gender: z.enum(["WOMEN", "MEN", "CHILDREN", "BABY"]).optional() }),
} as const;

/** Pre-build JSON Schema map for tool parameter patching */
const jsonSchemaMap: Record<string, object> = {};
for (const [name, schema] of Object.entries(schemas)) {
  const js = z.toJSONSchema(schema);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema, ...rest } = js as Record<string, unknown>;
  jsonSchemaMap[name] = rest;
}

// Register schemas so the fetch interceptor can patch tool params
registerToolSchemas(jsonSchemaMap);

const SYSTEM_PROMPT = `You are Dilling's AI shopping assistant — a warm, knowledgeable Nordic style advisor specializing in natural materials clothing.

About Dilling:
- Danish family-owned company, founded 1916 in Bredsten, Denmark
- Specializes in organic merino wool and cotton clothing/underwear
- Own dye house in Bredsten — chemical-free dyeing
- Products for women, men, children, and babies
- Categories: activewear (running, skiing, hiking, yoga), underwear, everyday wear, accessories
- Nordic Swan Ecolabel (Svanemærket) certified products
- GOTS-certified organic cotton
- Mulesing-free merino wool

Your personality:
- Warm, helpful, and knowledgeable
- Passionate about natural materials and sustainability
- Speaks naturally in the user's language (Danish or English)
- Proactive — suggest complete outfits, not just single items
- Educational about material properties when relevant

Your capabilities:
- Search and recommend products from the catalog
- Help build complete outfits for activities (skiing, hiking, yoga, etc.)
- Provide size recommendations based on user preferences
- Answer questions about materials, care, shipping, returns
- Manage cart (add/remove items)
- Track orders
- Find gifts within a budget

Always use tools to search for products rather than making up product names. If you don't find what the user is looking for, say so honestly.`;

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    // Client sends UIMessages (with parts); convert to ModelMessages for streamText
    const modelMessages = messages[0]?.parts
      ? await convertToModelMessages(messages)
      : messages;

    const result = streamText({
      model: agentModel,
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools: {
      searchProducts: tool({
        description: "Search the product catalog by query text and optional filters. Use this to find products for the user.",
        parameters: schemas.searchProducts,
        execute: async ({ query, gender, material, category, limit }) => {
          try {
            const filters: string[] = ["isActive = true"];
            if (gender) filters.push(`gender = "${gender}"`);
            if (material) filters.push(`material = "${material}"`);
            if (category) filters.push(`category = "${category}"`);

            const result = await searchClient.index(INDEXES.PRODUCTS).search(query, {
              filter: filters.join(" AND "),
              limit: limit ?? 10,
            });

            return { products: result.hits, total: result.estimatedTotalHits };
          } catch {
            // Fallback to Prisma
            const where: Record<string, unknown> = { isActive: true };
            if (gender) where.gender = gender;
            if (material) where.material = material;

            const products = await db.product.findMany({
              where,
              include: {
                translations: true,
                prices: true,
              },
              take: limit ?? 10,
            });
            return { products, total: products.length };
          }
        },
      }),

      getProductDetails: tool({
        description: "Get full details of a specific product by its slug",
        parameters: schemas.getProductDetails,
        execute: async ({ slug }) => {
          const product = await db.product.findUnique({
            where: { slug },
            include: {
              translations: true,
              prices: true,
              categories: {
                include: {
                  category: { include: { translations: true } },
                },
              },
            },
          });
          return product ?? { error: "Product not found" };
        },
      }),

      getCategories: tool({
        description: "List all product categories",
        parameters: schemas.getCategories,
        execute: async () => {
          const categories = await db.category.findMany({
            include: { translations: true },
            orderBy: { slug: "asc" },
          });
          return categories;
        },
      }),

      getFAQ: tool({
        description: "Search the Dilling knowledge base for FAQ answers about shipping, returns, materials, care, sizing, brand story, etc.",
        parameters: schemas.getFAQ,
        execute: async ({ query, category }) => {
          const articles = searchKnowledgeBase(query, { category, limit: 3 });
          return articles.length > 0
            ? { articles }
            : { message: "No matching FAQ articles found." };
        },
      }),

      buildOutfit: tool({
        description: "Build a complete outfit for an activity and gender. Returns multiple products that work together as a layered outfit.",
        parameters: schemas.buildOutfit,
        execute: async ({ activity, gender, climate }) => {
          // Search for outfit components
          const layers = climate === "warm"
            ? ["t-shirt", "shorts"]
            : climate === "cold"
              ? ["base layer", "leggings", "socks", "hat"]
              : ["base layer", "leggings", "socks"];

          const outfitParts = await Promise.all(
            layers.map(async (layer) => {
              try {
                const result = await searchClient.index(INDEXES.PRODUCTS).search(
                  `${activity} ${layer}`,
                  {
                    filter: `gender = "${gender}" AND isActive = true`,
                    limit: 2,
                  }
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
        description: "Find gift suggestions within a budget for a specific recipient",
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
            return { gifts: [], budget, message: "Search unavailable" };
          }
        },
      }),

      getMaterialInfo: tool({
        description: "Get detailed information about a material type (merino wool, cotton, wool-silk, cashmere, etc.)",
        parameters: schemas.getMaterialInfo,
        execute: async ({ material }) => {
          const articles = searchKnowledgeBase(material, { category: "Materials", limit: 2 });
          const careArticles = searchKnowledgeBase(`${material} care wash`, { category: "Care", limit: 1 });
          return { materialInfo: articles, careInfo: careArticles };
        },
      }),

      getSizeRecommendation: tool({
        description: "Get size recommendation based on user info",
        parameters: schemas.getSizeRecommendation,
        execute: async ({ gender, height, weight, fitPreference }) => {
          const sizingArticle = searchKnowledgeBase("size guide", { category: "Sizing", limit: 1 });
          return { gender, height, weight, fitPreference, sizingGuide: sizingArticle };
        },
      }),

      addToCart: tool({
        description: "Add a product to the user's cart. Use this when the user wants to buy something.",
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
              size,
              color,
              quantity,
              price: price ? Number(price.amount) : 0,
              currency: "DKK",
              image: product.images[0] ?? null,
            },
          };
        },
      }),

      getCart: tool({
        description: "Get the current contents of the user's cart",
        parameters: schemas.getCart,
        execute: async () => {
          return { message: "Cart contents are managed client-side. Tell the user to check their cart icon." };
        },
      }),

      compareProducts: tool({
        description: "Compare two or more products side by side on material, price, sizes, certifications",
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
              price: p.prices.find((pr) => pr.currency === "DKK")
                ? Number(p.prices.find((pr) => pr.currency === "DKK")!.amount)
                : null,
              images: p.images,
            })),
          };
        },
      }),

      recommendByMood: tool({
        description: "Recommend products based on a mood or feeling (cozy, active, warm, light, elegant, everyday)",
        parameters: schemas.recommendByMood,
        execute: async ({ mood, gender }) => {
          const moodMap: Record<string, string> = {
            cozy: "merino wool soft warm",
            active: "activewear running skiing hiking",
            warm: "wool silk warm winter base layer",
            light: "cotton summer thin",
            elegant: "slim rib smooth knit",
            everyday: "cotton merino basic",
          };
          const query = moodMap[mood.toLowerCase()] ?? mood;
          try {
            const filters: string[] = ["isActive = true"];
            if (gender) filters.push(`gender = "${gender}"`);
            const result = await searchClient.index(INDEXES.PRODUCTS).search(query, {
              filter: filters.join(" AND "),
              limit: 6,
            });
            return { mood, products: result.hits };
          } catch {
            return { mood, products: [], message: "Search unavailable" };
          }
        },
      }),

      getSeasonalPicks: tool({
        description: "Get seasonal product recommendations based on current time of year",
        parameters: schemas.getSeasonalPicks,
        execute: async ({ gender }) => {
          const month = new Date().getMonth();
          const season = month >= 3 && month <= 5 ? "spring" : month >= 6 && month <= 8 ? "summer" : month >= 9 && month <= 10 ? "autumn" : "winter";
          const queries: Record<string, string> = {
            spring: "light cotton",
            summer: "thin cotton",
            autumn: "merino wool base layer",
            winter: "warm wool silk thick",
          };
          try {
            const filters: string[] = ["isActive = true"];
            if (gender) filters.push(`gender = "${gender}"`);
            const result = await searchClient.index(INDEXES.PRODUCTS).search(queries[season], {
              filter: filters.join(" AND "),
              limit: 6,
            });
            return { season, products: result.hits };
          } catch {
            return { season, products: [], message: "Search unavailable" };
          }
        },
      }),
    },
    maxSteps: 8,
  });

  return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Agent chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Chat agent error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
