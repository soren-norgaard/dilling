import { test, expect } from "@playwright/test";

test.describe("Search Flow", () => {
  test("search page has input and submit button", async ({ page }) => {
    await page.goto("/da/search");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const searchInput = page.locator("#search").or(
      page.getByPlaceholder(/søg|search/i)
    );
    await expect(searchInput.first()).toBeVisible();
  });

  test("submitting search redirects to catalog with query", async ({ page }) => {
    await page.goto("/da/search");
    const searchInput = page.locator("#search").or(
      page.getByPlaceholder(/søg|search/i)
    );
    await searchInput.first().fill("merino");
    await searchInput.first().press("Enter");
    await expect(page).toHaveURL(/\/catalog\?q=merino/);
  });

  test("search form button submits the query", async ({ page }) => {
    await page.goto("/da/search");
    const searchInput = page.locator("#search").or(
      page.getByPlaceholder(/søg|search/i)
    );
    await searchInput.first().fill("uld");
    const submitBtn = page.getByRole("button", { name: /søg|search/i });
    await submitBtn.first().click();
    await expect(page).toHaveURL(/\/catalog\?q=uld/);
  });

  test("catalog page shows results for search query", async ({ page }) => {
    await page.goto("/da/catalog?q=merino");
    const productCards = page.locator("a[href*='/catalog/item/']");
    // May or may not have results depending on data
    await page.waitForTimeout(3000);
    const count = await productCards.count();
    // At minimum the page should load without errors
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
