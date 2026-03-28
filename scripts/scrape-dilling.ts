/**
 * Dilling Product Scraper — Sitemap-based approach
 *
 * Uses dk.dilling.com sitemaps to discover all product URLs,
 * extracts metadata from URL slugs (name, SKU, gender, material),
 * estimates prices from product type/material patterns,
 * and constructs image URLs from SKU convention.
 *
 * Only 9 HTTP requests (one per sitemap XML) — very respectful.
 *
 * Usage: npx tsx scripts/scrape-dilling.ts
 */

import { writeFileSync } from "fs";

const BASE_URL = "https://dk.dilling.com";
const USER_AGENT = "Dilling-Seed-Scraper/1.0 (educational project)";

type Gender = "WOMEN" | "MEN" | "CHILDREN" | "BABY" | "UNISEX";
type Material =
  | "MERINO_WOOL" | "COTTON" | "WOOL_SILK" | "CASHMERE" | "LAMB_WOOL"
  | "MERINO_FLEECE" | "MERINO_TERRY" | "RECYCLED_NYLON" | "RECYCLED_POLYESTER"
  | "WOOL_COTTON" | "MERINO_ALPACA" | "SOFTSHELL";
type Tag =
  | "NEW" | "ACTIVEWEAR" | "SWAN_MARK" | "SLIM_RIB" | "SMOOTH_KNIT"
  | "WAFFLE_KNIT" | "MULTI_RIB" | "HOLE_PATTERN" | "WIDE_RIB"
  | "LOOP_BACK" | "SEERSUCKER";

