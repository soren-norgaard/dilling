import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/da");
  });

  test("renders hero section with heading and CTAs", async ({ page }) => {
    await expect(page.locator("h1")).toBeVisible();
    const exploreCta = page.getByRole("link", { name: /kollektion|collection/i });
    await expect(exploreCta).toBeVisible();
  });

  test("displays USP bar with key selling points", async ({ page }) => {
    await expect(page.getByText("Økologisk certificeret")).toBeVisible();
    await expect(page.getByText("Mulesing-fri merinould")).toBeVisible();
    await expect(page.getByText("Gratis fragt over 499 DKK")).toBeVisible();
  });

  test("shows category grid with all 4 genders", async ({ page }) => {
    for (const label of ["Women", "Men", "Children", "Baby"]) {
      // Categories may be in Danish
      const card = page.getByRole("link", { name: new RegExp(label, "i") }).or(
        page.getByText(new RegExp(label, "i"))
      );
      await expect(card.first()).toBeVisible();
    }
  });

  test("category card links to correct catalog filter", async ({ page }) => {
    const womenLink = page.getByRole("link", { name: /kvinder|women/i }).first();
    await expect(womenLink).toBeVisible();
    await womenLink.click();
    await expect(page).toHaveURL(/\/catalog\?gender=WOMEN/);
  });

  test("displays featured products section", async ({ page }) => {
    const productCards = page.locator("a[href*='/catalog/item/']");
    await expect(productCards.first()).toBeVisible({ timeout: 15_000 });
    const count = await productCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("clicking featured product navigates to product detail", async ({ page }) => {
    const productLink = page.locator("a[href*='/catalog/item/']").first();
    await expect(productLink).toBeVisible({ timeout: 15_000 });
    await productLink.click();
    await expect(page).toHaveURL(/\/catalog\/item\//);
  });
});
