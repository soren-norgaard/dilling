import { test, expect } from "@playwright/test";

test.describe("Orders Page", () => {
  test("displays orders heading", async ({ page }) => {
    await page.goto("/da/orders");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("shows no orders message or order list", async ({ page }) => {
    await page.goto("/da/orders");
    // Either shows no orders text or a list of orders
    const content = page.getByText(/ingen|no orders|ordre/i);
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  });

  test("success notification shows after checkout", async ({ page }) => {
    await page.goto("/da/orders?success=test-order-123");
    // Should show success message with the order ID
    const successMsg = page.getByText(/oprettet|success|test-order/i);
    await expect(successMsg.first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Orders API", () => {
  test("returns orders array", async ({ request }) => {
    const res = await request.get("/api/orders");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.orders).toBeDefined();
    expect(Array.isArray(body.orders)).toBe(true);
  });
});
