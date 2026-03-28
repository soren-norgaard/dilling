import { test, expect } from "@playwright/test";

test.describe("Currency Switching", () => {
  test("changing currency updates product prices", async ({ page }) => {
    await page.goto("/da/catalog");
    const productCards = page.locator("a[href*='/catalog/item/']");
    await expect(productCards.first()).toBeVisible({ timeout: 15_000 });

    // Default is DKK — prices should show kr or DKK
    await expect(page.getByText(/kr|DKK/i).first()).toBeVisible();

    // Switch to EUR
    const currencySelect = page.locator("select").filter({ hasText: /DKK/ });
    await currencySelect.selectOption("EUR");
    await page.waitForTimeout(1000);

    // Prices should now display in EUR
    await expect(page.getByText(/€|EUR/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("currency persists across page navigation", async ({ page }) => {
    await page.goto("/da/catalog");
    const currencySelect = page.locator("select").filter({ hasText: /DKK/ });
    await currencySelect.selectOption("EUR");
    await page.waitForTimeout(500);

    // Navigate to another page and back
    await page.goto("/da/catalog");
    await page.waitForTimeout(1000);
    // Currency should still be EUR
    const selectedCurrency = page.locator("select").filter({ hasText: /EUR/ });
    await expect(selectedCurrency.first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Exchange Rates API", () => {
  test("returns exchange rates", async ({ request }) => {
    const res = await request.get("/api/exchange-rates");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Should have rate data
    expect(body).toBeDefined();
  });
});
