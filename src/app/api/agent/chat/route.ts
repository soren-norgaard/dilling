import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
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
    productSlug: z.string().optional().describe("Product slug — when provided, returns product-specific size guide with body measurements per size"),
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

const SYSTEM_PROMPT = `Du er Dillings personlige stylist — en erfaren mode- og materialerådgiver der hjælper kunden med at finde det helt rigtige tøj og den perfekte størrelse.

DIN ROLLE:
Du er IKKE en kedelig chatbot. Du er en passioneret stylist der brænder for naturmaterialer og ved præcis hvad kunden har brug for. Du handler hurtigt — søg produkter MED DET SAMME når kunden beskriver et behov. Stil IKKE unødvendige spørgsmål hvis du kan gætte svaret.

OM DILLING:
- Dansk familievirksomhed, grundlagt 1916 i Bredsten
- Specialiserer sig i økologisk merinould og bomuld
- Eget farveri — kemikaliefri farvning
- Svanemærket, GOTS-certificeret, mulesing-fri merinould
- Produkter til dame, herre, børn og baby

DIN PERSONLIGHED:
- Varm, direkte og handlekraftig — vis produkter med det samme
- Taler naturligt dansk (eller engelsk hvis kunden skriver engelsk)
- Altid ærlig — hvis noget ikke passer kundens behov, sig det
- Forklar HVORFOR du anbefaler noget ("Merinould er perfekt til skitur fordi...")

KRITISK — OUTPUT-FORMAT:
- ALDRIG skriv markdown billeder ![](url) — UI'et viser billeder automatisk fra tool results
- ALDRIG gentag produktnavne, priser eller SKU'er i din tekst — product cards vises automatisk
- Skriv KORT og konversationelt — 2-4 sætninger der forklarer HVORFOR du anbefaler dette
- Lad tool results (outfit kort, produkt kort, størrelses kort) gøre det visuelle arbejde
- Du må gerne bruge **fed tekst** og korte lister med - til at formatere

Eksempel på GOD respons efter buildOutfit:
"Her er dit skitur-outfit! 🎿 Jeg har sammensat et komplet lag-på-lag system i merinould — det holder dig varm og tør hele dagen. Merinoulden regulerer din temperatur og transporterer fugt væk fra kroppen. Vil du have hjælp med størrelse eller skal jeg lægge det hele i kurven?"

Eksempel på DÅRLIG respons (GØR ALDRIG DETTE):
"### Lag 1: Undertøj\n**Klassiske boxershorts i merinould til mænd**:\n- Pris: 199,99 kr\n- ![Boxershorts](https://assets...)\n### Lag 2: Base Layer..."

STYLIST-REGLER:

1. HANDLING FØRST — Når kunden nævner en aktivitet eller behov:
   - Kald STRAKS den relevante tool (buildOutfit, searchProducts, etc.)
   - Skriv en KORT, varm introduktion (2-4 sætninger)
   - Forklar lag-princippet kort hvis det er et outfit
   - Tilbyd at hjælpe med størrelse eller lægge i kurv

2. STØRRELSES-RÅDGIVNING — Du er ekspert i Dillings størrelser:
   - Dame: XS (34-36), S (36-38), M (38-40), L (40-42), XL (42-44), XXL (44-46)
   - Herre: S (44-46), M (48-50), L (52-54), XL (56-58), XXL (60-62)
   - Børn: 80, 92, 104, 116, 128, 140, 152, 164 cm
   - Baby: 50, 56, 62, 68, 74, 80, 86 cm
   - Merinould har naturlig elasticitet — i tvivl, vælg den MINDSTE størrelse
   - Spørg om højde/vægt hvis kunden vil have størrelseshjælp
   - VIGTIG: Brug ALTID getSizeRecommendation med productSlug når kunden spørger om størrelse på et specifikt produkt — det giver produktspecifik størrelsesguide med kroppsmål (bryst, talje, hofte) per størrelse, pasform, lag og materialevægt
   - Nævn produktets pasform ("Tæt", "Normal") og lag ("Inderste lag", "Mellemlag") i din anbefaling

3. LAYERING-EKSPERTISE — Du kender lag-princippet:
   - Lag 1 (mod huden): Merinould base layer — transporterer fugt væk
   - Lag 2 (isolering): Tykkere merinould / fleece — holder på varmen
   - Lag 3 (ydre): Vindtæt/vandtæt skal — beskytter mod elementerne

4. MATERIALE-EKSPERTISE — Forklar naturligt og kort:
   - Merinould: temperaturregulerende, lugtreducerende, fugtabsorberende
   - Uld/silke: ekstra blød, perfekt til sensitiv hud og babyer
   - Bomuld: åndbar, hypoallergenisk, bedst til varmt vejr

5. PROAKTIV STYLIST:
   - Foreslå altid HELE outfits, ikke bare enkeltdele
   - Nævn matching produkter kort
   - Giv pleje-tips når relevant
   - Nævn gratis fragt over 499 kr

Brug ALTID tools til at søge produkter — opfind ALDRIG produkter.`;

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
        description: "Build a complete layered outfit for an activity and gender. Returns products organized by layer with styling advice.",
        parameters: schemas.buildOutfit,
        execute: async ({ activity, gender, climate }) => {
          // Layering system — queries use simple Danish terms that match Meilisearch product names
          const layerConfig: Record<string, { label: string; query: string }[]> = {
            "cold": [
              { label: "Undertøj (lag 1)", query: "undertrøje merinould" },
              { label: "Bluse (lag 1)", query: "bluse langærmet merinould" },
              { label: "Leggings (lag 1)", query: "leggings merinould" },
              { label: "Mellemlag (lag 2)", query: "trøje merinould" },
              { label: "Strømper", query: "strømper merinould" },
              { label: "Tilbehør", query: "hue merinould" },
            ],
            "mild": [
              { label: "Bluse", query: "bluse merinould" },
              { label: "Leggings", query: "leggings merinould" },
              { label: "Strømper", query: "strømper" },
            ],
            "warm": [
              { label: "T-shirt", query: "t-shirt bomuld" },
              { label: "Underbukser", query: "underbukser bomuld" },
              { label: "Strømper", query: "strømper bomuld" },
            ],
          };

          const effectiveClimate = climate ?? "cold";
          const layers = layerConfig[effectiveClimate] ?? layerConfig.cold;

          const outfitParts = await Promise.all(
            layers.map(async ({ label, query }) => {
              try {
                const result = await searchClient.index(INDEXES.PRODUCTS).search(
                  query,
                  {
                    filter: `gender = "${gender}" AND isActive = true`,
                    limit: 3,
                  }
                );
                if (result.hits.length > 0) {
                  return { layer: label, products: result.hits };
                }
                // Fallback: drop gender filter
                const fallback = await searchClient.index(INDEXES.PRODUCTS).search(
                  query,
                  { filter: "isActive = true", limit: 3 }
                );
                return { layer: label, products: fallback.hits };
              } catch {
                return { layer: label, products: [] };
              }
            })
          );

          return { activity, gender, climate: effectiveClimate, outfit: outfitParts };
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
        description: "Get specific size recommendation based on gender, height, weight, and fit preference. When a productSlug is provided, returns the product's own size guide with body measurements per size, fit type, layer, and material weight.",
        parameters: schemas.getSizeRecommendation,
        execute: async ({ gender, height, weight, fitPreference, productSlug }) => {
          // Fetch product-specific size data if slug provided
          let productData: {
            name: string;
            sizeGuide: Record<string, Record<string, string>> | null;
            materialWeight: string | null;
            fit: string | null;
            layer: string | null;
            sizes: string[];
          } | null = null;

          if (productSlug) {
            const product = await db.product.findUnique({
              where: { slug: productSlug },
              select: {
                sizes: true,
                sizeGuide: true,
                materialWeight: true,
                fit: true,
                layer: true,
                translations: { where: { locale: "DA" }, select: { name: true } },
              },
            });
            if (product) {
              productData = {
                name: product.translations[0]?.name ?? productSlug,
                sizeGuide: product.sizeGuide as Record<string, Record<string, string>> | null,
                materialWeight: product.materialWeight,
                fit: product.fit,
                layer: product.layer,
                sizes: product.sizes,
              };
            }
          }

          // Actual size calculation logic based on Dilling's sizing
          let recommendedSize = "M";
          const fit = fitPreference ?? "regular";

          if (gender === "WOMEN") {
            // Women's EU sizes based on typical height/weight combinations
            if (height && weight) {
              const bmi = weight / ((height / 100) ** 2);
              if (bmi < 19) recommendedSize = "XS";
              else if (bmi < 21) recommendedSize = height < 165 ? "XS" : "S";
              else if (bmi < 23) recommendedSize = height < 168 ? "S" : "M";
              else if (bmi < 26) recommendedSize = height < 170 ? "M" : "L";
              else if (bmi < 29) recommendedSize = "XL";
              else recommendedSize = "XXL";
            } else if (height) {
              if (height < 162) recommendedSize = "XS";
              else if (height < 168) recommendedSize = "S";
              else if (height < 174) recommendedSize = "M";
              else if (height < 180) recommendedSize = "L";
              else recommendedSize = "XL";
            }
            // Adjust for fit preference
            const wSizes = ["XS", "S", "M", "L", "XL", "XXL"];
            const idx = wSizes.indexOf(recommendedSize);
            if (fit === "slim" && idx > 0) recommendedSize = wSizes[idx - 1];
            if (fit === "relaxed" && idx < wSizes.length - 1) recommendedSize = wSizes[idx + 1];
          } else if (gender === "MEN") {
            if (height && weight) {
              const bmi = weight / ((height / 100) ** 2);
              if (bmi < 21) recommendedSize = height < 175 ? "S" : "M";
              else if (bmi < 24) recommendedSize = height < 178 ? "M" : "L";
              else if (bmi < 27) recommendedSize = height < 180 ? "L" : "XL";
              else recommendedSize = "XXL";
            } else if (height) {
              if (height < 172) recommendedSize = "S";
              else if (height < 180) recommendedSize = "M";
              else if (height < 186) recommendedSize = "L";
              else recommendedSize = "XL";
            }
            const mSizes = ["S", "M", "L", "XL", "XXL"];
            const idx = mSizes.indexOf(recommendedSize);
            if (fit === "slim" && idx > 0) recommendedSize = mSizes[idx - 1];
            if (fit === "relaxed" && idx < mSizes.length - 1) recommendedSize = mSizes[idx + 1];
          } else if (gender === "CHILDREN" && height) {
            const childSizes = [80, 92, 104, 116, 128, 140, 152, 164];
            recommendedSize = String(childSizes.find((s) => s >= height) ?? 164);
          } else if (gender === "BABY" && height) {
            const babySizes = [50, 56, 62, 68, 74, 80, 86];
            recommendedSize = String(babySizes.find((s) => s >= height) ?? 86);
          }

          return {
            recommendedSize,
            gender,
            height,
            weight,
            fitPreference: fit,
            ...(productData ? {
              productName: productData.name,
              productFit: productData.fit,
              productLayer: productData.layer,
              productMaterialWeight: productData.materialWeight,
              productSizeGuide: productData.sizeGuide,
              availableSizes: productData.sizes,
            } : {}),
            tip: gender === "WOMEN" || gender === "MEN"
              ? "Merinould har naturlig elasticitet — er du mellem to størrelser, vælg den mindste."
              : gender === "CHILDREN"
                ? "Børn vokser hurtigt — overvej at gå én størrelse op for længere holdbarhed."
                : "Baby-størrelser er baseret på barnets længde i cm.",
            sizeChart: gender === "WOMEN"
              ? { XS: "EU 34-36", S: "EU 36-38", M: "EU 38-40", L: "EU 40-42", XL: "EU 42-44", XXL: "EU 44-46" }
              : gender === "MEN"
                ? { S: "EU 44-46", M: "EU 48-50", L: "EU 52-54", XL: "EU 56-58", XXL: "EU 60-62" }
                : undefined,
          };
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
            cozy: "blød merinould trøje",
            active: "leggings bluse merinould",
            warm: "merinould varm tyk",
            light: "bomuld t-shirt let",
            elegant: "bluse merinould",
            everyday: "bomuld hverdags",
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
            spring: "bomuld bluse let",
            summer: "bomuld t-shirt",
            autumn: "merinould trøje",
            winter: "merinould bluse langærmet",
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
    stopWhen: stepCountIs(8),
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
