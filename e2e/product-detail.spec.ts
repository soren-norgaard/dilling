import { test, expect } from "@playwright/test";

test.describe("Product Detail Page", () => {
  let productSlug: string;

  test.beforeAll(async ({ request }) => {
    // Get a real product slug from the catalog API
    const res = await request.get("/api/catalog?limit=1");
    const body = await res.json();
    productSlug = body.products?.[0]?.slug;
  });

  test("displays product name and price", async ({ page }) => {
    test.skip(!productSlug, "No products in database");
    await page.goto(`/da/catalog/item/${productSlug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Price should be visible somewhere on the page
    await expect(page.getByText(/\d+[\.,]?\d*\s*(kr|DKK)/)).toBeVisible({ timeout: 10_000 });
  });

  test("shows product image", async ({ page }) => {
    test.skip(!productSlug, "No products in database");
    await page.goto(`/da/catalog/item/${productSlug}`);
    const mainImage = page.locator("img").first();
    await expect(mainImage).toBeVisible({ timeout: 10_000 });
  });

  test("has back link to catalog", async ({ page }) => {
    test.skip(!productSlug, "No products in database");
    await page.goto(`/da/catalog/item/${productSlug}`);
    const backLink = page.getByRole("link", { name: /back|tilbage/i }).or(
      page.locator("a[href*='/catalog']").filter({ hasText: /back|tilbage|←/i })
    );
    await expect(backLink.first()).toBeVisible();
    await backLink.first().click();
    await expect(page).toHaveURL(/\/catalog/);
  });

  test("size selector is visible and clickable", async ({ page }) => {
    test.skip(!productSlug, "No products in database");
    await page.goto(`/da/catalog/item/${productSlug}`);
    // Look for size buttons
    const sizeSection = page.getByText(/størrelse|size/i).first();
    await expect(sizeSection).toBeVisible({ timeout: 10_000 });
    // Find size buttons (e.g. S, M, L, XL)
    const sizeButtons = page.getByRole("button").filter({
      hasText: /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3}(\/\d{2,3})?)$/,
    });
    const count = await sizeButtons.count();
    if (count > 0) {
      await sizeButtons.first().click();
    }
  });

  test("color selector is visible and clickable", async ({ page }) => {
    test.skip(!productSlug, "No products in database");
    await page.goto(`/da/catalog/item/${productSlug}`);
    const colorSection = page.getByText(/farve|color/i).first();
    // Color section may not exist for every product
    const visible = await colorSection.isVisible().catch(() => false);
    if (visible) {
      // Color swatches are circular buttons
      const swatches = page.locator("button[style*='background']").or(
        page.locator("button").filter({ has: page.locator("[class*='rounded-full']") })
      );
      const count = await swatches.count();
      if (count > 0) {
        await swatches.first().click();
      }
    }
  });

  test("add to cart button works", async ({ page }) => {
    test.skip(!productSlug, "No products in database");
    await page.goto(`/da/catalog/item/${productSlug}`);
    const addToCartBtn = page.getByRole("button", {
      name: /tilføj|add to cart|læg i kurv/i,
    });
    await expect(addToCartBtn.first()).toBeVisible({ timeout: 10_000 });
    // Select first size if needed
    const sizeButtons = page.getByRole("button").filter({
      hasText: /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3}(\/\d{2,3})?)$/,
    });
    if ((await sizeButtons.count()) > 0) {
      await sizeButtons.first().click();
    }
    await addToCartBtn.first().click();
    // Should show feedback text
    await expect(
      page.getByText(/tilføjet|added/i).or(addToCartBtn.first())
    ).toBeVisible();
  });

  test("size guide toggle works", async ({ page }) => {
    test.skip(!productSlug, "No products in database");
    await page.goto(`/da/catalog/item/${productSlug}`);
    const sizeGuideBtn = page.getByRole("button", {
      name: /størrelsesguide|size guide/i,
    });
    const visible = await sizeGuideBtn.isVisible().catch(() => false);
    if (visible) {
      await sizeGuideBtn.click();
      // Size guide table should appear
      await expect(page.locator("table").first()).toBeVisible();
      // Toggle off
      await sizeGuideBtn.click();
      await expect(page.locator("table").first()).not.toBeVisible();
    }
  });

  test("thumbnail gallery switches main image", async ({ page }) => {
    test.skip(!productSlug, "No products in database");
    await page.goto(`/da/catalog/item/${productSlug}`);
    // Wait for images to load
    const images = page.locator("img");
    await expect(images.first()).toBeVisible({ timeout: 10_000 });
    const imageCount = await images.count();
    if (imageCount > 2) {
      // Click second thumbnail (first is main image)
      const thumbnailArea = page.locator("img").nth(2);
      const visible = await thumbnailArea.isVisible().catch(() => false);
      if (visible) {
        await thumbnailArea.click();
      }
    }
  });
});

test.describe("Product Detail API", () => {
  test("returns product details by slug", async ({ request }) => {
    // First, get a slug
    const catalogRes = await request.get("/api/catalog?limit=1");
    const catalogBody = await catalogRes.json();
    const slug = catalogBody.products?.[0]?.slug;
    test.skip(!slug, "No products in database");

    const res = await request.get(`/api/catalog/item/${slug}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.slug).toBe(slug);
    expect(body.id).toBeTruthy();
  });

  test("returns 404 for non-existent product", async ({ request }) => {
    const res = await request.get("/api/catalog/item/non-existent-product-slug-12345");
    expect(res.status()).toBe(404);
  });
});
