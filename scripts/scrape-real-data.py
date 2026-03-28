#!/usr/bin/env python3
"""
Dilling Real Data Scraper
=========================
Fetches EVERY product page from dk.dilling.com and extracts:
- Real product name (DA + EN)
- Real price
- Real description
- All image URLs
- Available sizes
- Color name
- Material description
- Care instructions

Uses parallel HTTP requests for speed.
"""

import json
import re
import subprocess
import sys
import concurrent.futures
from pathlib import Path

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
MAX_WORKERS = 15  # Be respectful
SEED_PATH = Path("scripts/products-seed.json")


def fetch_html(url):
    """Fetch a page's HTML using curl."""
    r = subprocess.run(
        ["curl", "-s", "--max-time", "10", "-H", f"User-Agent: {UA}", url],
        capture_output=True, text=True,
    )
    return r.stdout


def extract_product_data(slug, html):
    """Extract all product data from a dilling.com product page HTML."""
    if not html or len(html) < 500:
        return None

    # SKU from slug
    sku_m = re.search(r"([a-z]{2}-\d{4,5}-\d{4}-\d{3})$", slug, re.I)
    if not sku_m:
        return None
    sku = sku_m.group(1).upper()

    # Title: "Leggings med bølgekant i merinould til børn - 219.99 kr - Dilling"
    title_m = re.search(r"<title>([^<]+)</title>", html)
    if not title_m:
        return None
    title = title_m.group(1)

    # Price from title
    price_m = re.search(r"([\d]+(?:[.,]\d+)?)\s*kr", title)
    price_dkk = float(price_m.group(1).replace(",", ".")) if price_m else None

    # DA name from title (remove " - XXX kr - Dilling")
    da_name = re.sub(r"\s*-\s*[\d.,]+\s*kr\s*-\s*Dilling\s*$", "", title).strip()

    # EN name from hreflang
    en_m = re.search(r'hrefLang="en-GB"\s+href="([^"]+)"', html)
    en_name = None
    if en_m:
        en_slug_m = re.search(r"/product/(.+?)$", en_m.group(1))
        if en_slug_m:
            en_raw = en_slug_m.group(1)
            # Remove SKU from end
            en_raw = re.sub(r"-[a-z]{2}-\d{4,5}-\d{4}-\d{3}$", "", en_raw, flags=re.I)
            en_name = en_raw.replace("-", " ").title()

    # Description from meta
    desc_m = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', html)
    description = desc_m.group(1) if desc_m else ""

    # ALL image URLs for this SKU (deduplicated, ordered)
    img_pattern = rf"https://assets\.dilling\.com/Products/{re.escape(sku)}/{re.escape(sku)}[^\"?\s]+"
    raw_imgs = re.findall(img_pattern, html)
    # Clean and deduplicate, keeping order
    seen = set()
    images = []
    for img in raw_imgs:
        # Strip query params for dedup
        clean = img.split("?")[0]
        if clean not in seen:
            seen.add(clean)
            images.append(clean)

    # Sizes - the pattern is "Størrelsesguide" followed by size options
    # Sizes appear as text like "98/104110/116122/128" or "SMLXLXXL" or "363840424446"
    sizes = []
    # Try to find the size section
    size_section = re.search(r"Størrelses(?:guide|oversigt)([\s\S]{0,500}?)(?:Du sparer|Tilføj)", html)
    if size_section:
        size_text = size_section.group(1)
        # Pattern: compound sizes like "98/104", "110/116"
        compound = re.findall(r"\d{2,3}/\d{2,3}", size_text)
        if compound:
            sizes = compound
        else:
            # Simple sizes: S, M, L, XL, XXL
            simple = re.findall(r"\b(XXS|XS|S|M|L|XL|XXL|3XL|One Size)\b", size_text)
            if simple:
                sizes = list(dict.fromkeys(simple))  # dedup keeping order
            else:
                # Numeric sizes: 36, 38, 40 etc
                numeric = re.findall(r"\b(\d{2,3})\b", size_text)
                if numeric:
                    sizes = list(dict.fromkeys(numeric))

    # Color name - from the main heading area
    # The format in the page is: "#SKU\n\n# Product Name\n...\nColorName"
    color_name = ""
    color_m = re.search(
        rf"#{re.escape(sku)}.*?<.*?>([\s\S]{{0,200}}?)(?:<|$)",
        html,
    )
    # Try from the rendered markdown area where color appears below product name
    # In the HTML it's usually near the SKU display
    alt_m = re.findall(rf'alt="[^"]*{re.escape(sku[-3:])}[^"]*?\s+([^"]+)"', html)

    # Try to find color from image alt tags
    img_alt_m = re.search(rf'alt="({re.escape(da_name)}\s+([^"]+))"', html)
    if img_alt_m:
        color_name = img_alt_m.group(2).strip()

    # Material description from page content
    material_desc = ""
    mat_m = re.search(r"Materialebeskrivelse:\s*([^<]+?)(?:<|Lag:|Pasform:)", html)
    if mat_m:
        material_desc = mat_m.group(1).strip().rstrip(".")

    # Care instructions
    care = ""
    # Usually in "Vaskevejledning" section — hard to extract from minified HTML

    # Material weight
    weight = ""
    weight_m = re.search(r"Materialev(?:æ|ae)gt:\s*([\d]+\s*gr/m2)", html)
    if weight_m:
        weight = weight_m.group(1)

    # Layer info
    layer = ""
    layer_m = re.search(r"Lag:\s*([^<]+?)(?:<|Pasform:|Material)", html)
    if layer_m:
        layer = layer_m.group(1).strip()

    # Fit
    fit = ""
    fit_m = re.search(r"Pasform:\s*([^<]+?)(?:<|Material|Lag:)", html)
    if fit_m:
        fit = fit_m.group(1).strip()

    return {
        "slug": slug,
        "sku": sku,
        "url": f"https://dk.dilling.com/produkt/{slug}",
        "nameDa": da_name,
        "nameEn": en_name or da_name,
        "priceDKK": price_dkk,
        "description": description,
        "images": images,
        "sizes": sizes,
        "colorName": color_name,
        "materialDescription": material_desc,
        "materialWeight": weight,
        "layer": layer,
        "fit": fit,
    }


