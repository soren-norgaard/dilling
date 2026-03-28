#!/usr/bin/env python3
"""
Dilling Product Attribute Scraper (Phase 2)
===========================================
Re-scrapes product pages to extract:
- materialWeight (from JSON blob: "materialWeight":{"value":"210"})
- clothingFit (from JSON blob: "clothingFit":{"value":{"key":"slim_fit","value":"Tæt"}})
- clothingLayer (from JSON blob, if present)
- size_guide SVG URL
- materialDescription (from rendered text)
- layer (from rendered text: "Lag: Inderste lag")
- fit (from rendered text: "Pasform: Tæt")

Merges into existing products-seed.json.

Usage: python3 scripts/scrape-product-attrs.py
"""

import json
import re
import subprocess
import sys
import concurrent.futures
from pathlib import Path

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
MAX_WORKERS = 15
SEED_PATH = Path("scripts/products-seed.json")


def fetch_html(url):
    r = subprocess.run(
        ["curl", "-s", "--max-time", "10", "-H", f"User-Agent: {UA}", url],
        capture_output=True, text=True,
    )
    return r.stdout


def extract_attrs(slug, html):
    """Extract product attributes from a Dilling product page."""
    if not html or len(html) < 500:
        return None

    attrs = {}

    # 1. materialWeight from JSON: materialWeight\":{"value":"210"
    for pat in [
        r'"materialWeight":\{"value":"(\d+)"',
        r'materialWeight\\":\{\\"value\\":\\"(\d+)\\"',
    ]:
        m = re.search(pat, html)
        if m:
            attrs["materialWeight"] = f"{m.group(1)} gr/m2"
            break

    # 2. clothingFit from JSON: clothingFit\":{"value":{"key":"slim_fit","value":"Tæt"}
    for pat in [
        r'"clothingFit":\{"value":\{"key":"([^"]+)","value":"([^"]+)"',
        r'clothingFit\\":\{\\"value\\":\{\\"key\\":\\"([^\\]+)\\",\\"value\\":\\"([^\\]+)\\"',
    ]:
        m = re.search(pat, html)
        if m:
            attrs["fit"] = m.group(2)  # Danish value like "Tæt", "Normal"
            attrs["fitKey"] = m.group(1)  # key like "slim_fit", "regular_fit"
            break

    # 3. layerFilter from JSON (field is called layerFilter, not clothingLayer)
    for pat in [
        r'"layerFilter":\{"value":\{"key":"([^"]+)","value":"([^"]+)"',
        r'layerFilter\\":\{\\"value\\":\{\\"key\\":\\"([^\\]+)\\",\\"value\\":\\"([^\\]+)\\"',
    ]:
        m = re.search(pat, html)
        if m:
            attrs["layer"] = m.group(2)  # Danish like "Inderste lag"
            attrs["layerKey"] = m.group(1)  # key like "base_layer"
            break

    # 4. Fallback: layer from rendered text "Lag: Inderste lag"
    if "layer" not in attrs:
        m = re.search(r'Lag:\s*([^<\\]+?)(?:\\|<|Pasform:|Material)', html)
        if m and len(m.group(1).strip()) > 2:
            attrs["layer"] = m.group(1).strip()

    # 5. Fallback: fit from rendered text "Pasform: Tæt"
    if "fit" not in attrs:
        m = re.search(r'Pasform:\s*([^<\\]+?)(?:\\|<|Material|Lag:)', html)
        if m and len(m.group(1).strip()) > 1:
            attrs["fit"] = m.group(1).strip()

    # 6. Fallback: materialWeight from rendered text "Materialevægt: 210 gr/m2"
    if "materialWeight" not in attrs:
        m = re.search(r'Materialev(?:æ|ae)gt:\s*([\d]+\s*gr/m2)', html)
        if m:
            attrs["materialWeight"] = m.group(1)

    # 7. materialDescription from rendered text
    m = re.search(r'Materialebeskrivelse:\s*([^<]+?)(?:<|Lag:|Pasform:)', html)
    if m and len(m.group(1).strip()) > 5:
        attrs["materialDescription"] = m.group(1).strip().rstrip(".")

    # 8. size_guide SVG URL from imageSizeTableGlobal field
    for pat in [
        r'"imageSizeTableGlobal":\{"value":"([^"]+)"',
        r'imageSizeTableGlobal\\":\{\\"value\\":\\"([^\\]+)\\"',
    ]:
        m = re.search(pat, html)
        if m:
            url = m.group(1)
            if url and len(url) > 10:
                attrs["sizeGuideImage"] = url
            break

    return attrs if attrs else None


def scrape_product(slug):
    url = f"https://dk.dilling.com/produkt/{slug}"
    try:
        html = fetch_html(url)
        return slug, extract_attrs(slug, html)
    except Exception:
        return slug, None


def main():
    if not SEED_PATH.exists():
        print("ERROR: scripts/products-seed.json not found")
        sys.exit(1)

    with open(SEED_PATH) as f:
        products = json.load(f)

    slugs = [p["slug"] for p in products]
    print(f"🧶 Dilling Product Attribute Scraper")
    print(f"{'='*50}")
    print(f"📦 {len(slugs)} products to scrape\n")

    results = {}
    failed = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_slug = {executor.submit(scrape_product, slug): slug for slug in slugs}
        done = 0
        for future in concurrent.futures.as_completed(future_to_slug):
            slug, attrs = future.result()
            done += 1
            if done % 100 == 0:
                print(f"  Progress: {done}/{len(slugs)} ({len(results)} with attrs, {failed} failed)")
            if attrs:
                results[slug] = attrs
            else:
                failed += 1

    print(f"\n✅ Extracted attributes for {len(results)} products")
    print(f"❌ {failed} products had no extractable attributes")

    # Stats
    stats = {"materialWeight": 0, "fit": 0, "layer": 0, "materialDescription": 0, "sizeGuideImage": 0}
    for attrs in results.values():
        for key in stats:
            if attrs.get(key):
                stats[key] += 1
    print(f"\n📊 Attribute coverage:")
    for key, count in stats.items():
        pct = count / len(slugs) * 100 if slugs else 0
        print(f"  {key}: {count}/{len(slugs)} ({pct:.1f}%)")

    # Merge into seed data
    updated = 0
    for p in products:
        attrs = results.get(p["slug"])
        if attrs:
            if attrs.get("materialWeight"):
                p["materialWeight"] = attrs["materialWeight"]
            if attrs.get("fit"):
                p["fit"] = attrs["fit"]
            if attrs.get("layer"):
                p["layer"] = attrs["layer"]
            if attrs.get("materialDescription") and not p.get("materialDescription"):
                p["materialDescription"] = attrs["materialDescription"]
            if attrs.get("sizeGuideImage"):
                p["sizeGuideImage"] = attrs["sizeGuideImage"]
            if attrs.get("fitKey"):
                p["fitKey"] = attrs["fitKey"]
            if attrs.get("layerKey"):
                p["layerKey"] = attrs["layerKey"]
            updated += 1

    with open(SEED_PATH, "w") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    print(f"\n💾 Updated {updated} products in {SEED_PATH}")


if __name__ == "__main__":
    main()
