import { expect, test } from "@playwright/test";

test("guided onboarding smoke path stays usable", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText(/igbc documentation operations/i)).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  const signInButton = page.getByRole("button", { name: /^sign in$/i });
  await expect(signInButton).toBeVisible();

  if (await signInButton.isDisabled()) {
    await expect(page.getByText(/live workspace credentials are not configured/i)).toBeVisible();
  } else {
    await expect(signInButton).toBeEnabled();
  }
});
