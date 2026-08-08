#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.THEME_AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const tolerance = 0.75;
const problems = [];

try {
  const reducedContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await reducedContext.newPage();
  const response = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`Homepage returned HTTP ${response?.status() ?? "no response"}.`);

  const heroHeight = await page.locator(".hero").evaluate((hero) => hero.getBoundingClientRect().height);
  const header = page.locator(".jl-global-header").first();
  const headerInner = header.locator(".jl-global-header__inner");

  const exercisePinnedDisclosure = async ({ label, buttonSelector, menuSelector, targetSelector }) => {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(25);

    const button = page.locator(buttonSelector).first();
    const menu = page.locator(menuSelector).first();
    const target = page.locator(targetSelector).first();

    await button.click();
    await menu.waitFor({ state: "visible" });

    const before = await headerInner.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const headerElement = element.closest(".jl-global-header, .jl-site-header");
      const pseudo = headerElement ? getComputedStyle(headerElement, "::before") : null;
      const switcherElement = headerElement?.querySelector("[data-site-switcher]");
      return {
        innerPosition: getComputedStyle(element).position,
        innerTop: rect.top,
        innerLeft: rect.left,
        innerRight: window.innerWidth - rect.right,
        innerWidth: rect.width,
        headerPosition: headerElement ? getComputedStyle(headerElement).position : null,
        pseudoPosition: pseudo?.position ?? null,
        pseudoTop: pseudo?.top ?? null,
        switcherPosition: switcherElement ? getComputedStyle(switcherElement).position : null,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    const scrollTarget = await page.evaluate((height) => Math.min(
      document.documentElement.scrollHeight - window.innerHeight,
      height + 200,
    ), heroHeight);
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), scrollTarget);
    await page.waitForTimeout(50);

    const after = await target.evaluate((option) => {
      const headerElement = document.querySelector(".jl-global-header");
      const inner = headerElement?.querySelector(".jl-global-header__inner");
      const switcherElement = headerElement?.querySelector("[data-site-switcher]");
      const identityElement = headerElement?.querySelector(".jl-site-identity__product");
      const navElement = headerElement?.querySelector(".jl-global-header__nav a");
      const hero = document.querySelector(".hero");
      const heroStyle = hero ? getComputedStyle(hero) : null;
      const pseudo = headerElement ? getComputedStyle(headerElement, "::before") : null;
      const innerRect = inner?.getBoundingClientRect();
      const optionRect = option.getBoundingClientRect();

      const hitTarget = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return hit === element || element.contains(hit);
      };

      return {
        expanded: headerElement?.querySelector('[data-site-switcher-button][aria-expanded="true"], [data-settings-button][aria-expanded="true"]') !== null,
        innerPosition: inner ? getComputedStyle(inner).position : null,
        innerTop: innerRect?.top ?? null,
        innerLeft: innerRect?.left ?? null,
        innerRight: innerRect ? window.innerWidth - innerRect.right : null,
        innerWidth: innerRect?.width ?? null,
        headerPosition: headerElement ? getComputedStyle(headerElement).position : null,
        pseudoPosition: pseudo?.position ?? null,
        pseudoTop: pseudo?.top ?? null,
        switcherPosition: switcherElement ? getComputedStyle(switcherElement).position : null,
        identityHitTarget: hitTarget(identityElement),
        navHitTarget: hitTarget(navElement),
        optionTop: optionRect.top,
        optionBottom: optionRect.bottom,
        optionHitTarget: hitTarget(option),
        viewportHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        heroOverflowX: heroStyle?.overflowX ?? null,
        heroOverflowY: heroStyle?.overflowY ?? null,
      };
    });

    if (before.innerPosition !== "fixed") problems.push(`${label} did not pin the complete header row when opened.`);
    if (after.innerPosition !== "fixed") problems.push(`${label} complete header row stopped being fixed while scrolling.`);
    if (before.headerPosition !== "sticky" || after.headerPosition !== "sticky") problems.push(`${label} removed the outer header from normal sticky flow.`);
    if (before.pseudoPosition !== "fixed" || after.pseudoPosition !== "fixed") problems.push(`${label} did not keep a full-width fixed header background.`);
    if (before.pseudoTop !== "0px" || after.pseudoTop !== "0px") problems.push(`${label} fixed header background is not anchored to the viewport top.`);
    if (before.switcherPosition === "fixed" || after.switcherPosition === "fixed") problems.push(`${label} still pins Sites/Settings independently from the header.`);
    if (!after.expanded) problems.push(`${label} closed while scrolling.`);
    if (Math.abs(after.innerTop - before.innerTop) > tolerance) problems.push(`${label} complete header row moved vertically while scrolling.`);
    if (Math.abs(after.innerLeft - before.innerLeft) > tolerance || Math.abs(after.innerRight - before.innerRight) > tolerance) problems.push(`${label} complete header row moved horizontally while scrolling.`);
    if (Math.abs(after.innerWidth - before.innerWidth) > tolerance) problems.push(`${label} complete header row changed width while scrolling.`);
    if (!after.identityHitTarget) problems.push(`${label} left the product identity covered after scrolling.`);
    if (!after.navHitTarget) problems.push(`${label} left primary navigation covered after scrolling.`);
    if (after.optionTop < 0 || after.optionBottom > after.viewportHeight) problems.push(`${label} menu content left the viewport.`);
    if (!after.optionHitTarget) problems.push(`${label} menu content is clipped or covered after scrolling.`);
    if (after.documentWidth > after.viewportWidth + 1 || before.documentWidth > before.viewportWidth + 1) problems.push(`${label} introduced horizontal overflow.`);
    if (after.heroOverflowX !== "clip" || after.heroOverflowY !== "visible") problems.push(`Homepage hero overflow is ${after.heroOverflowX} ${after.heroOverflowY} while ${label} is open, expected clip visible.`);

    await page.keyboard.press("Escape");
    await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute("aria-expanded") === "false", buttonSelector);
    const closed = await headerInner.evaluate((element) => {
      const headerElement = element.closest(".jl-global-header, .jl-site-header");
      const switcherElement = headerElement?.querySelector("[data-site-switcher]");
      return {
        innerPosition: getComputedStyle(element).position,
        switcherPosition: switcherElement ? getComputedStyle(switcherElement).position : null,
        exitState: headerElement?.hasAttribute("data-jl-header-disclosure-exit") ?? false,
      };
    });
    if (closed.exitState) problems.push(`${label} kept an exit animation active despite reduced-motion.`);
    if (closed.innerPosition !== "static") problems.push(`${label} did not return the complete header row to normal flow after reduced-motion close.`);
    if (closed.switcherPosition !== "relative") problems.push(`${label} did not return Sites/Settings to normal header positioning after close.`);
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
  await reducedContext.close();

  const motionContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light",
  });
  const motionPage = await motionContext.newPage();
  const motionResponse = await motionPage.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  if (!motionResponse?.ok()) throw new Error(`Homepage returned HTTP ${motionResponse?.status() ?? "no response"}.`);

  const motionHeroHeight = await motionPage.locator(".hero").evaluate((hero) => hero.getBoundingClientRect().height);
  const motionHeader = motionPage.locator(".jl-global-header").first();
  const motionInner = motionHeader.locator(".jl-global-header__inner");

  const exerciseAnimatedDismissal = async ({ label, buttonSelector, menuSelector }) => {
    await motionPage.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await motionPage.waitForTimeout(30);
    const button = motionPage.locator(buttonSelector).first();
    const menu = motionPage.locator(menuSelector).first();
    await button.click();
    await menu.waitFor({ state: "visible" });

    const scrollTarget = await motionPage.evaluate((height) => Math.min(
      document.documentElement.scrollHeight - window.innerHeight,
      height + 200,
    ), motionHeroHeight);
    await motionPage.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), scrollTarget);
    await motionPage.waitForTimeout(50);

    const naturalTop = await motionHeader.evaluate((element) => element.getBoundingClientRect().top);
    if (naturalTop >= -1) problems.push(`${label} animation audit did not scroll beyond the header's natural range.`);

    await motionPage.mouse.click(20, 600);
    await motionPage.waitForFunction((selector) => document.querySelector(selector)?.getAttribute("aria-expanded") === "false", buttonSelector);
    await motionPage.waitForFunction(() => document.querySelector(".jl-global-header")?.hasAttribute("data-jl-header-disclosure-exit"));

    const start = await motionInner.evaluate((element) => ({
      position: getComputedStyle(element).position,
      top: element.getBoundingClientRect().top,
    }));
    if (start.position !== "fixed") problems.push(`${label} stopped fixing the complete header before its exit animation.`);
    if (start.top < -4) problems.push(`${label} exit animation did not begin from the viewport top.`);

    await motionPage.waitForTimeout(70);
    const middle = await motionInner.evaluate((element) => ({
      position: getComputedStyle(element).position,
      top: element.getBoundingClientRect().top,
      height: element.getBoundingClientRect().height,
    }));
    if (middle.position !== "fixed") problems.push(`${label} stopped fixing the complete header during its exit animation.`);
    if (!(middle.top < start.top - 1)) problems.push(`${label} did not animate the complete header upward after click-away close.`);
    if (middle.top <= -middle.height - 1) problems.push(`${label} exit animation jumped past the header instead of moving through it.`);

    await motionPage.waitForFunction(() => !document.querySelector(".jl-global-header")?.hasAttribute("data-jl-header-disclosure-exit"), null, { timeout: 1000 });
    const finished = await motionInner.evaluate((element) => {
      const headerElement = element.closest(".jl-global-header, .jl-site-header");
      const switcherElement = headerElement?.querySelector("[data-site-switcher]");
      return {
        position: getComputedStyle(element).position,
        switcherPosition: switcherElement ? getComputedStyle(switcherElement).position : null,
      };
    });
    if (finished.position !== "static") problems.push(`${label} did not return the complete header to normal flow after its exit animation.`);
    if (finished.switcherPosition !== "relative") problems.push(`${label} did not restore Sites/Settings positioning after its exit animation.`);
  };

  await exerciseAnimatedDismissal({
    label: "Settings",
    buttonSelector: "[data-settings-button]",
    menuSelector: "[data-settings-menu]",
  });
  await exerciseAnimatedDismissal({
    label: "Sites",
    buttonSelector: "[data-site-switcher-button]",
    menuSelector: "[data-site-switcher-menu]",
  });
  await motionContext.close();

  if (problems.length) throw new Error(problems.join(" "));
  console.log("Complete-header pinning and animated dismissal audit passed.");
} finally {
  await browser.close();
}
