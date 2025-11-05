import { expect, test, type Page } from "@playwright/test";
import jwt from "jsonwebtoken";

const ADMIN_USERNAME = process.env.TEST_ADMIN_USERNAME ?? "admin@example.com";
const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET ?? "dev-access-token-secret";

const loginAsAdmin = async (page: Page) => {
  const accessToken = jwt.sign(
    {
      sub: "playwright-e2e-admin",
      username: ADMIN_USERNAME,
      roles: ["admin"],
      type: "access",
    },
    ACCESS_TOKEN_SECRET,
    {
      algorithm: "HS256",
      expiresIn: 15 * 60,
      issuer: "flashcard-backend",
    },
  );

  await page.context().addCookies([
    {
      name: "flashcard_access_token",
      value: accessToken,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);

  await page.goto("/study");
};

test.describe("Flashcard journeys", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("study dashboard shows navigation links after login", async ({ page }) => {
    await expect(page).toHaveURL(/\/study$/);
    await expect(page.getByRole("link", { name: "Flashcard App" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Flashcards", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Study", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Progress", exact: true })).toBeVisible();
  });

  test("user can create and study a flashcard", async ({ page }) => {
    await page.goto("/flashcards");

    await expect(page.getByRole("button", { name: "Add Category" })).toBeVisible();

    const categoryName = `Geometry ${Date.now()}`;
    await page.getByPlaceholder("New category name").fill(categoryName);
    await page.getByRole("button", { name: "Add Category" }).click();
    await expect(page.getByText(`${categoryName} is empty`)).toBeVisible();

    const flashcardFront = `Triangle ${Date.now()}`;
    await page.getByLabel("Front").fill(flashcardFront);
    await page.getByLabel("Back").fill("Has three sides");
    await page.getByRole("button", { name: "Add Flashcard" }).click();

    await page
      .getByRole("button", { name: new RegExp(`View ${categoryName} flashcards`, "i") })
      .click();

    await expect(page.getByRole("heading", { name: flashcardFront })).toBeVisible();
    await page.getByRole("button", { name: "Learn" }).first().click();
    await expect(page.getByRole("button", { name: "Unlearn" }).first()).toBeVisible();
  });
});
