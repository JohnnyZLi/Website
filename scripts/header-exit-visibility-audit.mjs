#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.THEME_AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const problems = [];

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light",
  });
  const page = await context.newPage();
  const response = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`Homepage returned HTTP ${response?.status() ?? "no response"}.`);

  const heroHeight = await page.locator(".hero").evaluate((hero) => hero.getBoundingClientRect().height);
  const header = page.locator(".jl-global-header").first();
  const inner = header.locator(".jl-global-header__inner");

  const inspectExit = async (label) => {
    const state = await inner.evaluate((element) => {
      const headerElement = element.closest(".jl-global-header");
      const hero = headerElement?.closest(".hero");
      const heroStyle = hero ? getComputedStyle(hero) : null;
      const rect = element.getBoundingClientRect();
      const x = Math.min(window.innerWidth - 2, Math.max(2, rect.left + Math.min(120, rect.width / 2)));
      const y = Math.min(window.innerHeight - 2, Math.max(2, rect.top + Math.min(rect.height / 2, Math.max(2, rect.height - 2))));
      const hit = document.elementFromPoint(x, y);
      return {
        position: getComputedStyle(element).position,
        top: rect.top,
        bottom: rect.bottom,
        heroOverflowY: heroStyle?.overflowY ?? null,
        heroZIndex: heroStyle?.zIndex ?? null,
        hitInsideHeader: headerElement instanceof HTMLElement && hit instanceof Node
          ? headerElement.contains(hit)
          : false,
      };
    });

    if (state.position !== "fixed") problems.push(`${label} header is not fixed during dismissal.`);
    if (state.heroOverflowY !== "visible") problems.push(`${label} hero clips the header during dismissal (${state.heroOverflowY}).`);
    if (state.heroZIndex === "auto" || state.heroZIndex === null) problems.push(`${label} hero drops its elevated stacking context during dismissal.`);
    if (state.bottom > 1 && !state.hitInsideHeader) problems.push(`${label} moving header is covered or clipped while still visible in the viewport.`);
    return state;
  };

  const exercise = async ({ label, buttonSelector, menuSelector }) => {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(30);

    const button = page.locator(buttonSelector).first();
    const menu = page.locator(menuSelector).first();
    await button.click();
    await menu.waitFor({ state: "visible" });

    const scrollTarget = await page.evaluate((height) => Math.min(
      document.documentElement.scrollHeight - window.innerHeight,
      height + 200,
    ), heroHeight);
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), scrollTarget);
    await page.waitForTimeout(50);

    const naturalTop = await header.evaluate((element) => element.getBoundingClientRect().top);
    if (naturalTop >= -1) problems.push(`${label} audit did not move past the header's sticky range.`);

    await page.mouse.click(20, 600);
    await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute("aria-expanded") === "false", buttonSelector);
    await page.waitForFunction(() => document.querySelector(".jl-global-header")?.hasAttribute("data-jl-header-disclosure-exit"));

    const start = await inspectExit(`${label} start`);
    await page.waitForTimeout(70);
    const middle = await inspectExit(`${label} middle`);
    if (!(middle.top < start.top - 1)) problems.push(`${label} header does not move upward during dismissal.`);

    await page.waitForFunction(() => !document.querySelector(".jl-global-header")?.hasAttribute("data-jl-header-disclosure-exit"), null, { timeout: 1000 });
    const finished = await header.evaluate((element) => {
      const hero = element.closest(".hero");
      const heroStyle = hero ? getComputedStyle(hero) : null;
      return {
        innerPosition: getComputedStyle(element.querySelector(".jl-global-header__inner")).position,
        heroOverflowY: heroStyle?.overflowY ?? null,
        heroZIndex: heroStyle?.zIndex ?? null,
      };
    });
    if (finished.innerPosition !== "static") problems.push(`${label} header did not return to normal flow after dismissal.`);
    if (finished.heroOverflowY !== "clip") problems.push(`${label} hero did not restore clipping after dismissal (${finished.heroOverflowY}).`);
    if (finished.heroZIndex !== "auto") problems.push(`${label} hero kept its elevated stacking context after dismissal.`);
  };

  await exercise({
    label: "Settings",
    buttonSelector: "[data-settings-button]",
    menuSelector: "[data-settings-menu]",
  });
  await exercise({
    label: "Sites",
    buttonSelector: "[data-site-switcher-button]",
    menuSelector: "[data-site-switcher-menu]",
  });

  if (problems.length) throw new Error(problems.join(" "));
  console.log("Visible header dismissal audit passed.");
  await context.close();
} finally {
  await browser.close();
}
