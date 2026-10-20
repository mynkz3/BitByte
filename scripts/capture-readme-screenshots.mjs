import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.BITBYTE_BASE_URL ?? "http://127.0.0.1:5173/BitByte/";
const outputDir = "docs/assets/screenshots";

const examples = [
  {
    slug: "breast-cancer-results",
    text: "I need the Breast Cancer Wisconsin (Diagnostic) dataset for a medical tabular classification model. The target is diagnosis from patient records. I want train and test data and will evaluate with accuracy and F1.",
  },
  {
    slug: "iris-results",
    text: "I want to classify Iris species from tabular flower measurements. I am training a small model with a train and test split and will evaluate it with accuracy.",
  },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });

for (const example of examples) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator(".catalog-status").waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("textbox", { name: /research idea/i }).fill(example.text);
  await page.getByRole("button", { name: /analyze my research/i }).click();
  await page.locator(".requirement-groups").waitFor({ state: "visible", timeout: 15_000 });
  await page.screenshot({
    path: `${outputDir}/${example.slug}-context.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /use these requirements/i }).click();
  await page.locator(".results-section .dataset-card").first().waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await page.screenshot({
    path: `${outputDir}/${example.slug}.png`,
    fullPage: false,
  });
}

await browser.close();