interface Product {
  slug: string;
  sku: string;
  url: string;
  name: string;
  nameDa: string;
  priceDKK: number;
  gender: Gender;
  material: Material;
  tags: Tag[];
  images: string[];
  sizes: string[];
  colorName: string;
  colorHex: string;
  productType: string;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function fetchAllProductUrls(): Promise<string[]> {
  const urls = new Set<string>();
  for (let i = 1; i <= 9; i++) {
    const sitemapUrl = `${BASE_URL}/sitemap-products-${i}.xml`;
    console.log(`  Fetching sitemap ${i}/9...`);
    try {
      const xml = await fetchText(sitemapUrl);
      const re = /https:\/\/dk\.dilling\.com\/produkt\/([^<"]+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml)) !== null) {
        const slug = m[1].replace(/\/$/, "").replace(/"$/, "");
        if (slug && !slug.includes("<")) urls.add(slug);
      }
    } catch {
      console.log(`  Sitemap ${i} not found, stopping.`);
      break;
    }
  }
  return [...urls];
}

function extractSku(slug: string): string | null {
  // Match XX-XXXX-XXXX-XXX or XX-XXXXX-XXXX-XXX
  const m = slug.match(/([a-z]{2})-(\d{4,5})-(\d{4})-(\d{3})$/i);
  if (!m) return null;
  return `${m[1].toUpperCase()}-${m[2]}-${m[3]}-${m[4]}`;
}

function nameFromSlug(slug: string): string {
  const withoutSku = slug.replace(/-[a-z]{2}-\d{4,5}-\d{4}-\d{3}$/i, "");
  return withoutSku
    .split("-")
    .map((w) => {
      if (["i", "til", "med", "og", "uden", "fra", "pa"].includes(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function detectGender(slug: string): Gender {
  const s = slug.toLowerCase();
  if (s.includes("-til-kvinder") || s.includes("-til-dame")) return "WOMEN";
  if (s.includes("-til-maend") || s.includes("-til-herre") || s.includes("-herrer")) return "MEN";
  if (s.includes("-til-born") || s.includes("-til-boern")) return "CHILDREN";
  if (s.includes("-til-baby")) return "BABY";
  if (s.includes("-baby-og-born") || s.includes("-born-og-baby")) return "BABY";
  const skuMatch = s.match(/[a-z]{2}-(\d{4})/);
  if (skuMatch) {
    const prefix = parseInt(skuMatch[1]);
    if (prefix >= 5200 && prefix < 5300) return "BABY";
    if (prefix >= 5300 && prefix < 5400) return "CHILDREN";
  }
  return "UNISEX";
}

function detectMaterial(slug: string): Material {
  const s = slug.toLowerCase();
  if (s.includes("merinouldfleece") || s.includes("uldteddy")) return "MERINO_FLEECE";
  if (s.includes("merinouldfrott")) return "MERINO_TERRY";
  if (s.includes("merinouldsilke") || s.includes("uld-silke") || s.includes("uldsilke")) return "WOOL_SILK";
  if (s.includes("merinouldalpaka") || s.includes("merino-alpaka")) return "MERINO_ALPACA";
  if (s.includes("kashmir") || s.includes("cashmere")) return "CASHMERE";
  if (s.includes("lammeuld")) return "LAMB_WOOL";
  if (s.includes("softshell")) return "SOFTSHELL";
  if (s.includes("genanvendt-nylon") || s.includes("nylon")) return "RECYCLED_NYLON";
  if (s.includes("genanvendt-polyester")) return "RECYCLED_POLYESTER";
  if (s.includes("uldbomuld") || s.includes("uld-bomuld")) return "WOOL_COTTON";
  if (s.includes("bomuld") || s.includes("cotton") || s.includes("baek-og-bolge")) return "COTTON";
  if (s.includes("merinould") || s.includes("merino") || s.includes("-uld-")) return "MERINO_WOOL";
  return "MERINO_WOOL";
}

function detectProductType(slug: string): string {
  const s = slug.toLowerCase();
  const types: [string, string][] = [
    ["sports-bh", "Sports-BH"], ["t-shirt", "T-shirt"], ["undertroj", "Undertrøje"],
    ["tank-top", "Tank top"], ["tanktop", "Tanktop"], ["stroptop", "Stroptop"],
    ["half-zip", "Half-zip"], ["haettetroje", "Hættetrøje"], ["sweatshirt", "Sweatshirt"],
    ["sweater", "Sweater"], ["cardigan", "Cardigan"], ["rullekrave", "Rullekrave"],
    ["polo", "Polo"], ["crew-neck", "Crew neck"], ["sla-om-bluse", "Slå-om"],
    ["bluse", "Bluse"], ["skjorte", "Skjorte"], ["troje", "Trøje"],
    ["vest", "Vest"], ["jakke", "Jakke"], ["overtoj", "Overtøj"],
    ["frakke", "Frakke"], ["kjole", "Kjole"], ["nederdel", "Nederdel"],
    ["yogabukser", "Yogabukser"], ["bukser", "Bukser"], ["shorts", "Shorts"],
    ["leggings", "Leggings"], ["tights", "Tights"],
    ["lange-underbukser", "Underbukser"], ["underbukser", "Underbukser"],
    ["boxershorts", "Boxershorts"], ["boksershorts", "Boksershorts"],
    ["hipster", "Hipsters"], ["trusse", "Trusse"], ["bh", "BH"],
    ["sla-om-body", "Body"], ["body", "Body"], ["heldragt", "Heldragt"],
    ["koredragt", "Køredragt"], ["overall", "Overall"],
    ["knaestromper", "Knæstrømper"], ["vandrestromper", "Strømper"],
    ["skistromper", "Strømper"], ["stromper", "Strømper"], ["sokker", "Sokker"],
    ["pandeband", "Pandebånd"], ["halsedisse", "Halsedisse"],
    ["halstorklaede", "Halstørklæde"], ["elefanthue", "Elefanthue"],
    ["hue", "Hue"], ["kyse", "Kyse"], ["luffer", "Luffer"],
    ["vanter", "Vanter"], ["futter", "Futter"], ["hjemmesko", "Hjemmesko"],
    ["nattoj", "Nattøj"], ["nattroje", "Nattrøje"],
    ["gavekort", "Gavekort"], ["gaveaeske", "Gaveæske"],
    ["reparationslap", "Reparationslap"], ["cedertraes", "Cedertræsblok"],
    ["uldvaskemiddel", "Uldvaskemiddel"], ["vaffelstrik", "Vaffelstrik"],
    ["cropped", "Cropped"],
  ];
  for (const [key, label] of types) {
    if (s.includes(key)) return label;
  }
  return "Andet";
}

function detectTags(slug: string): Tag[] {
  const s = slug.toLowerCase();
  const tags: Tag[] = [];
  if (s.includes("activewear")) tags.push("ACTIVEWEAR");
  if (s.includes("hulmonster")) tags.push("HOLE_PATTERN");
  if (s.includes("vaffelstrik")) tags.push("WAFFLE_KNIT");
  if (s.includes("loop-back")) tags.push("LOOP_BACK");
  if (s.includes("baek-og-bolge")) tags.push("SEERSUCKER");
  return tags;
}

const COLORS: Record<string, { name: string; hex: string }> = {
  "000": { name: "Sort/Hvid", hex: "#000000" },
  "002": { name: "Hvid", hex: "#FFFFFF" },
  "005": { name: "Cremefarvet", hex: "#FFFDD0" },
  "053": { name: "Armygrøn", hex: "#4B5320" },
  "066": { name: "Marineblå", hex: "#1B1F3B" },
  "069": { name: "Mørkeblå", hex: "#1B2A4A" },
  "081": { name: "Rosa", hex: "#FFB6C1" },
  "082": { name: "Lyserød", hex: "#FFB6C1" },
  "083": { name: "Mørkegrå", hex: "#3D3D3D" },
  "085": { name: "Sølvgrå", hex: "#C0C0C0" },
  "088": { name: "Antracit", hex: "#2C2C2C" },
  "111": { name: "Lys grå melange", hex: "#C8C8C8" },
  "112": { name: "Bordeaux", hex: "#722F37" },
  "120": { name: "Mørkerød", hex: "#8B0000" },
  "124": { name: "Fersken", hex: "#FFDAB9" },
  "130": { name: "Terracotta", hex: "#E2725B" },
  "171": { name: "Rustbrun", hex: "#8B4513" },
  "186": { name: "Cognac", hex: "#934A16" },
  "192": { name: "Okkerfarvet", hex: "#CC7722" },
  "253": { name: "Blå", hex: "#4169E1" },
  "263": { name: "Mørkeblå", hex: "#1B3A60" },
  "266": { name: "Petrolblå", hex: "#003B46" },
  "268": { name: "Støvet blå", hex: "#778899" },
  "281": { name: "Dueblå", hex: "#6699CC" },
  "286": { name: "Lyseblå", hex: "#B0C4DE" },
  "297": { name: "Mosgrøn", hex: "#4A5D23" },
  "341": { name: "Varm oliven", hex: "#6B8E23" },
  "362": { name: "Petroleum", hex: "#1E6B6B" },
  "366": { name: "Støvet grøn", hex: "#708238" },
  "369": { name: "Salvie", hex: "#87AE73" },
  "430": { name: "Lavendel", hex: "#B57EDC" },
  "432": { name: "Stor lilla", hex: "#7B68EE" },
  "471": { name: "Sennep", hex: "#FFDB58" },
  "479": { name: "Guld", hex: "#CFB53B" },
  "480": { name: "Sort kirsebær", hex: "#4A0020" },
  "487": { name: "Plomme", hex: "#843179" },
  "492": { name: "Mørk magenta", hex: "#8B008B" },
  "494": { name: "Varm rød", hex: "#CD2626" },
  "497": { name: "Brændt orange", hex: "#CC5500" },
  "498": { name: "Koral", hex: "#FF7F50" },
  "506": { name: "Lys mint", hex: "#98FFB3" },
  "520": { name: "Natur", hex: "#E8DCC8" },
  "524": { name: "Sand", hex: "#C2B280" },
  "552": { name: "Lys oliven", hex: "#B5B35C" },
  "553": { name: "Grøn", hex: "#2E8B57" },
  "563": { name: "Oliven", hex: "#556B2F" },
  "565": { name: "Skovsø", hex: "#2D6A4F" },
  "567": { name: "Grå/brun", hex: "#8B8378" },
  "597": { name: "Grå melange", hex: "#A0A0A0" },
  "653": { name: "Mørkegrå melange", hex: "#505050" },
  "676": { name: "Mosgrøn melange", hex: "#5F6B2F" },
  "683": { name: "Khaki", hex: "#8B7355" },
  "684": { name: "Kamel", hex: "#C19A6B" },
  "707": { name: "Trøffelfarvet", hex: "#483C32" },
  "830": { name: "Støvet rosa", hex: "#DCAE96" },
  "834": { name: "Dæmpet rosa", hex: "#C48793" },
  "836": { name: "Varm grå", hex: "#8B7D6B" },
  "839": { name: "Mørk brun", hex: "#5C4033" },
  "849": { name: "Beigerosa", hex: "#E8C6AF" },
  "862": { name: "Støvet brun", hex: "#8B7355" },
  "865": { name: "Taupe", hex: "#483C32" },
  "869": { name: "Lys grå", hex: "#D3D3D3" },
  "904": { name: "Lys lavendelblå", hex: "#E6E6FA" },
  "906": { name: "Beige", hex: "#D2B48C" },
  "997": { name: "Mørkegrå", hex: "#2F2F2F" },
  "999": { name: "Sort", hex: "#000000" },
};

function detectColor(sku: string): { name: string; hex: string } {
  const suffix = sku.split("-").pop() ?? "";
  return COLORS[suffix] ?? { name: "Ukendt", hex: "#888888" };
}

/**
 * Build candidate image URLs for a product. The Dilling CDN uses inconsistent
 * suffixes across products: _p1.jpg, _p1.png, _p1_bc.jpg, _pf.png.
 * The probe-missing.py script (or DillingImage component) handles the fallback
 * logic at display time. We default to _p1.jpg which covers ~55% of products.
 */
function buildImageUrls(sku: string): string[] {
  return [
    `https://assets.dilling.com/Products/${sku}/${sku}_p1.jpg`,
    `https://assets.dilling.com/Products/${sku}/${sku}_p2.jpg`,
  ];
}

function defaultSizes(gender: Gender, productType: string): string[] {
  const accessories = [
    "Pandebånd", "Halsedisse", "Halstørklæde", "Hue", "Elefanthue",
    "Kyse", "Luffer", "Vanter", "Futter", "Gaveæske", "Gavekort",
    "Reparationslap", "Cedertræsblok", "Uldvaskemiddel",
  ];
  if (accessories.includes(productType)) return ["One Size"];
  if (productType === "Hjemmesko") {
    return gender === "BABY" ? ["17-18", "19-20", "21-22"] : ["35-38", "39-42", "43-46"];
  }
  if (["Sokker", "Strømper", "Knæstrømper"].includes(productType)) {
    if (gender === "CHILDREN") return ["17-19", "20-22", "23-26", "27-30", "31-34"];
    if (gender === "BABY") return ["15-18", "19-22"];
    return ["35-38", "39-42", "43-46"];
  }
  switch (gender) {
    case "WOMEN":
      return ["BH", "Sports-BH"].includes(productType)
        ? ["S", "M", "L", "XL"]
        : ["34", "36", "38", "40", "42", "44", "46"];
    case "MEN": return ["S", "M", "L", "XL", "XXL"];
    case "CHILDREN": return ["80", "92", "104", "116", "128", "140", "152", "164"];
    case "BABY": return ["50", "56", "62", "68", "74", "80", "86"];
    default: return ["S", "M", "L", "XL"];
  }
}

// Prices derived from actual dk.dilling.com data
const PRICE_MAP: Record<string, Record<string, number>> = {
  "T-shirt":       { MERINO_WOOL: 349.99, COTTON: 149.99, WOOL_SILK: 329.99, _default: 299.99 },
  "Undertrøje":    { MERINO_WOOL: 249.99, COTTON: 89.99, WOOL_SILK: 249.99, _default: 199.99 },
  "Tank top":      { MERINO_WOOL: 349.99, COTTON: 129.99, _default: 249.99 },
  "Tanktop":       { MERINO_WOOL: 259.99, COTTON: 129.99, _default: 199.99 },
  "Stroptop":      { MERINO_WOOL: 179.99, COTTON: 99.99, _default: 149.99 },
  "Bluse":         { MERINO_WOOL: 449.99, COTTON: 299.99, MERINO_TERRY: 599.99, _default: 399.99 },
  "Skjorte":       { MERINO_WOOL: 649.99, COTTON: 549.99, WOOL_COTTON: 1099.99, _default: 599.99 },
  "Trøje":         { MERINO_WOOL: 599.99, MERINO_FLEECE: 799.99, _default: 549.99 },
  "Hættetrøje":    { MERINO_WOOL: 999.99, MERINO_TERRY: 1199.99, MERINO_FLEECE: 1099.99, _default: 899.99 },
  "Sweatshirt":    { MERINO_WOOL: 899.99, MERINO_FLEECE: 499.99, MERINO_TERRY: 449.99, _default: 699.99 },
  "Sweater":       { CASHMERE: 2499.99, MERINO_WOOL: 899.99, LAMB_WOOL: 799.99, _default: 799.99 },
  "Cardigan":      { MERINO_WOOL: 899.99, COTTON: 399.99, _default: 699.99 },
  "Vest":          { MERINO_FLEECE: 1099.99, MERINO_WOOL: 799.99, _default: 899.99 },
  "Jakke":         { MERINO_FLEECE: 1099.99, SOFTSHELL: 1299.99, _default: 999.99 },
  "Overtøj":       { MERINO_WOOL: 1299.99, _default: 1199.99 },
  "Kjole":         { MERINO_WOOL: 449.99, COTTON: 349.99, _default: 399.99 },
  "Nederdel":      { MERINO_WOOL: 399.99, COTTON: 599.99, _default: 449.99 },
  "Bukser":        { MERINO_WOOL: 499.99, COTTON: 599.99, MERINO_FLEECE: 599.99, _default: 499.99 },
  "Shorts":        { MERINO_WOOL: 299.99, COTTON: 249.99, _default: 279.99 },
  "Leggings":      { MERINO_WOOL: 349.99, COTTON: 179.99, WOOL_SILK: 299.99, _default: 299.99 },
  "Tights":        { MERINO_WOOL: 299.99, COTTON: 149.99, WOOL_SILK: 279.99, _default: 249.99 },
  "Underbukser":   { MERINO_WOOL: 199.99, COTTON: 89.99, WOOL_SILK: 179.99, _default: 149.99 },
  "Boxershorts":   { MERINO_WOOL: 199.99, COTTON: 99.99, _default: 179.99 },
  "Boksershorts":  { MERINO_WOOL: 199.99, COTTON: 99.99, _default: 179.99 },
  "Hipsters":      { MERINO_WOOL: 179.99, COTTON: 79.99, _default: 149.99 },
  "Trusse":        { MERINO_WOOL: 149.99, COTTON: 69.99, WOOL_SILK: 149.99, _default: 119.99 },
  "BH":            { MERINO_WOOL: 199.99, COTTON: 129.99, _default: 179.99 },
  "Sports-BH":     { MERINO_WOOL: 299.99, _default: 249.99 },
  "Body":          { MERINO_WOOL: 229.99, COTTON: 109.99, WOOL_SILK: 199.99, _default: 179.99 },
  "Heldragt":      { MERINO_WOOL: 399.99, MERINO_TERRY: 499.99, _default: 399.99 },
  "Køredragt":     { MERINO_FLEECE: 649.99, MERINO_WOOL: 549.99, _default: 599.99 },
  "Overall":       { MERINO_FLEECE: 899.99, SOFTSHELL: 999.99, _default: 799.99 },
  "Sokker":        { MERINO_WOOL: 69.99, COTTON: 39.99, _default: 59.99 },
  "Strømper":      { MERINO_WOOL: 199.99, _default: 149.99 },
  "Knæstrømper":   { MERINO_WOOL: 129.99, _default: 99.99 },
  "Pandebånd":     { MERINO_WOOL: 69.99, _default: 59.99 },
  "Halsedisse":    { MERINO_WOOL: 149.99, _default: 129.99 },
  "Halstørklæde":  { MERINO_WOOL: 299.99, _default: 249.99 },
  "Hue":           { MERINO_WOOL: 149.99, MERINO_FLEECE: 179.99, _default: 129.99 },
  "Elefanthue":    { MERINO_WOOL: 119.99, _default: 99.99 },
  "Kyse":          { MERINO_WOOL: 79.99, _default: 69.99 },
  "Luffer":        { MERINO_WOOL: 79.99, MERINO_FLEECE: 129.99, _default: 99.99 },
  "Vanter":        { MERINO_WOOL: 99.99, _default: 89.99 },
  "Futter":        { MERINO_FLEECE: 149.99, _default: 129.99 },
  "Hjemmesko":     { MERINO_WOOL: 399.99, _default: 349.99 },
  "Rullekrave":    { MERINO_WOOL: 499.99, COTTON: 349.99, _default: 449.99 },
  "Polo":          { MERINO_WOOL: 899.99, _default: 699.99 },
  "Crew neck":     { MERINO_WOOL: 899.99, CASHMERE: 2499.99, _default: 799.99 },
  "Yogabukser":    { MERINO_WOOL: 449.99, _default: 399.99 },
  "Slå-om":        { MERINO_WOOL: 599.99, _default: 499.99 },
  "Half-zip":      { MERINO_WOOL: 649.99, MERINO_FLEECE: 1099.99, _default: 799.99 },
  "Vaffelstrik":   { MERINO_WOOL: 899.99, _default: 799.99 },
  "Cropped":       { MERINO_WOOL: 349.99, _default: 299.99 },
  "Nattøj":        { MERINO_WOOL: 499.99, COTTON: 349.99, _default: 399.99 },
  "Nattrøje":      { MERINO_WOOL: 399.99, COTTON: 249.99, _default: 349.99 },
  "Gavekort":      { _default: 500.00 },
  "Gaveæske":      { _default: 49.99 },
  "Reparationslap": { _default: 29.99 },
  "Cedertræsblok": { _default: 29.99 },
  "Uldvaskemiddel": { _default: 69.99 },
  "Andet":         { _default: 299.99 },
};

// Children/baby products are typically 55-65% of adult price
const CHILD_FACTOR: Record<Gender, number> = {
  WOMEN: 1.0, MEN: 1.0, CHILDREN: 0.65, BABY: 0.55, UNISEX: 1.0,
};

function estimatePrice(productType: string, material: Material, gender: Gender): number {
  const typeMap = PRICE_MAP[productType] ?? PRICE_MAP["Andet"];
  const basePrice = typeMap[material] ?? typeMap._default ?? 299.99;
  const adjusted = basePrice * CHILD_FACTOR[gender];
  return Math.round(adjusted) - 0.01;
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log("🧶 Dilling Product Scraper (Sitemap-based)");
  console.log("=".repeat(50));

  console.log("\n📦 Phase 1: Fetching product URLs from sitemaps...\n");
  const slugs = await fetchAllProductUrls();
  console.log(`\n  Found ${slugs.length} unique product slugs\n`);

  console.log("🔍 Phase 2: Parsing product metadata...\n");
  const products: Product[] = [];
  const skipped: string[] = [];

  for (const slug of slugs) {
    const sku = extractSku(slug);
    if (!sku) { skipped.push(slug); continue; }

    const name = nameFromSlug(slug);
    const gender = detectGender(slug);
    const material = detectMaterial(slug);
    const productType = detectProductType(slug);
    const tags = detectTags(slug);
    const color = detectColor(sku);
    const priceDKK = estimatePrice(productType, material, gender);

    products.push({
      slug, sku,
      url: `${BASE_URL}/produkt/${slug}`,
      name, nameDa: name,
      priceDKK, gender, material, tags,
      images: buildImageUrls(sku),
      sizes: defaultSizes(gender, productType),
      colorName: color.name, colorHex: color.hex,
      productType,
    });
  }

  console.log(`  Parsed ${products.length} products (${skipped.length} skipped)\n`);

  // Group color variants
  const variantGroups = new Map<string, string[]>();
  for (const p of products) {
    const baseKey = p.sku.split("-").slice(0, 3).join("-");
    if (!variantGroups.has(baseKey)) variantGroups.set(baseKey, []);
    variantGroups.get(baseKey)!.push(p.slug);
  }

  // Stats
  const byGender: Record<string, number> = {};
  const byMaterial: Record<string, number> = {};
  const byProductType: Record<string, number> = {};
  for (const p of products) {
    byGender[p.gender] = (byGender[p.gender] ?? 0) + 1;
    byMaterial[p.material] = (byMaterial[p.material] ?? 0) + 1;
    byProductType[p.productType] = (byProductType[p.productType] ?? 0) + 1;
  }

  console.log("📊 Stats:");
  console.log(`  Total: ${products.length}`);
  console.log(`  Variant groups: ${variantGroups.size}`);
  const prices = products.map((p) => p.priceDKK);
  console.log(`  Price range: ${Math.min(...prices)}–${Math.max(...prices)} DKK`);
  console.log("  By gender:", byGender);
  console.log("  By material:", byMaterial);
  console.log(
    "  Top product types:",
    Object.entries(byProductType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([k, v]) => `${k}(${v})`)
      .join(", ")
  );

  if (skipped.length > 0) {
    console.log(`\n⚠️  Skipped (no valid SKU):`, skipped.slice(0, 10).join(", "));
  }

  // Write full output
  const outputPath = "scripts/products-scraped.json";
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        products,
        stats: { total: products.length, skipped: skipped.length, byGender, byMaterial, byProductType, variantGroups: variantGroups.size },
        scrapedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`\n💾 Full data: ${outputPath}`);

  // Write compact seed
  const seedPath = "scripts/products-seed.json";
  writeFileSync(seedPath, JSON.stringify(products));
  const sizeKB = (JSON.stringify(products).length / 1024).toFixed(0);
  console.log(`💾 Seed data: ${seedPath} (${sizeKB} KB)`);
}

main().catch(console.error);
