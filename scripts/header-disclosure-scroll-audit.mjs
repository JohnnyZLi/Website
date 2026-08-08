#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.THEME_AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const tolerance = 0.75;

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const response = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`Homepage returned HTTP ${response?.status() ?? "no response"}.`);

  const heroHeight = await page.locator(".hero").evaluate((hero) => hero.getBoundingClientRect().height);
  const switcher = page.locator("[data-site-switcher]").first();
  const problems = [];

  const exercisePinnedDisclosure = async ({ label, buttonSelector, menuSelector, targetSelector }) => {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(25);

    const button = page.locator(buttonSelector).first();
    const menu = page.locator(menuSelector).first();
    const target = page.locator(targetSelector).first();

    await button.click();
    await menu.waitFor({ state: "visible" });

    const before = await switcher.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        position: getComputedStyle(element).position,
        top: rect.top,
        right: window.innerWidth - rect.right,
        documentWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });

    const scrollTarget = await page.evaluate((height) => Math.min(
      document.documentElement.scrollHeight - window.innerHeight,
      height + 200,
    ), heroHeight);
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), scrollTarget);
    await page.waitForTimeout(50);

    const after = await target.evaluate((option) => {
      const switcherElement = document.querySelector("[data-site-switcher]");
      const switcherRect = switcherElement?.getBoundingClientRect();
      const optionRect = option.getBoundingClientRect();
      const x = optionRect.left + optionRect.width / 2;
      const y = optionRect.top + optionRect.height / 2;
      const hit = document.elementFromPoint(x, y);
      const hero = document.querySelector(".hero");
      const heroStyle = hero ? getComputedStyle(hero) : null;
      return {
        expanded: option.closest("[data-site-switcher]")?.querySelector('[aria-expanded="true"]') !== null,
        position: switcherElement ? getComputedStyle(switcherElement).position : null,
        top: switcherRect?.top ?? null,
        right: switcherRect ? window.innerWidth - switcherRect.right : null,
        optionTop: optionRect.top,
        optionBottom: optionRect.bottom,
        viewportHeight: window.innerHeight,
        hitTarget: hit === option || option.contains(hit),
        documentWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        heroOverflowX: heroStyle?.overflowX ?? null,
        heroOverflowY: heroStyle?.overflowY ?? null,
      };
    });

    if (before.position !== "fixed") problems.push(`${label} was not fixed when opened.`);
    if (after.position !== "fixed") problems.push(`${label} stopped being fixed while scrolling.`);
    if (!after.expanded) problems.push(`${label} closed while scrolling.`);
    if (Math.abs(after.top - before.top) > tolerance) problems.push(`${label} moved vertically while scrolling.`);
    if (Math.abs(after.right - before.right) > tolerance) problems.push(`${label} moved horizontally while scrolling.`);
    if (after.optionTop < 0 || after.optionBottom > after.viewportHeight) problems.push(`${label} content left the viewport.`);
    if (!after.hitTarget) problems.push(`${label} content is clipped or covered after scrolling.`);
    if (after.documentWidth > after.innerWidth + 1 || before.documentWidth > before.innerWidth + 1) problems.push(`${label} introduced horizontal overflow.`);
    if (after.heroOverflowX !== "clip" || after.heroOverflowY !== "clip") {
      problems.push(`Homepage hero overflow changed while ${label} was open (${after.heroOverflowX} ${after.heroOverflowY}).`);
    }

    await page.keyboard.press("Escape");
    await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute("aria-expanded") === "false", buttonSelector);
    const closedPosition = await switcher.evaluate((element) => getComputedStyle(element).position);
    if (closedPosition !== "relative") problems.push(`${label} did not return to normal header positioning after close.`);
  };

  await exercisePinnedDisclosure({
    label: "Settings",
    buttonSelector: "[data-settings-button]",
    menuSelector: "[data-settings-menu]",
    targetSelector: '[data-theme-preference="dark"]',
  });

  await exercisePinnedDisclosure({
    label: "Sites",
    buttonSelector: "[data-site-switcher-button]",
    menuSelector: "[data-site-switcher-menu]",
    targetSelector: "[data-site-switcher-menu] a:last-child",
  });

  if (problems.length) throw new Error(problems.join(" "));
  console.log("Pinned header disclosure scroll audit passed.");
  await context.close();
} finally {
  await browser.close();
}
