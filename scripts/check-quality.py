#!/usr/bin/env python3
"""Check data quality of products-seed.json."""
import json
import random

d = json.load(open("scripts/products-seed.json"))
enriched = [p for p in d if p.get("description")]
no_data = [p for p in d if not p.get("description")]

print("=== DATA QUALITY ===")
print("Total products: %d" % len(d))
print("With real data: %d" % len(enriched))
print("Without real data: %d" % len(no_data))
print("With price: %d" % sum(1 for p in d if p.get("priceDKK")))
print("With 2+ images: %d" % sum(1 for p in d if len(p.get("images", [])) > 1))
avg = sum(len(p.get("images", [])) for p in enriched) / len(enriched) if enriched else 0
print("Avg images (enriched): %.1f" % avg)
print("With sizes: %d" % sum(1 for p in enriched if p.get("sizes")))
print("With color: %d" % sum(1 for p in enriched if p.get("colorName")))
print()

random.seed(42)
for p in random.sample(enriched, 5):
    print("--- %s ---" % p["slug"][:60])
    print("  DA: %s" % p.get("nameDa", "?"))
    print("  EN: %s" % p.get("name", "?"))
    print("  Price: %s DKK" % p.get("priceDKK"))
    print("  Imgs: %d" % len(p.get("images", [])))
    print("  Sizes: %s" % p.get("sizes", []))
    print("  Color: %s" % p.get("colorName", ""))
    print("  Desc: %s..." % p.get("description", "")[:80])
    print()
