import { expect, test } from "@playwright/test";

test.describe("Flashcard journeys", () => {
  test("landing page renders navigation cards", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Flashcard App" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Flashcards" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Study" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Progress" })).toBeVisible();
  });

  test("user can create and study a flashcard", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Flashcards" }).click();

    await expect(page).toHaveURL(/\/flashcards$/);
    await expect(
      page.getByText("No flashcards yet. Add your first one!"),
    ).toBeVisible();

    await page.getByLabel("Front").fill("Triangle");
    await page.getByLabel("Back").fill("Has three sides");
    await page.getByRole("button", { name: "Add Flashcard" }).click();

    const card = page
      .getByRole("heading", { name: "Triangle" })
      .locator("..")
      .first();

    await expect(card).toBeVisible();
    await expect(card.getByText("Has three sides")).toBeVisible();

    await card.getByRole("button", { name: "Learn" }).click();
    await expect(card.getByRole("button", { name: "Unlearn" })).toBeVisible();
  });
});
