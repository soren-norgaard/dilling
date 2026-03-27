/**
 * Dilling Product Scraper
 *
 * Scrapes dk.dilling.com category pages to extract product data for seeding.
 * Rate-limited and respectful. Outputs JSON seed file.
 *
 * Usage: npx tsx scripts/scrape-dilling.ts
 */

const BASE_URL = "https://dk.dilling.com";

const CATEGORIES = [
  { slug: "dame", gender: "WOMEN", url: `${BASE_URL}/dame` },
  { slug: "herre", gender: "MEN", url: `${BASE_URL}/herre` },
  { slug: "boern", gender: "CHILDREN", url: `${BASE_URL}/boern` },
  { slug: "baby", gender: "BABY", url: `${BASE_URL}/baby` },
];

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeCategoryPage(url: string) {
  console.log(`Fetching: ${url}`);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Dilling-Seed-Scraper/1.0 (educational project)",
    },
  });
  if (!res.ok) {
    console.error(`  Failed: ${res.status}`);
    return [];
  }
  const html = await res.text();

  // Extract product links — simplified regex for category page product cards
  const productLinks: string[] = [];
  const linkRegex = /href="(\/[^"]*?(?:fg|mg|kg|bg)-[^"]+)"/g;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const link = match[1];
    if (!productLinks.includes(link)) {
      productLinks.push(link);
    }
  }

  console.log(`  Found ${productLinks.length} product links`);
  return productLinks;
}

async function main() {
  console.log("🧶 Dilling Product Scraper");
  console.log("=".repeat(40));

  const allProducts: Array<{
    slug: string;
    url: string;
    gender: string;
    category: string;
  }> = [];

  for (const cat of CATEGORIES) {
    const links = await scrapeCategoryPage(cat.url);
    for (const link of links) {
      const slug = link.split("/").pop() ?? link;
      allProducts.push({
        slug,
        url: `${BASE_URL}${link}`,
        gender: cat.gender,
        category: cat.slug,
      });
    }
    await delay(1000); // Rate limit: 1 second between category pages
  }

  console.log(`\nTotal products found: ${allProducts.length}`);

  // Write to JSON file
  const fs = await import("fs");
  const outputPath = "scripts/products-raw.json";
  fs.writeFileSync(outputPath, JSON.stringify(allProducts, null, 2));
  console.log(`Written to ${outputPath}`);
}

main().catch(console.error);
