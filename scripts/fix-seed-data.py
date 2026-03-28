#!/usr/bin/env python3
"""Post-process scraped seed data to fix known issues."""
import json
import re

SEED_PATH = "scripts/products-seed.json"

with open(SEED_PATH) as f:
    products = json.load(f)

fixed_names = 0
fixed_images = 0

for p in products:
    # Fix nameDa: remove " - XXX kr - Dilling" or " - XXX kr" suffix
    if p.get("nameDa"):
        old_name = p["nameDa"]
        cleaned = re.sub(
            r"\s*-\s*[\d.,]+\s*kr\s*(?:-\s*Dilling\s*)?$", "", old_name
        ).strip()
        if cleaned != old_name:
            p["nameDa"] = cleaned
            fixed_names += 1

    # Fix image URLs: remove trailing backslashes
    if p.get("images"):
        new_images = []
        for img in p["images"]:
            clean = img.rstrip("\\")
            if clean != img:
                fixed_images += 1
            new_images.append(clean)
        p["images"] = new_images

    # Also ensure name (EN) doesn't have price
    if p.get("name"):
        old = p["name"]
        cleaned = re.sub(
            r"\s*-\s*[\d.,]+\s*kr\s*(?:-\s*Dilling\s*)?$", "", old
        ).strip()
        if cleaned != old:
            p["name"] = cleaned

with open(SEED_PATH, "w") as f:
    json.dump(products, f, ensure_ascii=False, indent=2)

print("Fixed %d product names (removed price suffix)" % fixed_names)
print("Fixed %d image URLs (removed backslashes)" % fixed_images)

# Verify
enriched = [p for p in products if p.get("description")]
p0 = enriched[0]
print("\nSample check:")
print("  nameDa: %s" % p0["nameDa"])
print("  name: %s" % p0["name"])
print("  price: %s" % p0["priceDKK"])
print("  images[0]: %s" % p0["images"][0])
print("  images count: %d" % len(p0["images"]))
