import { test, type Page } from "@playwright/test";

/**
 * ~30s walkthrough of the lessons flow, in guest mode:
 * Dashboard -> Course -> "Angles in a Triangle" -> work through problems,
 * deliberately answering wrong first so the feedback behavior shows.
 *
 * Note on flow: in guest mode a *correct* answer marks the problem solved,
 * which moves the "first unsolved" pointer forward and auto-advances the
 * player to the next problem (no "Continue" click needed). Wrong answers stay
 * put and show feedback. `proceed()` tolerates either behavior.
 *
 * MC options are KaTeX-rendered math, so they're targeted positionally within
 * the options grid rather than by text.
 */

const beat = (page: Page, ms = 1500) => page.waitForTimeout(ms);

function options(page: Page) {
  // The MC options live in the only `grid gap-2.5` container in ProblemPlayer.
  return page.locator("div.grid.gap-2\\.5 > button");
}

function problemHeading(page: Page, n: number) {
  return page.getByText(`Problem ${n} of 5`).first();
}

/** Wait for problem `n` to be on screen, clicking "Continue" if it's shown. */
async function proceed(page: Page, n: number) {
  try {
    await problemHeading(page, n).waitFor({ timeout: 4000 });
    return;
  } catch {
    // Not auto-advanced; fall back to the explicit Continue button.
  }
  const cont = page.getByRole("button", { name: /^(Continue|Finish lesson)$/ });
  if (await cont.isVisible().catch(() => false)) {
    await cont.click();
    await problemHeading(page, n).waitFor({ timeout: 8000 });
  }
}

test("lessons walkthrough", async ({ page }) => {
  test.setTimeout(90_000);

  // 1. Dashboard
  await page.goto("/");
  await page.getByRole("heading", { name: "Welcome", exact: true }).waitFor();
  await beat(page, 2000);

  // 2. Course map
  await page.getByRole("link", { name: "Course", exact: true }).click();
  await page.getByRole("heading", { name: "Angles in a Triangle" }).waitFor();
  await beat(page, 1800);

  // 3. Open the first lesson + read the concept
  await page.locator('a[href="/lesson/triangle-angle-sum"]').click();
  await page.getByText("The idea").waitFor();
  await beat(page, 2600);
  await page.getByRole("button", { name: "Start problems" }).click();
  await problemHeading(page, 1).waitFor();
  await beat(page, 1500);

  // 4. Problem 1 (multiple choice): wrong first (see feedback), then correct.
  await options(page).nth(2).click(); // 360 degrees - wrong
  await beat(page, 2800);
  await options(page).nth(1).click(); // 180 degrees - correct
  await proceed(page, 2);
  await beat(page, 2000);

  // 5. Problem 2 (algebraic): submit empty -> wrong feedback -> reveal answer.
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await beat(page, 2600);
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await beat(page, 2400);
  await proceed(page, 3);
  await beat(page, 1800);

  // 6. Problem 3 (algebraic): wrong -> reveal, to keep moving.
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await beat(page, 2400);
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await beat(page, 2200);
  await proceed(page, 4);
  await beat(page, 1800);

  // 7. Problem 4 (multiple choice): reinforce wrong-then-right feedback.
  await options(page).nth(2).click(); // wrong
  await beat(page, 2600);
  await options(page).nth(1).click(); // 180 degrees - correct
  await proceed(page, 5);
  await beat(page, 2600); // settle on the final (right-angle) problem
});
