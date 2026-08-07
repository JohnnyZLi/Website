#!/usr/bin/env node
import { chromium } from "playwright";

const url = process.env.PRODUCTION_THEME_URL ?? "https://johnnyli.dev/";
const attempts = Number.parseInt(process.env.PRODUCTION_THEME_ATTEMPTS ?? "20", 10);
const delayMs = Number.parseInt(process.env.PRODUCTION_THEME_DELAY_MS ?? "30000", 10);
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const cacheKeyPattern = /\?v=([0-9a-f]{40})(?:$|[&#])/;

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

      const settingsButton = page.locator("[data-settings-button]").first();
      await settingsButton.waitFor({ state: "visible", timeout: 10000 });
      await settingsButton.click();

      const settingsMenu = page.locator("[data-settings-menu]").first();
      await settingsMenu.waitFor({ state: "visible", timeout: 5000 });
      const sitesMenu = page.locator("[data-site-switcher-menu]").first();
      if (await sitesMenu.isVisible()) throw new Error("Sites stayed open while Settings was open.");

      const controls = settingsMenu.locator("button[data-theme-preference]");
      const count = await controls.count();
      const labels = await controls.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")));
      const visibleText = await controls.allTextContents();
      const icons = await settingsMenu.locator(".jl-theme-option__icon").count();
      const menuWidth = await settingsMenu.evaluate((element) => element.getBoundingClientRect().width);

      if (count !== 3 || icons !== 3) throw new Error(`Live Settings has ${count} controls and ${icons} icons.`);
      if (labels.join("|") !== "System|Light|Dark") throw new Error(`Live Settings labels are ${JSON.stringify(labels)}.`);
      if (visibleText.some((value) => value.trim().length > 0)) throw new Error(`Live Settings still contains visible text: ${JSON.stringify(visibleText)}.`);
      if (menuWidth > 72) throw new Error(`Live Settings rail is ${menuWidth}px wide; expected at most 72px.`);

      const cacheState = await page.evaluate(() => ({
        themeStyles: document.querySelector('link[href*="assets/design-system/theme-control.css"]')?.href ?? "",
        siteSwitcher: document.querySelector('script[src*="site-switcher.js"]')?.src ?? "",
      }));
      const styleKey = cacheState.themeStyles.match(/\?v=([0-9a-f]{40})(?:$|[&#])/)?.[1] ?? null;
      const scriptKey = cacheState.siteSwitcher.match(/\?v=([0-9a-f]{40})(?:$|[&#])/)?.[1] ?? null;
      if (!cacheKeyPattern.test(cacheState.themeStyles) || !cacheKeyPattern.test(cacheState.siteSwitcher)) {
        throw new Error(`Live cache keys are missing: ${JSON.stringify(cacheState)}.`);
      }
      if (styleKey !== scriptKey) throw new Error(`Live CSS/script cache keys disagree: ${styleKey} vs ${scriptKey}.`);

      await controls.nth(2).click();
      await page.waitForFunction(() => document.documentElement.dataset.themePreference === "dark");
      const selected = await settingsMenu.locator('[data-theme-preference][aria-pressed="true"]').getAttribute("aria-label");
      if (selected !== "Dark") throw new Error(`Dark selection did not synchronize; selected ${selected}.`);

      console.log(`Production icon-only Settings rail verified on attempt ${attempt} with cache key ${styleKey}.`);
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
