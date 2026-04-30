import { expect, test } from "@playwright/test";

function expectInsideViewport(box: { x: number; y: number; width: number; height: number }, viewport: { width: number; height: number }) {
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

test.describe("UX quality gates", () => {
  test("login page loads quickly and avoids runtime crash overlays", async ({ page }) => {
    const start = Date.now();
    const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
    const durationMs = Date.now() - start;

    expect(response).toBeTruthy();
    expect([200, 304]).toContain(response!.status());
    expect(durationMs).toBeLessThan(20000);

    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByText(/Unhandled Runtime Error|Server Error|Cannot read properties/i)).toHaveCount(0);
  });

  test("core key paths respond without server error", async ({ request }) => {
    for (const path of ["/login", "/dashboard", "/projects", "/documents", "/credits", "/team"]) {
      const response = await request.get(path);
      expect([200, 302, 303, 307, 308]).toContain(response.status());
    }
  });

  test("mobile readability gate on login", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    const heading = page.getByRole("heading", { name: /sign in/i });
    const email = page.getByLabel("Email");
    const password = page.getByLabel("Password");
    const button = page.getByRole("button", { name: /sign in/i });

    await expect(heading).toBeVisible();
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await expect(button).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    const v = viewport!;
    await button.scrollIntoViewIfNeeded();
    const boxes = await Promise.all([heading.boundingBox(), email.boundingBox(), password.boundingBox(), button.boundingBox()]);
    for (const box of boxes) {
      expect(box).toBeTruthy();
      expectInsideViewport(box!, v);
    }
  });
});
