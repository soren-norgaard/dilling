import { MeiliSearch } from "meilisearch";

const globalForMeili = globalThis as unknown as {
  meilisearch: MeiliSearch | undefined;
};

export const searchClient =
  globalForMeili.meilisearch ??
  new MeiliSearch({
    host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
    apiKey: process.env.MEILISEARCH_MASTER_KEY || "",
  });

if (process.env.NODE_ENV !== "production") globalForMeili.meilisearch = searchClient;

/** Index names */
export const INDEXES = {
  PRODUCTS: "products",
} as const;

/** Configure Meilisearch indexes with appropriate settings */
export async function configureMeilisearchIndexes() {
  const productsIndex = searchClient.index(INDEXES.PRODUCTS);
  await productsIndex.updateSettings({
    searchableAttributes: ["name", "sku", "categoryPath", "material", "description"],
    filterableAttributes: [
      "gender",
      "material",
      "tags",
      "category",
      "priceAmount",
      "sizes",
      "colors",
      "isActive",
    ],
    sortableAttributes: ["priceAmount", "name", "createdAt"],
    rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 3, twoTypos: 6 },
    },
    synonyms: {
      // Danish ↔ English synonyms
      merinould: ["merino wool", "merino"],
      "merino wool": ["merinould", "merino"],
      uld: ["wool"],
      wool: ["uld"],
      bomuld: ["cotton"],
      cotton: ["bomuld"],
      silke: ["silk"],
      silk: ["silke"],
      kashmir: ["cashmere"],
      cashmere: ["kashmir"],
      dame: ["women", "kvinder"],
      women: ["dame", "kvinder"],
      herre: ["men", "mænd"],
      men: ["herre", "mænd"],
      børn: ["children", "kids"],
      children: ["børn", "kids"],
      baby: ["spædbørn", "infant"],
      undertøj: ["underwear"],
      underwear: ["undertøj"],
      activewear: ["sportstøj", "active"],
      sportstøj: ["activewear", "active"],
      løb: ["running"],
      running: ["løb"],
      ski: ["skiing"],
      vandring: ["hiking"],
      hiking: ["vandring"],
      yoga: ["yoga"],
    },
    pagination: { maxTotalHits: 10000 },
  });
}
