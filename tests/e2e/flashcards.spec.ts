import { expect, test } from "@playwright/test";

test.describe("Flashcard journeys", () => {
  test("landing page redirects to study view with navigation", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/study$/);
    const nav = page.locator("[data-app-nav]");
    await expect(nav.getByRole("link", { name: "Flashcards" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Study" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Study Mode" })).toBeVisible();
  });

  test("user can create and study a flashcard", async ({ page }) => {
    await page.goto("/flashcards");

    await expect(page).toHaveURL(/\/flashcards$/);

    const categoryName = `Geometry ${Date.now()}`;
    const cardFront = `Triangle ${Date.now()}`;
    const cardBack = "Has three sides";

    await page.getByPlaceholder("New category name").fill(categoryName);
    await page.getByRole("button", { name: "Add Category" }).click();
    await expect(page.getByText(`${categoryName} is empty`)).toBeVisible();

    await page.getByLabel("Front").fill(cardFront);
    await page.getByLabel("Back").fill(cardBack);
    await page.getByRole("button", { name: "Add Flashcard" }).click();

    await page
      .getByRole("button", { name: new RegExp(`View ${categoryName} flashcards`, "i") })
      .click();

    const card = page
      .locator("div")
      .filter({ has: page.getByRole("heading", { name: cardFront }) })
      .filter({ has: page.getByText(cardBack) })
      .first();

    await expect(card).toBeVisible();

    await card.getByRole("button", { name: "Learn" }).click();
    await expect(card.getByRole("button", { name: "Unlearn" })).toBeVisible();
  });
});
