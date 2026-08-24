#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.THEME_AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const output = "theme-visual-audit";
const route = "/projects/hopscotch.html";
const viewports = [
  ["desktop", { width: 1440, height: 1000 }],
  ["narrow-desktop", { width: 720, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
  ["minimum", { width: 320, height: 700 }],
];
const themes = ["light", "dark"];
const near = (actual, expected, tolerance = 1) => Math.abs(actual - expected) <= tolerance;

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const [viewportName, viewport] of viewports) {
    for (const theme of themes) {
      const context = await browser.newContext({ viewport, colorScheme: theme, reducedMotion: "reduce" });
      await context.addInitScript((value) => localStorage.setItem("jl-theme", value), theme);
      const page = await context.newPage();
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      const problems = [];

      if (!response?.ok()) problems.push(`HTTP ${response?.status() ?? "no response"}`);

      const state = await page.evaluate(() => {
        const root = document.documentElement;
        const hero = document.querySelector(".case-hero-grid");
        const title = document.querySelector(".case-hero h1");
        const summary = document.querySelector(".case-summary");
        const facts = [...document.querySelectorAll(".case-facts > div")];
        const factList = document.querySelector(".case-facts");
        const process = document.querySelector(".process-list");
        const processItems = [...document.querySelectorAll(".process-list > li")];
        const decision = document.querySelector("#workflows-heading")?.closest(".case-section")?.querySelector(".decision-grid");
        const decisionItems = decision ? [...decision.querySelectorAll(":scope > article")] : [];
        const validation = document.querySelector("#validation-heading")?.closest(".case-section");
        const metrics = validation?.querySelector(".metric-grid") ?? null;
        const metricItems = metrics ? [...metrics.children] : [];
        const validationCopy = validation?.querySelector(".validation-copy") ?? null;
        const codePanel = document.querySelector(".output-grid pre");
        const nextTitle = document.querySelector(".case-next h2");
        const nextEmphasis = nextTitle?.querySelector("em") ?? null;
        const primaryAction = document.querySelector(".case-action-primary");
        const secondaryAction = document.querySelector(".case-action:not(.case-action-primary)");
        const rect = (element) => element?.getBoundingClientRect() ?? null;
        const style = (element) => element ? getComputedStyle(element) : null;
        return {
          theme: root.dataset.theme,
          preference: root.dataset.themePreference,
          innerWidth: window.innerWidth,
          documentWidth: root.scrollWidth,
          hero: rect(hero),
          title: rect(title),
          summary: rect(summary),
          factList: rect(factList),
          facts: facts.map((item) => ({ rect: rect(item), textAlign: style(item)?.textAlign })),
          process: process ? {
            rect: rect(process),
            borderTopWidth: style(process)?.borderTopWidth,
            borderRightWidth: style(process)?.borderRightWidth,
            borderBottomWidth: style(process)?.borderBottomWidth,
            borderLeftWidth: style(process)?.borderLeftWidth,
            items: processItems.map((item) => rect(item)),
          } : null,
          decision: decision ? {
            rect: rect(decision),
            items: decisionItems.map((item) => rect(item)),
          } : null,
          validation: validation ? {
            rect: rect(validation),
            metrics: rect(metrics),
            metricItems: metricItems.map((item) => rect(item)),
            copy: rect(validationCopy),
            metricLabels: [...validation.querySelectorAll(".metric-grid span")].map((item) => ({
              color: style(item)?.color,
              fontWeight: style(item)?.fontWeight,
            })),
            metricValues: [...validation.querySelectorAll(".metric-grid strong")].map((item) => style(item)?.color),
          } : null,
          codePanel: codePanel ? {
            rect: rect(codePanel),
            clientWidth: codePanel.clientWidth,
            scrollWidth: codePanel.scrollWidth,
            backgroundImage: style(codePanel)?.backgroundImage,
            boxShadow: style(codePanel)?.boxShadow,
          } : null,
          next: nextTitle && nextEmphasis ? {
            titleColor: style(nextTitle)?.color,
            emphasisColor: style(nextEmphasis)?.color,
          } : null,
          primaryAction: primaryAction ? {
            rect: rect(primaryAction),
            borderRadius: style(primaryAction)?.borderRadius,
            fontSize: style(primaryAction)?.fontSize,
            fontWeight: style(primaryAction)?.fontWeight,
            paddingLeft: style(primaryAction)?.paddingLeft,
            paddingRight: style(primaryAction)?.paddingRight,
          } : null,
          secondaryAction: secondaryAction ? { rect: rect(secondaryAction) } : null,
        };
      });

      if (state.theme !== theme || state.preference !== theme) problems.push(`theme resolved as ${state.preference}/${state.theme}`);
      if (state.documentWidth > state.innerWidth + 1) problems.push("document-level horizontal overflow");
      if (!state.process || state.process.items.length !== 4) problems.push("canonical process row is missing four stages");
      if (!state.decision || state.decision.items.length !== 4) problems.push("flagship workflow grid is missing four decisions");
      if (!state.validation || !state.validation.metrics || state.validation.metricItems.length !== 4 || !state.validation.copy) {
        problems.push("validation section does not use the metric-plus-evidence composition");
      }
      if (!state.codePanel) problems.push("bounded causal evidence panel is missing");
      if (!state.next || state.next.titleColor === state.next.emphasisColor) problems.push("next-project inverse hierarchy is flattened");

      if (state.process && [state.process.borderTopWidth, state.process.borderRightWidth, state.process.borderBottomWidth, state.process.borderLeftWidth].some((width) => width !== "0px")) {
        problems.push("process stages regained an outer perimeter");
      }

      if (viewportName === "desktop") {
        if (!state.title || !state.summary || state.summary.x <= state.title.x || state.summary.x < state.title.right - 1) {
          problems.push("desktop hero title and summary are cramped or overlapping");
        }
        if (state.facts.length !== 4) {
          problems.push("desktop facts row does not contain four facts");
        } else {
          const widths = state.facts.map((fact) => fact.rect.width);
          if (Math.max(...widths) - Math.min(...widths) > 2) problems.push("desktop facts are not four equal columns");
          if (state.facts.some((fact) => fact.textAlign !== "center")) problems.push("desktop facts are not centered");
        }
        if (state.process) {
          const tops = state.process.items.map((item) => item.top);
          if (Math.max(...tops) - Math.min(...tops) > 2) problems.push("desktop process stages are not one open four-column row");
          if (Math.min(...state.process.items.map((item) => item.width)) < 180) problems.push("desktop process stages are cramped");
        }
        if (state.decision) {
          const [a, b, c, d] = state.decision.items;
          if (!near(a.top, b.top, 2) || !near(c.top, d.top, 2) || c.top <= a.bottom - 2) problems.push("desktop workflow decisions are not a two-by-two editorial grid");
          if (Math.min(a.width, b.width, c.width, d.width) < 300) problems.push("desktop workflow decisions are cramped");
        }
        if (state.validation?.metrics && state.validation?.copy) {
          if (state.validation.metrics.right > state.validation.copy.left + 2) problems.push("desktop validation metrics overlap explanatory evidence");
          if (Math.min(...state.validation.metricItems.map((item) => item.width)) < 130) problems.push("desktop validation metric cells are cramped");
        }
        if (state.primaryAction) {
          if (!near(state.primaryAction.rect.height, 52, 1)) problems.push(`primary action height is ${state.primaryAction.rect.height}, expected 52`);
          if (state.primaryAction.borderRadius !== "6px") problems.push(`primary action radius is ${state.primaryAction.borderRadius}`);
          if (state.primaryAction.fontSize !== "15.2px" || state.primaryAction.fontWeight !== "600") problems.push("primary action typography drifted from the case-study contract");
          if (state.primaryAction.paddingLeft !== "20px" || state.primaryAction.paddingRight !== "20px") problems.push("primary action inline padding drifted from 20px");
        }
      } else if (state.title && state.summary && state.summary.top < state.title.bottom - 1) {
        problems.push("stacked hero summary overlaps the title");
      }

      if (state.validation) {
        if (state.validation.metricLabels.some((label) => !["700", "bold"].includes(label.fontWeight))) problems.push("metric labels lost bold emphasis");
        if (state.validation.metricLabels.some((label, index) => label.color === state.validation.metricValues[index])) problems.push("metric labels no longer use a distinct terracotta hierarchy");
      }

      const processItem = page.locator(".process-list > li").first();
      const decisionItem = page.locator("#workflows-heading").locator("xpath=ancestor::section[1]").locator(".decision-grid > article").first();
      const metricItem = page.locator("#validation-heading").locator("xpath=ancestor::section[1]").locator(".metric-grid > div").first();
      for (const [label, locator] of [["process", processItem], ["decision", decisionItem], ["metric", metricItem]]) {
        const before = await locator.evaluate((element) => {
          const computed = getComputedStyle(element);
          return { background: computed.backgroundColor, transform: computed.transform, cursor: computed.cursor };
        });
        await locator.hover();
        const after = await locator.evaluate((element) => {
          const computed = getComputedStyle(element);
          return { background: computed.backgroundColor, transform: computed.transform, cursor: computed.cursor };
        });
        if (before.background !== after.background || before.transform !== after.transform || after.cursor === "pointer") {
          problems.push(`${label} evidence group has an interactive hover affordance`);
        }
      }

      await page.screenshot({ path: `${output}/hopscotch-contract-${viewportName}-${theme}.png`, fullPage: true });
      results.push({ viewportName, theme, state, problems });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const failures = results.filter((result) => result.problems.length > 0);
await writeFile(`${output}/hopscotch-contract-report.json`, JSON.stringify(results, null, 2));
if (failures.length) {
  console.error("HOPSCOTCH case-study contract failures:", failures.map(({ viewportName, theme, problems }) => ({ viewportName, theme, problems })));
  process.exitCode = 1;
} else {
  console.log("HOPSCOTCH case-study contract audit passed.");
}
