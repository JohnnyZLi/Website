#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.REPORT_AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const output = "technical-report-visual-audit";
const route = "/projects/network-diagnostics-suite/report/";
const viewports = [
  ["desktop", { width: 1440, height: 1000 }],
  ["narrow-desktop", { width: 720, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
  ["minimum", { width: 320, height: 700 }],
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const [name, viewport] of viewports) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${output}/report-${name}.png`, fullPage: true });

    const metrics = await page.evaluate(() => {
      const header = document.querySelector(".jl-global-header");
      const marker = document.querySelector(".report-intro .report-number");
      const metadata = document.querySelector(".report-meta");
      const timeline = document.querySelector(".report-timeline article");
      const root = getComputedStyle(document.documentElement);
      const markerStyle = marker ? getComputedStyle(marker) : null;
      return {
        title: document.title,
        h1Count: document.querySelectorAll("h1").length,
        innerWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        headerHeight: header?.getBoundingClientRect().height ?? null,
        headerBackground: header ? getComputedStyle(header).backgroundColor : null,
        canvas: root.getPropertyValue("--jl-color-canvas").trim(),
        markerFontSize: markerStyle ? Number.parseFloat(markerStyle.fontSize) : null,
        markerFontFamily: markerStyle?.fontFamily ?? null,
        metadataColumns: metadata ? getComputedStyle(metadata).gridTemplateColumns.split(" ").length : null,
        timelineDisplay: timeline ? getComputedStyle(timeline).display : null,
        actionLabels: [...document.querySelectorAll(".report-actions > *")].map((element) => element.textContent.trim().replace(/\s+[↗↓]$/, "")),
        inlineStyles: document.querySelectorAll("[style]").length,
        embeddedStyles: document.querySelectorAll("style").length,
      };
    });

    const problems = [];
    if (!response?.ok()) problems.push(`HTTP ${response?.status() ?? "no response"}`);
    if (metrics.documentWidth > metrics.innerWidth + 1) problems.push("horizontal overflow");
    if (metrics.h1Count !== 1) problems.push(`expected one h1, found ${metrics.h1Count}`);
    const compact = viewport.width <= 560;
    const expectedHeader = compact ? 69 : 83;
    if (metrics.headerHeight === null || Math.abs(metrics.headerHeight - expectedHeader) > 1) problems.push(`header height ${metrics.headerHeight}, expected ${expectedHeader}`);
    if (metrics.markerFontSize === null || metrics.markerFontSize > 13) problems.push(`abstract marker is oversized at ${metrics.markerFontSize}px`);
    if (!metrics.markerFontFamily?.toLowerCase().includes("mono")) problems.push("abstract marker is not monospace");
    if (metrics.actionLabels.join("|") !== "Launch tool|Print / save PDF|Source") problems.push(`action order is ${metrics.actionLabels.join(" | ")}`);
    const expectedColumns = viewport.width <= 900 ? 2 : 4;
    if (metrics.metadataColumns !== expectedColumns) problems.push(`metadata has ${metrics.metadataColumns} columns, expected ${expectedColumns}`);
    const expectedTimeline = viewport.width <= 420 ? "block" : "grid";
    if (metrics.timelineDisplay !== expectedTimeline) problems.push(`timeline display is ${metrics.timelineDisplay}, expected ${expectedTimeline}`);
    if (metrics.inlineStyles !== 0) problems.push("inline style attributes remain");
    if (metrics.embeddedStyles !== 0) problems.push("embedded stylesheet remains");

    const launch = page.locator(".report-action-primary");
    await launch.focus();
    await page.keyboard.press("Tab");
    const second = await page.evaluate(() => document.activeElement?.textContent?.trim().replace(/\s+[↗↓]$/, ""));
    await page.keyboard.press("Tab");
    const third = await page.evaluate(() => document.activeElement?.textContent?.trim().replace(/\s+[↗↓]$/, ""));
    if (second !== "Print / save PDF" || third !== "Source") problems.push(`keyboard action order is Launch tool → ${second} → ${third}`);

    results.push({ name, viewport, ...metrics, problems });
    await context.close();
  }

  const printContext = await browser.newContext({ viewport: { width: 816, height: 1056 }, reducedMotion: "reduce" });
  const printPage = await printContext.newPage();
  await printPage.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await printPage.emulateMedia({ media: "print" });
  const printMetrics = await printPage.evaluate(() => ({
    headerDisplay: getComputedStyle(document.querySelector(".jl-global-header")).display,
    markerFontSize: Number.parseFloat(getComputedStyle(document.querySelector(".report-intro .report-number")).fontSize),
    sectionBreakBefore: getComputedStyle(document.querySelector(".report-section")).breakBefore,
  }));
  const pdf = await printPage.pdf({ path: `${output}/technical-report.pdf`, format: "Letter", printBackground: true });
  const printProblems = [];
  if (printMetrics.headerDisplay !== "none") printProblems.push("shared header is visible in print");
  if (printMetrics.markerFontSize > 10) printProblems.push(`print abstract marker is oversized at ${printMetrics.markerFontSize}px`);
  if (printMetrics.sectionBreakBefore === "page") printProblems.push("every section is still forced onto a new page");
  if (pdf.byteLength < 20_000) printProblems.push(`generated PDF is unexpectedly small: ${pdf.byteLength} bytes`);
  results.push({ name: "print", ...printMetrics, pdfBytes: pdf.byteLength, problems: printProblems });
  await printContext.close();

  const forcedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, forcedColors: "active", reducedMotion: "reduce" });
  const forcedPage = await forcedContext.newPage();
  await forcedPage.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await forcedPage.screenshot({ path: `${output}/report-forced-colors.png`, fullPage: true });
  const forcedProblems = [];
  if (await forcedPage.locator(".report-action-primary").count() !== 1) forcedProblems.push("primary action missing in forced colors");
  results.push({ name: "forced-colors", problems: forcedProblems });
  await forcedContext.close();
} finally {
  await browser.close();
}

await writeFile(`${output}/report.json`, JSON.stringify(results, null, 2));
const failures = results.filter((result) => result.problems.length > 0);
if (failures.length) {
  console.error("Technical report visual failures:", failures);
  process.exitCode = 1;
} else {
  console.log("Technical report visual audit passed.");
}
