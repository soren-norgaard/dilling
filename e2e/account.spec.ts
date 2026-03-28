import { test, expect } from "@playwright/test";

test.describe("Account Page", () => {
  test("displays account heading", async ({ page }) => {
    await page.goto("/da/account");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("shows navigation cards to orders, catalog, and stylist", async ({ page }) => {
    await page.goto("/da/account");

    // Orders card
    const ordersLink = page.getByRole("link", { name: /ordre|orders/i });
    await expect(ordersLink.first()).toBeVisible({ timeout: 10_000 });

    // Catalog card
    const catalogLink = page.getByRole("link", { name: /katalog|catalog/i });
    await expect(catalogLink.first()).toBeVisible();

    // Stylist card
    const stylistLink = page.getByRole("link", { name: /stylist/i });
    await expect(stylistLink.first()).toBeVisible();
  });

  test("orders card navigates to orders page", async ({ page }) => {
    await page.goto("/da/account");
    const ordersLink = page.getByRole("link", { name: /ordre|orders/i });
    await ordersLink.first().click();
    await expect(page).toHaveURL(/\/orders/);
  });

  test("catalog card navigates to catalog page", async ({ page }) => {
    await page.goto("/da/account");
    const catalogLink = page.getByRole("link", { name: /katalog|catalog/i });
    await catalogLink.first().click();
    await expect(page).toHaveURL(/\/catalog/);
  });

  test("stylist card navigates to chat page", async ({ page }) => {
    await page.goto("/da/account");
    const stylistLink = page.getByRole("link", { name: /stylist/i });
    await stylistLink.first().click();
    await expect(page).toHaveURL(/\/chat/);
  });

  test("shows language and currency section", async ({ page }) => {
    await page.goto("/da/account");
    await expect(
      page.getByText(/sprog|language|valuta|currency/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
