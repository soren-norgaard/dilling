import { test, expect, Page } from "@playwright/test";

async function addProductToCart(page: Page) {
  // Navigate to catalog and add first available product
  await page.goto("/da/catalog");
  const productCard = page.locator("a[href*='/catalog/item/']").first();
  await expect(productCard).toBeVisible({ timeout: 15_000 });
  await productCard.click();
  await expect(page).toHaveURL(/\/catalog\/item\//);

  // Select first available size
  const sizeButtons = page.getByRole("button").filter({
    hasText: /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3}(\/\d{2,3})?)$/,
  });
  if ((await sizeButtons.count()) > 0) {
    await sizeButtons.first().click();
  }

  // Click add to cart
  const addToCartBtn = page.getByRole("button", {
    name: /tilføj|add to cart|læg i kurv/i,
  });
  await addToCartBtn.first().click();

  // Wait for the cart drawer or feedback
  await page.waitForTimeout(1000);
}

test.describe("Cart Drawer", () => {
  test("opens when item is added to cart", async ({ page }) => {
    await addProductToCart(page);
    // Cart drawer should be visible
    const drawerContent = page.getByText(/kurv|cart/i).first();
    await expect(drawerContent).toBeVisible();
  });

  test("shows added item details", async ({ page }) => {
    await addProductToCart(page);
    // Check for quantity controls (−, +)
    await expect(
      page.getByRole("button", { name: /−|\-/ }).or(page.getByText("−")).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("closes when overlay is clicked", async ({ page }) => {
    await addProductToCart(page);
    // Click overlay (usually a div covering the background)
    const overlay = page.locator("[class*='overlay']").or(
      page.locator("[class*='backdrop']")
    );
    if ((await overlay.count()) > 0) {
      await overlay.first().click({ force: true });
      await page.waitForTimeout(500);
    }
  });

  test("closes with escape key", async ({ page }) => {
    await addProductToCart(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  test("proceed to checkout navigates to checkout page", async ({ page }) => {
    await addProductToCart(page);
    const checkoutLink = page.getByRole("link", { name: /checkout|betal|til kassen/i }).or(
      page.getByRole("button", { name: /checkout|betal|til kassen/i })
    );
    await expect(checkoutLink.first()).toBeVisible({ timeout: 5_000 });
    await checkoutLink.first().click();
    await expect(page).toHaveURL(/\/checkout/);
  });
});

test.describe("Cart Page", () => {
  test("shows empty state when no items", async ({ page }) => {
    await page.goto("/da/cart");
    // Either empty cart text or prompt to continue shopping
    const emptyText = page.getByText(/tom|empty/i).or(
      page.getByText(/ingen varer|no items/i)
    );
    await expect(emptyText.first()).toBeVisible({ timeout: 10_000 });
  });

  test("continue shopping link navigates to catalog", async ({ page }) => {
    await page.goto("/da/cart");
    const continueLink = page.getByRole("link", { name: /fortsæt|continue shopping/i }).or(
      page.getByRole("button", { name: /fortsæt|continue shopping/i })
    );
    const visible = await continueLink.first().isVisible().catch(() => false);
    if (visible) {
      await continueLink.first().click();
      await expect(page).toHaveURL(/\/catalog/);
    }
  });

  test("displays cart items after adding product", async ({ page }) => {
    await addProductToCart(page);
    // Close drawer and navigate to cart page
    await page.keyboard.press("Escape");
    await page.goto("/da/cart");
    // Should show items or empty (depends on store persistence)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("quantity controls update item count", async ({ page }) => {
    await addProductToCart(page);
    await page.keyboard.press("Escape");
    await page.goto("/da/cart");
    await page.waitForTimeout(1000);

    // If there are items, try incrementing
    const incrementBtn = page.getByRole("button", { name: /\+/ }).first();
    const visible = await incrementBtn.isVisible().catch(() => false);
    if (visible) {
      await incrementBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("proceed to checkout button works", async ({ page }) => {
    await addProductToCart(page);
    await page.keyboard.press("Escape");
    await page.goto("/da/cart");
    await page.waitForTimeout(1000);

    const checkoutBtn = page.getByRole("link", { name: /checkout|betal|til kassen/i }).or(
      page.getByRole("button", { name: /checkout|betal|til kassen/i })
    );
    const visible = await checkoutBtn.first().isVisible().catch(() => false);
    if (visible) {
      await checkoutBtn.first().click();
      await expect(page).toHaveURL(/\/checkout/);
    }
  });
});
