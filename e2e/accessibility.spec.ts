import { test, expect } from "@playwright/test";

test.describe("Accessibility & Error Handling", () => {
  test("skip-to-content link exists", async ({ page }) => {
    await page.goto("/da");
    // The skip link is sr-only but should be in DOM
    const skipLink = page.getByText(/skip to main|spring til/i);
    await expect(skipLink).toBeAttached();
  });

  test("404 page renders for unknown routes", async ({ page }) => {
    await page.goto("/da/this-page-does-not-exist");
    // Should show not-found or 404 content
    const notFound = page.getByText(/404|not found|ikke fundet/i);
    await expect(notFound.first()).toBeVisible({ timeout: 10_000 });
  });

  test("non-existent product shows error state", async ({ page }) => {
    await page.goto("/da/catalog/item/this-product-does-not-exist-xyz");
    // Should show error or redirect
    const errorContent = page.getByText(/ikke fundet|not found|fejl|error|404/i);
    await expect(errorContent.first()).toBeVisible({ timeout: 10_000 });
  });

  test("pages have proper heading hierarchy", async ({ page }) => {
    const pages = ["/da", "/da/catalog", "/da/cart", "/da/search", "/da/account"];
    for (const url of pages) {
      await page.goto(url);
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1.first()).toBeVisible({ timeout: 10_000 });
    }
  });
});

test.describe("Responsive Layout", () => {
  test("mobile viewport shows functional layout", async ({ page, browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const mobilePage = await context.newPage();

    await mobilePage.goto("/da");
    await expect(mobilePage.getByRole("heading", { level: 1 })).toBeVisible();
    // Navigation should still be accessible (possibly via hamburger)
    await expect(mobilePage.getByText(/Dilling/i).first()).toBeVisible();

    await mobilePage.goto("/da/catalog");
    const productCards = mobilePage.locator("a[href*='/catalog/item/']");
    await expect(productCards.first()).toBeVisible({ timeout: 15_000 });

    await context.close();
  });

  test("tablet viewport shows functional layout", async ({ page, browser }) => {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 },
    });
    const tabletPage = await context.newPage();

    await tabletPage.goto("/da/catalog");
    const productCards = tabletPage.locator("a[href*='/catalog/item/']");
    await expect(productCards.first()).toBeVisible({ timeout: 15_000 });

    await context.close();
  });
});
