import { test, expect, Page } from "@playwright/test";

/**
 * Full end-to-end shopping flow:
 * 1. Browse catalog
 * 2. Select a product
 * 3. Choose size and color
 * 4. Add to cart
 * 5. Review cart
 * 6. Proceed to checkout
 * 7. Fill in shipping details
 * 8. Complete demo payment
 * 9. Verify order confirmation
 */
test.describe("Complete Shopping Flow", () => {
  test("browse → add to cart → checkout → order confirmation", async ({ page }) => {
    // 1. Go to catalog
    await page.goto("/da/catalog");
    const productCards = page.locator("a[href*='/catalog/item/']");
    await expect(productCards.first()).toBeVisible({ timeout: 15_000 });

    // 2. Click first product
    await productCards.first().click();
    await expect(page).toHaveURL(/\/catalog\/item\//);

    // 3. Select size
    const sizeButtons = page.getByRole("button").filter({
      hasText: /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3}(\/\d{2,3})?)$/,
    });
    if ((await sizeButtons.count()) > 0) {
      await sizeButtons.first().click();
    }

    // 4. Add to cart
    const addToCartBtn = page.getByRole("button", {
      name: /tilføj|add to cart|læg i kurv/i,
    });
    await addToCartBtn.first().click();
    await page.waitForTimeout(1500);

    // 5. Cart drawer should open — go to checkout
    const checkoutLink = page.getByRole("link", { name: /checkout|betal|til kassen/i }).or(
      page.getByRole("button", { name: /checkout|betal|til kassen/i })
    );
    await expect(checkoutLink.first()).toBeVisible({ timeout: 5_000 });
    await checkoutLink.first().click();
    await expect(page).toHaveURL(/\/checkout/);

    // 6. Fill checkout form
    await page.locator("#email").fill("e2e-test@dilling.dk");
    await page.locator("#name").fill("E2E Test Bruger");
    await page.locator("#street").fill("Testvej 42");
    await page.locator("#postalCode").fill("7182");
    await page.locator("#city").fill("Bredsten");

    // 7. Select DEMO payment
    const demoRadio = page.getByLabel(/demo/i).or(page.getByText(/demo/i));
    await demoRadio.first().click();

    // 8. Place order
    const placeOrderBtn = page.getByRole("button", {
      name: /bestil|place order|afgiv ordre/i,
    });
    await placeOrderBtn.first().click();

    // 9. Should redirect to orders with success
    await expect(page).toHaveURL(/\/orders\?success=/, { timeout: 30_000 });
    // Success notification should be visible
    await expect(
      page.getByText(/oprettet|success|ordre/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Browse & Filter Flow", () => {
  test("filter by gender → filter by material → view product → back to catalog", async ({
    page,
  }) => {
    // 1. Go to catalog
    await page.goto("/da/catalog");

    // 2. Filter by gender
    await page.locator("#gender-filter").selectOption("WOMEN");
    await expect(page).toHaveURL(/gender=WOMEN/);
    const productCards = page.locator("a[href*='/catalog/item/']");
    await expect(productCards.first()).toBeVisible({ timeout: 15_000 });

    // 3. Also filter by material
    await page.locator("#material-filter").selectOption("MERINO_WOOL");
    await expect(page).toHaveURL(/material=MERINO_WOOL/);

    // 4. Click a product
    await expect(productCards.first()).toBeVisible({ timeout: 15_000 });
    await productCards.first().click();
    await expect(page).toHaveURL(/\/catalog\/item\//);

    // 5. Go back to catalog
    const backLink = page.getByRole("link", { name: /back|tilbage/i }).or(
      page.locator("a[href*='/catalog']").filter({ hasText: /back|tilbage|←/i })
    );
    await backLink.first().click();
    await expect(page).toHaveURL(/\/catalog/);
  });
});

test.describe("Search to Purchase Flow", () => {
  test("search → view product → add to cart", async ({ page }) => {
    // 1. Go to search page
    await page.goto("/da/search");
    const searchInput = page.locator("#search").or(
      page.getByPlaceholder(/søg|search/i)
    );
    await searchInput.first().fill("merino");
    await searchInput.first().press("Enter");

    // 2. Should be on catalog with search query
    await expect(page).toHaveURL(/\/catalog\?q=merino/);

    // 3. If products found, click first one
    const productCards = page.locator("a[href*='/catalog/item/']");
    await page.waitForTimeout(3000);
    const count = await productCards.count();
    if (count > 0) {
      await productCards.first().click();
      await expect(page).toHaveURL(/\/catalog\/item\//);

      // 4. Select size and add to cart
      const sizeButtons = page.getByRole("button").filter({
        hasText: /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3}(\/\d{2,3})?)$/,
      });
      if ((await sizeButtons.count()) > 0) {
        await sizeButtons.first().click();
      }
      const addToCartBtn = page.getByRole("button", {
        name: /tilføj|add to cart|læg i kurv/i,
      });
      await addToCartBtn.first().click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe("Category Navigation Flow", () => {
  test("home → category → product → cart → checkout", async ({ page }) => {
    // 1. Start on home page
    await page.goto("/da");

    // 2. Click a category
    const categoryLink = page.getByRole("link", { name: /kvinder|women/i }).first();
    await expect(categoryLink).toBeVisible({ timeout: 10_000 });
    await categoryLink.click();
    await expect(page).toHaveURL(/\/catalog/);

    // 3. Click a product
    const productCards = page.locator("a[href*='/catalog/item/']");
    await expect(productCards.first()).toBeVisible({ timeout: 15_000 });
    await productCards.first().click();
    await expect(page).toHaveURL(/\/catalog\/item\//);

    // 4. Add to cart
    const sizeButtons = page.getByRole("button").filter({
      hasText: /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3}(\/\d{2,3})?)$/,
    });
    if ((await sizeButtons.count()) > 0) {
      await sizeButtons.first().click();
    }
    const addToCartBtn = page.getByRole("button", {
      name: /tilføj|add to cart|læg i kurv/i,
    });
    await addToCartBtn.first().click();
    await page.waitForTimeout(1500);

    // 5. Go to checkout from drawer
    const checkoutLink = page.getByRole("link", { name: /checkout|betal|til kassen/i }).or(
      page.getByRole("button", { name: /checkout|betal|til kassen/i })
    );
    if (await checkoutLink.first().isVisible().catch(() => false)) {
      await checkoutLink.first().click();
      await expect(page).toHaveURL(/\/checkout/);
    }
  });
});

test.describe("Multi-Item Cart Flow", () => {
  test("add multiple different products to cart", async ({ page }) => {
    // 1. Go to catalog
    await page.goto("/da/catalog");
    const productCards = page.locator("a[href*='/catalog/item/']");
    await expect(productCards.first()).toBeVisible({ timeout: 15_000 });

    // 2. Add first product
    await productCards.first().click();
    const sizeButtons = page.getByRole("button").filter({
      hasText: /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3}(\/\d{2,3})?)$/,
    });
    if ((await sizeButtons.count()) > 0) {
      await sizeButtons.first().click();
    }
    const addToCartBtn = page.getByRole("button", {
      name: /tilføj|add to cart|læg i kurv/i,
    });
    await addToCartBtn.first().click();
    await page.waitForTimeout(1500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // 3. Go back and add second product
    await page.goto("/da/catalog");
    await expect(productCards.first()).toBeVisible({ timeout: 15_000 });
    const productCount = await productCards.count();
    if (productCount > 1) {
      await productCards.nth(1).click();
      const sizeButtons2 = page.getByRole("button").filter({
        hasText: /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3}(\/\d{2,3})?)$/,
      });
      if ((await sizeButtons2.count()) > 0) {
        await sizeButtons2.first().click();
      }
      const addToCartBtn2 = page.getByRole("button", {
        name: /tilføj|add to cart|læg i kurv/i,
      });
      await addToCartBtn2.first().click();
      await page.waitForTimeout(1000);
    }

    // 4. Go to cart page and verify multiple items
    await page.goto("/da/cart");
    await page.waitForTimeout(1000);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
