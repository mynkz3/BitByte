import { expect, test } from "@playwright/test";

test("research idea produces explainable ranked dataset results", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".catalog-status")).toContainText("fixture-catalog", {
    timeout: 30_000,
  });
  await page.getByRole("textbox", { name: /research idea/i }).fill(
    "I want to classify retinal images for a medical screening model using F1.",
  );
  await page.getByRole("button", { name: /analyze my research/i }).click();

  await expect(page.getByText("image", { exact: true })).toBeVisible();
  await page.getByLabel(/priority for image/i).selectOption("must_have");
  await page.getByRole("button", { name: /use these requirements/i }).click();

  await expect(page.getByRole("heading", { name: "Demo Retinal Images" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("link", { name: /open on huggingface/i })).toBeVisible();
  await expect(page.getByText(/modality matches the research requirements/i)).toBeVisible();
});
