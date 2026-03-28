import { test, expect } from "@playwright/test";

test.describe("Navigation & Layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/da");
  });

  test("header displays logo linking to home", async ({ page }) => {
    const logo = page.getByRole("link", { name: /dilling/i }).first();
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("href", /^\/(da)?$/);
  });

  test("header contains catalog navigation link", async ({ page }) => {
    const catalogLink = page.getByRole("link", { name: /catalog|katalog/i }).first();
    await expect(catalogLink).toBeVisible();
    await catalogLink.click();
    await expect(page).toHaveURL(/\/catalog/);
  });

  test("header contains stylist/chat navigation link", async ({ page }) => {
    const chatLink = page.getByRole("link", { name: /stylist/i }).first();
    await expect(chatLink).toBeVisible();
    await chatLink.click();
    await expect(page).toHaveURL(/\/chat/);
  });

  test("header shows currency selector with default DKK", async ({ page }) => {
    const currencySelect = page.locator("select").filter({ hasText: /DKK/ });
    await expect(currencySelect).toBeVisible();
  });

  test("currency selector contains all supported currencies", async ({ page }) => {
    const currencySelect = page.locator("select").filter({ hasText: /DKK/ });
    for (const currency of ["DKK", "EUR", "SEK", "NOK", "GBP", "USD"]) {
      await expect(currencySelect.locator(`option[value="${currency}"]`)).toBeAttached();
    }
  });

  test("header shows cart button", async ({ page }) => {
    const cartBtn = page.getByRole("button", { name: /cart|kurv|indkøb/i }).or(
      page.locator("button").filter({ has: page.locator("svg") }).last()
    );
    await expect(cartBtn.first()).toBeVisible();
  });

  test("footer displays Dilling branding and copyright", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByText(/Dilling/)).toBeVisible();
    await expect(footer.getByText(/rettigheder|rights/i)).toBeVisible();
  });

  test("footer shows contact and info sections", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer.getByText(/Kundeservice/i)).toBeVisible();
    await expect(footer.getByText(/Bæredygtighed/i)).toBeVisible();
  });
});

test.describe("Locale Switching", () => {
  test("default locale is Danish", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/da/);
  });

  test("English locale loads correctly", async ({ page }) => {
    await page.goto("/en");
    await expect(page).toHaveURL(/\/en/);
    await expect(page.locator("h1")).toBeVisible();
  });
});
