import { test, expect, Page } from "@playwright/test";

async function addProductToCart(page: Page) {
  await page.goto("/da/catalog");
  const productCard = page.locator("a[href*='/catalog/item/']").first();
  await expect(productCard).toBeVisible({ timeout: 15_000 });
  await productCard.click();
  await expect(page).toHaveURL(/\/catalog\/item\//);

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

test.describe("Checkout Page", () => {
  test("shows empty state when cart is empty", async ({ page }) => {
    await page.goto("/da/checkout");
    const emptyText = page.getByText(/tom|empty|ingen varer/i);
    await expect(emptyText.first()).toBeVisible({ timeout: 10_000 });
  });

  test("displays checkout form with all required fields", async ({ page }) => {
    await addProductToCart(page);
    await page.goto("/da/checkout");

    // Email field
    const emailInput = page.locator("#email");
    await expect(emailInput).toBeVisible({ timeout: 10_000 });

    // Shipping fields
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#street")).toBeVisible();
    await expect(page.locator("#postalCode")).toBeVisible();
    await expect(page.locator("#city")).toBeVisible();
  });

  test("shows payment method options", async ({ page }) => {
    await addProductToCart(page);
    await page.goto("/da/checkout");

    // Look for payment method radio buttons or labels
    await expect(
      page.getByText(/demo|gratis test/i).or(page.getByText(/payment|betaling/i))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("displays order summary with items", async ({ page }) => {
    await addProductToCart(page);
    await page.goto("/da/checkout");

    // Order summary section
    const summary = page.getByText(/ordre|order summary|oversigt/i);
    await expect(summary.first()).toBeVisible({ timeout: 10_000 });

    // Should show total
    await expect(page.getByText(/total/i).first()).toBeVisible();
  });

  test("form validation requires email", async ({ page }) => {
    await addProductToCart(page);
    await page.goto("/da/checkout");

    // Try to submit without filling anything
    const placeOrderBtn = page.getByRole("button", {
      name: /bestil|place order|afgiv ordre/i,
    });
    await expect(placeOrderBtn.first()).toBeVisible({ timeout: 10_000 });
    await placeOrderBtn.first().click();

    // Email should be required (HTML5 validation)
    const emailInput = page.locator("#email");
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.checkValidity()
    );
    expect(isInvalid).toBe(true);
  });

  test("demo checkout flow completes successfully", async ({ page }) => {
    await addProductToCart(page);
    await page.goto("/da/checkout");

    // Fill in form
    await page.locator("#email").fill("test@example.com");
    await page.locator("#name").fill("Test User");
    await page.locator("#street").fill("Testvej 1");
    await page.locator("#postalCode").fill("7182");
    await page.locator("#city").fill("Bredsten");

    // Select DEMO payment method
    const demoRadio = page.getByLabel(/demo/i).or(page.getByText(/demo/i));
    await demoRadio.first().click();

    // Submit
    const placeOrderBtn = page.getByRole("button", {
      name: /bestil|place order|afgiv ordre/i,
    });
    await placeOrderBtn.first().click();

    // Should redirect to orders page with success param
    await expect(page).toHaveURL(/\/orders\?success=/, { timeout: 30_000 });
  });

  test("shipping shows free delivery", async ({ page }) => {
    await addProductToCart(page);
    await page.goto("/da/checkout");

    await expect(
      page.getByText(/gratis fragt|free shipping/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Checkout API", () => {
  test("rejects checkout with empty items", async ({ request }) => {
    const res = await request.post("/api/checkout", {
      data: {
        items: [],
        email: "test@example.com",
        shippingAddress: {
          name: "Test",
          street: "Testvej 1",
          city: "Bredsten",
          postalCode: "7182",
          country: "DK",
        },
        paymentMethod: "DEMO",
        locale: "DA",
        currency: "DKK",
      },
    });
    // Should return an error for empty items
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
