import { test, expect, Page } from "@playwright/test";

const DEFAULT_USER = process.env.E2E_USER_EMAIL ?? "ian.vincent@tdhagency.com";
const DEFAULT_PASSWORD = process.env.E2E_USER_PASSWORD ?? "Password123!";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEFAULT_USER);
  await page.getByLabel("Password").fill(DEFAULT_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

test.describe("Authenticated dashboard", () => {
  test("shows leave balance widget after login", async ({ page }) => {
    await signIn(page);

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Leave Balance")).toBeVisible();
    await expect(
      page.locator("div").filter({ hasText: "Leave Balance" }).nth(1)
    ).toBeVisible();
  });

  test("allows navigating to leave history", async ({ page }) => {
    await signIn(page);

    await page.goto("/leave/requests");
    await expect(page.getByRole("heading", { name: "My Leave History" })).toBeVisible();
    await expect(page.getByText("Filter by Status:")).toBeVisible();
    await expect(page.getByText("Leave Requests")).toBeVisible();
  });
});

