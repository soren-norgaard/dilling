import { test, expect } from "@playwright/test";

test.describe("Catalog Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/da/catalog");
  });

  test("displays catalog heading", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("shows product grid with items", async ({ page }) => {
    const productCards = page.locator("a[href*='/catalog/item/']");
    await expect(productCards.first()).toBeVisible({ timeout: 15_000 });
    const count = await productCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("gender filter works", async ({ page }) => {
    const genderFilter = page.locator("#gender-filter");
    await expect(genderFilter).toBeVisible();
    await genderFilter.selectOption("WOMEN");
    await expect(page).toHaveURL(/gender=WOMEN/);
    // Products should still load
    const productCards = page.locator("a[href*='/catalog/item/']");
    await expect(productCards.first()).toBeVisible({ timeout: 15_000 });
  });

  test("material filter works", async ({ page }) => {
    const materialFilter = page.locator("#material-filter");
    await expect(materialFilter).toBeVisible();
    await materialFilter.selectOption("MERINO_WOOL");
    await expect(page).toHaveURL(/material=MERINO_WOOL/);
  });

  test("sort selector works", async ({ page }) => {
    const sortFilter = page.locator("#sort-filter");
    await expect(sortFilter).toBeVisible();
    await sortFilter.selectOption("priceAmount:asc");
    await expect(page).toHaveURL(/sort=priceAmount%3Aasc|sort=priceAmount:asc/);
  });

  test("clear filters button appears when filter is active", async ({ page }) => {
    const genderFilter = page.locator("#gender-filter");
    await genderFilter.selectOption("MEN");
    const clearButton = page.getByRole("button", { name: /ryd|clear/i }).or(
      page.getByText(/ryd|clear all/i)
    );
    await expect(clearButton.first()).toBeVisible();
    await clearButton.first().click();
    await expect(page).not.toHaveURL(/gender=MEN/);
  });

  test("combining gender and material filters", async ({ page }) => {
    await page.locator("#gender-filter").selectOption("WOMEN");
    await page.locator("#material-filter").selectOption("COTTON");
    await expect(page).toHaveURL(/gender=WOMEN/);
    await expect(page).toHaveURL(/material=COTTON/);
  });

  test("clicking product card navigates to detail page", async ({ page }) => {
    const productCard = page.locator("a[href*='/catalog/item/']").first();
    await expect(productCard).toBeVisible({ timeout: 15_000 });
    const href = await productCard.getAttribute("href");
    await productCard.click();
    await expect(page).toHaveURL(/\/catalog\/item\//);
    expect(href).toBeTruthy();
  });
});

test.describe("Catalog Pagination", () => {
  test("pagination controls appear when multiple pages exist", async ({ page }) => {
    await page.goto("/da/catalog");
    const productCards = page.locator("a[href*='/catalog/item/']");
    await expect(productCards.first()).toBeVisible({ timeout: 15_000 });

    // Check for pagination (may not exist with few products)
    const nextButton = page.getByRole("button", { name: /next|næste|→/ }).or(
      page.locator("button").filter({ hasText: "→" })
    );
    const paginationVisible = await nextButton.first().isVisible().catch(() => false);
    if (paginationVisible) {
      await nextButton.first().click();
      await expect(page).toHaveURL(/page=2/);
    }
  });
});

test.describe("Catalog API", () => {
  test("returns products with pagination info", async ({ request }) => {
    const res = await request.get("/api/catalog?limit=5");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.products).toBeDefined();
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(0);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(5);
  });

  test("filters by gender", async ({ request }) => {
    const res = await request.get("/api/catalog?gender=WOMEN&limit=5");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.products).toBeDefined();
  });

  test("filters by material", async ({ request }) => {
    const res = await request.get("/api/catalog?material=MERINO_WOOL&limit=5");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.products).toBeDefined();
  });

  test("supports sorting", async ({ request }) => {
    const res = await request.get("/api/catalog?sort=priceAmount:asc&limit=5");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.products).toBeDefined();
  });
});
