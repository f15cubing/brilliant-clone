import { test, type Page, type Locator, expect } from "@playwright/test";

/**
 * ~30s walkthrough of the freeplay proof builder, in guest mode, using the
 * 1-step "Inscribed angles on the same arc" puzzle:
 * pick the claim, select the angle points, cite the given, and assert -> the
 * local engine accepts it and the proof completes.
 *
 * The Claim control is a React-controlled <select> and the point slots are
 * React state, both of which can occasionally drop a programmatic change, so
 * each interaction is verified (and retried) before moving on.
 */

const beat = (page: Page, ms = 1500) => page.waitForTimeout(ms);

function builder(page: Page): Locator {
  return page.locator("section", {
    has: page.getByRole("heading", { name: "Assert a new fact" }),
  });
}

/** Choose the claim type, retrying until the controlled select actually holds it. */
async function selectClaim(page: Page, value: string) {
  const claim = page.locator("select");
  for (let i = 0; i < 6; i++) {
    await claim.selectOption(value);
    if ((await claim.inputValue()) === value) return;
    await beat(page, 300);
  }
  throw new Error(`Claim never settled on "${value}"`);
}

/** Click the point-palette buttons in order, verifying all slots fill. */
async function selectPoints(page: Page, ids: string[]) {
  // Filled slot buttons carry the literal `border-ultramarine` class; empty
  // ones are dashed and palette buttons only have `hover:border-ultramarine`.
  const filled = builder(page).locator("button.border-ultramarine");
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const id of ids) {
      await page.locator("button.rounded-full", { hasText: id }).first().click();
      await beat(page, 850);
    }
    try {
      await expect(filled).toHaveCount(ids.length, { timeout: 2500 });
      return;
    } catch {
      // Clear any partial slots by clicking the filled ones, then retry.
      const count = await filled.count();
      for (let i = count - 1; i >= 0; i--) await filled.nth(i).click();
      await beat(page, 300);
    }
  }
  throw new Error("Point slots never filled completely");
}

test("freeplay proof", async ({ page }) => {
  test.setTimeout(90_000);

  // 1. Dashboard -> Freeplay list
  await page.goto("/");
  await page.getByRole("heading", { name: "Welcome", exact: true }).waitFor();
  await beat(page, 1600);
  await page.getByRole("link", { name: "Freeplay", exact: true }).click();
  await page.getByRole("heading", { name: "Prove it yourself" }).waitFor();
  await beat(page, 2800);

  // 2. Open the intro puzzle, take in the figure + Goal panel.
  await page.locator('a[href="/freeplay/inscribed-angle"]').click();
  await page
    .getByRole("heading", { name: "Inscribed angles on the same arc" })
    .waitFor();
  await beat(page, 4500);

  // 3. Build the claim: Equal angles  ∠ABC = ∠DEF
  await selectClaim(page, "eqangle");
  await beat(page, 2000);

  // 4. Select the angle points: ∠APB = ∠AQB
  await selectPoints(page, ["A", "P", "B", "A", "Q", "B"]);
  await beat(page, 2000);

  // 5. Cite the given (A, B, P, Q are concyclic)
  await page.getByRole("checkbox").first().check();
  await beat(page, 2400);

  // 6. Assert the step -> engine accepts -> proof complete
  const assertBtn = page.getByRole("button", { name: "Assert step" });
  await expect(assertBtn).toBeEnabled({ timeout: 6000 });
  await assertBtn.click();
  await page.getByText("Proof complete!").waitFor();
  await beat(page, 5500);
});
