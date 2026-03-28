import { test, expect } from "@playwright/test";

test.describe("AI Chat Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/da/chat");
  });

  test("displays chat heading", async ({ page }) => {
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("shows Dilling avatar and greeting", async ({ page }) => {
    // Avatar with "D" or Dilling text
    await expect(
      page.getByText(/stylist|personlig/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("displays suggestion buttons", async ({ page }) => {
    // Should have clickable suggestion prompts
    const suggestions = page.getByRole("button").filter({
      hasText: /skitur|gave|størrelse|merinould|løbe|baby/i,
    });
    await expect(suggestions.first()).toBeVisible({ timeout: 10_000 });
    const count = await suggestions.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("chat input and send button are visible", async ({ page }) => {
    const input = page.getByPlaceholder(/skriv|spørg|besked|message/i).or(
      page.locator("input[type='text']")
    );
    await expect(input.first()).toBeVisible({ timeout: 10_000 });
    const sendBtn = page.getByRole("button").filter({
      has: page.locator("svg"),
    });
    await expect(sendBtn.last()).toBeVisible();
  });

  test("typing a message and sending shows user message", async ({ page }) => {
    const input = page.getByPlaceholder(/skriv|spørg|besked|message/i).or(
      page.locator("input[type='text']")
    );
    await input.first().fill("Hej, hvad kan du hjælpe med?");
    await input.first().press("Enter");

    // User message should appear in the chat
    await expect(
      page.getByText("Hej, hvad kan du hjælpe med?")
    ).toBeVisible({ timeout: 15_000 });
  });

  test("clicking suggestion button populates chat", async ({ page }) => {
    const suggestion = page.getByRole("button").filter({
      hasText: /skitur|gave|størrelse|merinould|løbe|baby/i,
    });
    await suggestion.first().click();

    // Should start a conversation — user message or assistant response
    await page.waitForTimeout(2000);
    // The suggestion text or a response should appear
    const messages = page.locator("[class*='message']").or(
      page.locator("p").filter({ hasText: /.{10,}/ })
    );
    await expect(messages.first()).toBeVisible({ timeout: 15_000 });
  });
});
