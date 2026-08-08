#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.THEME_AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const response = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`Homepage returned HTTP ${response?.status() ?? "no response"}.`);

  const settingsButton = page.locator("[data-settings-button]").first();
  const settingsMenu = page.locator("[data-settings-menu]").first();
  const lastThemeOption = page.locator('[data-theme-preference="dark"]').first();

  await settingsButton.click();
  await settingsMenu.waitFor({ state: "visible" });

  const heroHeight = await page.locator(".hero").evaluate((hero) => hero.getBoundingClientRect().height);
  await page.evaluate((height) => {
    window.scrollTo({ top: Math.max(0, height - 120), behavior: "instant" });
  }, heroHeight);
  await page.waitForTimeout(50);

  const state = await lastThemeOption.evaluate((option) => {
    const rect = option.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(x, y);
    const hero = document.querySelector(".hero");
    const heroStyle = hero ? getComputedStyle(hero) : null;
    return {
      expanded: document.querySelector("[data-settings-button]")?.getAttribute("aria-expanded"),
      optionTop: rect.top,
      optionBottom: rect.bottom,
      viewportHeight: window.innerHeight,
      hitTarget: hit === option || option.contains(hit),
      heroOverflowX: heroStyle?.overflowX ?? null,
      heroOverflowY: heroStyle?.overflowY ?? null,
    };
  });

  const problems = [];
  if (state.expanded !== "true") problems.push("Settings closed while scrolling.");
  if (state.optionTop < 0 || state.optionBottom > state.viewportHeight) problems.push("Regression target left the viewport.");
  if (!state.hitTarget) problems.push("The bottom Settings option is clipped after scrolling near the hero boundary.");
  if (state.heroOverflowX !== "clip") problems.push(`Open homepage hero overflow-x is ${state.heroOverflowX}, expected clip.`);
  if (state.heroOverflowY !== "visible") problems.push(`Open homepage hero overflow-y is ${state.heroOverflowY}, expected visible.`);

  if (problems.length) throw new Error(problems.join(" "));
  console.log("Scrolled header disclosure audit passed.");
  await context.close();
} finally {
  await browser.close();
}
