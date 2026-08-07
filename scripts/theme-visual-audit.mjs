#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.THEME_AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const output = "theme-visual-audit";
const routes = [
  ["home", "/"],
  ["case-study", "/projects/network-diagnostics-suite.html"],
  ["report", "/projects/network-diagnostics-suite/report/"],
];
const viewports = [
  ["desktop", { width: 1440, height: 1000 }],
  ["mobile", { width: 390, height: 844 }],
  ["minimum", { width: 320, height: 700 }],
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

const addPreference = async (context, preference) => {
  await context.addInitScript((value) => localStorage.setItem("jl-theme", value), preference);
};

try {
  for (const [routeName, route] of routes) {
    for (const [viewportName, viewport] of viewports) {
      for (const theme of ["light", "dark"]) {
        const context = await browser.newContext({ viewport, colorScheme: "light", reducedMotion: "reduce" });
        await addPreference(context, theme);
        const page = await context.newPage();
        const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
        await page.screenshot({ path: `${output}/${routeName}-${viewportName}-${theme}.png`, fullPage: true });
        const state = await page.evaluate(() => {
          const root = document.documentElement;
          const body = getComputedStyle(document.body);
          const meta = document.querySelector('meta[name="theme-color"]');
          return {
            preference: root.dataset.themePreference,
            theme: root.dataset.theme,
            colorScheme: getComputedStyle(root).colorScheme,
            background: body.backgroundColor,
            color: body.color,
            innerWidth: window.innerWidth,
            documentWidth: root.scrollWidth,
            themeColor: meta?.getAttribute("content") ?? null,
            linkCount: document.querySelectorAll("[data-site-switcher-menu] a[href]").length,
            themeButtons: document.querySelectorAll("button[data-theme-preference]").length,
            selectedButton: document.querySelector('[data-theme-preference][aria-pressed="true"]')?.getAttribute("data-theme-preference") ?? null,
            settingsButtons: document.querySelectorAll("[data-settings-button]").length,
            settingsMenus: document.querySelectorAll("[data-settings-menu]").length,
          };
        });
        const problems = [];
        if (!response?.ok()) problems.push(`HTTP ${response?.status() ?? "no response"}`);
        if (state.preference !== theme || state.theme !== theme) problems.push(`resolved ${state.preference}/${state.theme}, expected ${theme}`);
        if (!state.colorScheme.includes(theme)) problems.push(`color-scheme is ${state.colorScheme}`);
        if (state.documentWidth > state.innerWidth + 1) problems.push("horizontal overflow");
        if (state.linkCount !== 3) problems.push(`Sites menu has ${state.linkCount} links`);
        if (state.themeButtons !== 3) problems.push(`Appearance has ${state.themeButtons} options`);
        if (state.selectedButton !== theme) problems.push(`selected option is ${state.selectedButton}`);
        if (state.settingsButtons !== 1 || state.settingsMenus !== 1) problems.push("Settings control was not installed exactly once");
        const expectedThemeColor = theme === "dark" ? "#171714" : "#f2efe8";
        if (state.themeColor?.toLowerCase() !== expectedThemeColor) problems.push(`theme-color is ${state.themeColor}`);

        const settingsButton = page.locator("[data-settings-button]").first();
        await settingsButton.click();
        const settingsVisible = await page.locator("[data-settings-menu]").first().isVisible();
        const sitesHidden = !(await page.locator("[data-site-switcher-menu]").first().isVisible());
        if (!settingsVisible || !sitesHidden) problems.push("Settings menu did not open independently of Sites");

        const opposite = theme === "dark" ? "light" : "dark";
        await page.locator(`[data-theme-preference="${opposite}"]`).first().click();
        await page.waitForFunction((value) => document.documentElement.dataset.theme === value, opposite);
        const changed = await page.evaluate(() => ({
          preference: window.JLTheme?.getPreference(),
          theme: window.JLTheme?.getTheme(),
          stored: localStorage.getItem("jl-theme"),
          cookie: document.cookie,
          pressed: document.querySelector('[data-theme-preference][aria-pressed="true"]')?.getAttribute("data-theme-preference"),
          settingsOpen: document.querySelector("[data-settings-button]")?.getAttribute("aria-expanded"),
        }));
        if (changed.preference !== opposite || changed.theme !== opposite || changed.stored !== opposite || changed.pressed !== opposite) {
          problems.push("Appearance selection did not synchronize state");
        }
        if (changed.settingsOpen !== "true") problems.push("Settings menu closed while choosing an appearance option");
        if (!changed.cookie.includes(`jl-theme=${opposite}`)) problems.push("Appearance preference cookie missing");
        results.push({ routeName, viewportName, theme, state, changed, problems });
        await context.close();
      }
    }
  }

  const systemContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  await addPreference(systemContext, "system");
  const systemPage = await systemContext.newPage();
  await systemPage.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const systemProblems = [];
  let systemState = await systemPage.evaluate(() => ({ preference: window.JLTheme?.getPreference(), theme: window.JLTheme?.getTheme() }));
  if (systemState.preference !== "system" || systemState.theme !== "dark") systemProblems.push("System did not initially resolve dark");
  await systemPage.emulateMedia({ colorScheme: "light" });
  await systemPage.waitForFunction(() => document.documentElement.dataset.theme === "light");
  systemState = await systemPage.evaluate(() => ({ preference: window.JLTheme?.getPreference(), theme: window.JLTheme?.getTheme() }));
  if (systemState.preference !== "system" || systemState.theme !== "light") systemProblems.push("System follows operating-system changes failed");
  results.push({ routeName: "home", viewportName: "mobile", theme: "system", systemState, problems: systemProblems });
  await systemContext.close();

  const printContext = await browser.newContext({ viewport: { width: 816, height: 1056 }, colorScheme: "dark" });
  await addPreference(printContext, "dark");
  const printPage = await printContext.newPage();
  await printPage.goto(`${baseUrl}/projects/network-diagnostics-suite/report/`, { waitUntil: "networkidle" });
  const printProblems = [];
  await printPage.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  let printState = await printPage.evaluate(() => ({ theme: document.documentElement.dataset.theme, themeColor: document.querySelector('meta[name="theme-color"]')?.content }));
  if (printState.theme !== "light" || printState.themeColor?.toLowerCase() !== "#f2efe8") printProblems.push("beforeprint did not force light paper theme");
  await printPage.emulateMedia({ media: "print" });
  await printPage.pdf({ path: `${output}/report-from-dark.pdf`, format: "Letter", printBackground: true });
  await printPage.emulateMedia({ media: "screen" });
  await printPage.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  printState = await printPage.evaluate(() => ({ theme: document.documentElement.dataset.theme, themeColor: document.querySelector('meta[name="theme-color"]')?.content }));
  if (printState.theme !== "dark" || printState.themeColor?.toLowerCase() !== "#171714") printProblems.push("afterprint did not restore dark theme");
  results.push({ routeName: "report", viewportName: "print", theme: "dark", printState, problems: printProblems });
  await printContext.close();
} finally {
  await browser.close();
}

for (const [routeName] of routes) {
  for (const [viewportName] of viewports) {
    const light = results.find((result) => result.routeName === routeName && result.viewportName === viewportName && result.theme === "light");
    const dark = results.find((result) => result.routeName === routeName && result.viewportName === viewportName && result.theme === "dark");
    if (!light || !dark) continue;
    if (light.state.background === dark.state.background) {
      light.problems.push("light and dark canvas colors are identical");
      dark.problems.push("light and dark canvas colors are identical");
    }
    if (light.state.color === dark.state.color) {
      light.problems.push("light and dark text colors are identical");
      dark.problems.push("light and dark text colors are identical");
    }
  }
}

const failures = results.filter((result) => result.problems.length > 0);
await writeFile(`${output}/report.json`, JSON.stringify(results, null, 2));
if (failures.length) {
  console.error("Theme audit failures:", failures);
  process.exitCode = 1;
} else {
  console.log("Portfolio light/dark theme audit passed.");
}
