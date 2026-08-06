#!/usr/bin/env node
import { chromium } from "playwright";

const url = process.env.PRODUCTION_THEME_URL ?? "https://johnnyli.dev/";
const attempts = Number.parseInt(process.env.PRODUCTION_THEME_ATTEMPTS ?? "20", 10);
const delayMs = Number.parseInt(process.env.PRODUCTION_THEME_DELAY_MS ?? "30000", 10);
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const browser = await chromium.launch({ headless: true });
let lastError;

try {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    try {
      const response = await page.goto(`${url}?appearance-smoke=${Date.now()}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      if (!response?.ok()) throw new Error(`Production returned HTTP ${response?.status() ?? "unknown"}.`);

      const switcher = page.locator("[data-site-switcher-button]").first();
      await switcher.waitFor({ state: "visible", timeout: 10000 });
      await switcher.click();

      const menu = page.locator("[data-site-switcher-menu]").first();
      await menu.waitFor({ state: "visible", timeout: 5000 });
      const links = await menu.locator("a[href]").count();
      const appearanceButtons = await menu.locator("button[data-theme-preference]").count();
      const labels = await menu.locator("button[data-theme-preference]").allTextContents();

      if (links !== 3 || appearanceButtons !== 3) {
        throw new Error(`Live menu has ${links} site links and ${appearanceButtons} Appearance controls.`);
      }
      if (labels.join("|") !== "System|Light|Dark") {
        throw new Error(`Live Appearance labels are ${JSON.stringify(labels)}.`);
      }

      console.log(`Production Appearance controls verified on attempt ${attempt}.`);
      await context.close();
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt}/${attempts} failed: ${error instanceof Error ? error.message : String(error)}`);
      await context.close();
      if (attempt < attempts) await sleep(delayMs);
    }
  }
} finally {
  await browser.close();
}

if (lastError) throw lastError;