def scrape_product(slug):
    """Fetch and extract one product."""
    url = f"https://dk.dilling.com/produkt/{slug}"
    try:
        html = fetch_html(url)
        return extract_product_data(slug, html)
    except Exception as e:
        return None


def main():
    # Load existing seed to get list of slugs
    if not SEED_PATH.exists():
        print("ERROR: scripts/products-seed.json not found")
        sys.exit(1)

    with open(SEED_PATH) as f:
        existing = json.load(f)

    slugs = [p["slug"] for p in existing]
    print(f"🧶 Dilling Real Data Scraper")
    print(f"{'='*50}")
    print(f"📦 {len(slugs)} products to scrape\n")

    results = {}
    failed = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_slug = {executor.submit(scrape_product, slug): slug for slug in slugs}
        done = 0
        for future in concurrent.futures.as_completed(future_to_slug):
            slug = future_to_slug[future]
            done += 1
            if done % 100 == 0:
                print(f"  Progress: {done}/{len(slugs)} ({len(results)} OK, {len(failed)} failed)")

            data = future.result()
            if data and data.get("priceDKK") and data.get("images"):
                results[slug] = data
            else:
                failed.append(slug)

    print(f"\n✅ Scraped {len(results)} products successfully")
    print(f"❌ {len(failed)} failed (404 or no data)")

    # Now merge with existing seed data (keep gender, material, tags, etc from URL-based parser)
    merged = []
    for p in existing:
        slug = p["slug"]
        real = results.get(slug)
        if real:
            # Merge: use real data where available, keep computed fields from old scraper
            merged.append({
                "slug": slug,
                "sku": real["sku"],
                "url": real["url"],
                "name": real["nameEn"],
                "nameDa": real["nameDa"],
                "priceDKK": real["priceDKK"],
                "gender": p.get("gender", "UNISEX"),
                "material": p.get("material", "MERINO_WOOL"),
                "tags": p.get("tags", []),
                "images": real["images"],
                "sizes": real["sizes"] if real["sizes"] else p.get("sizes", []),
                "colorName": real["colorName"] if real["colorName"] else p.get("colorName", ""),
                "colorHex": p.get("colorHex", "#888888"),
                "productType": p.get("productType", "Andet"),
                "description": real["description"],
                "materialDescription": real.get("materialDescription", ""),
                "materialWeight": real.get("materialWeight", ""),
                "layer": real.get("layer", ""),
                "fit": real.get("fit", ""),
            })
        else:
            # Keep old data for failed scrapes
            merged.append(p)

    # Write updated seed
    with open(SEED_PATH, "w") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f"\n💾 Updated {SEED_PATH} with {len(merged)} products")

    # Stats
    with_real_images = sum(1 for p in merged if len(p.get("images", [])) > 1)
    with_description = sum(1 for p in merged if p.get("description", ""))
    with_real_price = sum(1 for p in merged if "description" in p)  # has real data
    avg_images = sum(len(p.get("images", [])) for p in merged) / len(merged) if merged else 0

    print(f"\n📊 Stats:")
    print(f"  Products with real data: {len(results)}")
    print(f"  Products with descriptions: {with_description}")
    print(f"  Products with 2+ images: {with_real_images}")
    print(f"  Average images per product: {avg_images:.1f}")

    # Sample output
    if merged:
        sample = next((p for p in merged if p.get("description")), merged[0])
        print(f"\n📋 Sample product:")
        print(f"  Name: {sample['nameDa']}")
        print(f"  EN: {sample.get('name', 'N/A')}")
        print(f"  Price: {sample['priceDKK']} DKK")
        print(f"  Images: {len(sample['images'])}")
        for img in sample["images"][:3]:
            print(f"    {img}")
        print(f"  Sizes: {sample['sizes']}")
        print(f"  Desc: {sample.get('description', '')[:100]}...")


if __name__ == "__main__":
    main()
