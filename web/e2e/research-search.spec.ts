import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

test.setTimeout(120_000);

test("research idea produces explainable ranked dataset results", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".catalog-status")).toContainText("fixture-catalog", {
    timeout: 30_000,
  });
  await page.getByRole("textbox", { name: /research idea/i }).fill(
    "I want to classify retinal images for a medical screening model using F1.",
  );
  await page.getByRole("button", { name: /analyze my research/i }).click();

  await expect(
    page.locator(".requirement-row").filter({ hasText: "Modality" }).getByText("image", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".requirement-row")
    .filter({ hasText: "Modality" })
    .getByLabel(/priority for image/i)
    .selectOption("must_have");
  await page.getByRole("button", { name: /use these requirements/i }).click();

  await expect(page.getByRole("heading", { name: "Demo Image Classification Dataset" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("link", { name: /open on huggingface/i })).toBeVisible();
  await expect(page.getByText(/modality matches the research requirements/i)).toBeVisible();
});

test("chemistry paper preserves named datasets and experiment context", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".catalog-status")).toContainText("fixture-catalog", {
    timeout: 30_000,
  });
  const chemistryText = await readFile(
    fileURLToPath(new URL("./fixtures/chemistry-paper.txt", import.meta.url)),
    "utf8",
  );
  await page.getByRole("textbox", { name: /research idea/i }).fill(chemistryText);
  await page.getByRole("button", { name: /analyze my research/i }).click();

  await expect(page.getByText("ESOL", { exact: true })).toBeVisible();
  await expect(page.getByText("BACE", { exact: true })).toBeVisible();
  await expect(page.getByText("gnn", { exact: true })).toBeVisible();
  await expect(page.getByText("mae", { exact: true })).toBeVisible();
  await page.getByLabel(/role for ESOL/i).selectOption("anchor");
  await page.getByLabel(/role for BACE/i).selectOption("context_only");
  await page.getByRole("button", { name: /use these requirements/i }).click();

  await expect(
    page.locator(".results-section").getByRole("heading", { name: "Paper-mentioned datasets" }),
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/Exact alias match for ESOL/i)).toBeVisible();
});
