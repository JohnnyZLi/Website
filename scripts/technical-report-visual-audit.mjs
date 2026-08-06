#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.REPORT_AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const output = "technical-report-visual-audit";
const route = "/projects/network-diagnostics-suite/report/";
const baselinePath = "scripts/technical-report-visual-baseline.json";
const viewports = [
  ["desktop", { width: 1440, height: 1000 }],
  ["narrow-desktop", { width: 720, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
  ["minimum", { width: 320, height: 700 }],
];

const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
const normalizeText = (value) => value.replace(/\s+/g, " ").trim();
const fileHash = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const [name, viewport] of viewports) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    const screenshotPath = `${output}/report-${name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const metrics = await page.evaluate(() => {
      const borderWidths = (element) => {
        const style = getComputedStyle(element);
        return {
          top: Number.parseFloat(style.borderTopWidth),
          right: Number.parseFloat(style.borderRightWidth),
          bottom: Number.parseFloat(style.borderBottomWidth),
          left: Number.parseFloat(style.borderLeftWidth),
        };
      };
      const rect = (element) => {
        const bounds = element.getBoundingClientRect();
        return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
      };
      const header = document.querySelector(".jl-global-header");
      const marker = document.querySelector(".report-intro .report-number");
      const metadata = document.querySelector(".report-meta");
      const timeline = document.querySelector(".report-timeline > article");
      const principle = document.querySelector(".report-principle");
      const firstSection = document.querySelector(".report-section");
      const contents = document.querySelector(".report-toc");
      const actions = [...document.querySelectorAll(".report-actions > *")];
      const actionGroup = document.querySelector(".report-actions");
      const comparisonFigure = document.querySelector(".report-bars");
      const quote = document.querySelector(".report-quote");
      const reportGrids = [...document.querySelectorAll(".report-grid")].map((grid) => ({
        borders: borderWidths(grid),
        items: [...grid.querySelectorAll(":scope > .report-grid-item")].map(borderWidths),
      }));
      const tables = [...document.querySelectorAll(".report-table-wrap")].map((region) => {
        const table = region.querySelector("table");
        const firstRow = table?.querySelector("tbody tr");
        const firstCell = table?.querySelector("tbody td");
        return {
          clientWidth: region.clientWidth,
          scrollWidth: region.scrollWidth,
          tableDisplay: table ? getComputedStyle(table).display : null,
          rowDisplay: firstRow ? getComputedStyle(firstRow).display : null,
          firstCellLabel: firstCell ? getComputedStyle(firstCell, "::before").content : null,
          captionCount: table?.querySelectorAll("caption").length ?? 0,
          labelledCells: table?.querySelectorAll("tbody td[data-label]").length ?? 0,
        };
      });
      const codePanels = [...document.querySelectorAll(".report-code")].map((panel) => {
        const style = getComputedStyle(panel);
        return {
          clientWidth: panel.clientWidth,
          scrollWidth: panel.scrollWidth,
          overflowX: style.overflowX,
          whiteSpace: style.whiteSpace,
        };
      });
      const root = getComputedStyle(document.documentElement);
      const markerStyle = marker ? getComputedStyle(marker) : null;
      const heading = document.querySelector(".report-section h2");
      return {
        title: document.title,
        h1Count: document.querySelectorAll("h1").length,
        innerWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        headerHeight: header?.getBoundingClientRect().height ?? null,
        canvas: root.getPropertyValue("--jl-color-canvas").trim(),
        markerFontSize: markerStyle ? Number.parseFloat(markerStyle.fontSize) : null,
        markerFontFamily: markerStyle?.fontFamily ?? null,
        sectionHeadingFontSize: heading ? Number.parseFloat(getComputedStyle(heading).fontSize) : null,
        metadataColumns: metadata ? getComputedStyle(metadata).gridTemplateColumns.split(" ").length : null,
        timelineDisplay: timeline ? getComputedStyle(timeline).display : null,
        principleBottomBorder: principle ? Number.parseFloat(getComputedStyle(principle).borderBottomWidth) : null,
        firstSectionTopBorder: firstSection ? Number.parseFloat(getComputedStyle(firstSection).borderTopWidth) : null,
        firstTransitionGap: principle && firstSection ? firstSection.getBoundingClientRect().top - principle.getBoundingClientRect().bottom : null,
        contentsScrollMarginTop: contents ? Number.parseFloat(getComputedStyle(contents).scrollMarginTop) : null,
        actionGroup: actionGroup ? rect(actionGroup) : null,
        actions: actions.map(rect),
        reportGrids,
        tables,
        codePanels,
        comparisonFigureBorders: comparisonFigure ? borderWidths(comparisonFigure) : null,
        quoteTag: quote?.tagName ?? null,
        inlineStyles: document.querySelectorAll("[style]").length,
        embeddedStyles: document.querySelectorAll("style").length,
      };
    });

    const problems = [];
    if (!response?.ok()) problems.push(`HTTP ${response?.status() ?? "no response"}`);
    if (metrics.documentWidth > metrics.innerWidth + 1) problems.push("horizontal overflow");
    if (metrics.h1Count !== 1) problems.push(`expected one h1, found ${metrics.h1Count}`);
    const compactHeader = viewport.width <= 560;
    const expectedHeader = compactHeader ? 69 : 83;
    if (metrics.headerHeight === null || Math.abs(metrics.headerHeight - expectedHeader) > 1) problems.push(`header height ${metrics.headerHeight}, expected ${expectedHeader}`);
    if (metrics.markerFontSize === null || metrics.markerFontSize > 13) problems.push(`abstract marker is oversized at ${metrics.markerFontSize}px`);
    if (!metrics.markerFontFamily?.toLowerCase().includes("mono")) problems.push("abstract marker is not monospace");
    if (viewport.width <= 320 && (metrics.sectionHeadingFontSize === null || metrics.sectionHeadingFontSize > 38.5)) problems.push(`minimum-width section heading is oversized at ${metrics.sectionHeadingFontSize}px`);
    const expectedColumns = viewport.width <= 900 ? 2 : 4;
    if (metrics.metadataColumns !== expectedColumns) problems.push(`metadata has ${metrics.metadataColumns} columns, expected ${expectedColumns}`);
    const expectedTimeline = viewport.width <= 420 ? "block" : "grid";
    if (metrics.timelineDisplay !== expectedTimeline) problems.push(`timeline display is ${metrics.timelineDisplay}, expected ${expectedTimeline}`);
    if (metrics.principleBottomBorder !== 0) problems.push(`report principle adds a duplicate bottom rule at ${metrics.principleBottomBorder}px`);
    if (metrics.firstSectionTopBorder === null || metrics.firstSectionTopBorder < 1) problems.push("first report section is missing its boundary rule");
    if (metrics.firstTransitionGap === null || metrics.firstTransitionGap > 130) problems.push(`abstract-to-section transition is too loose at ${metrics.firstTransitionGap}px`);
    if (metrics.contentsScrollMarginTop === null || metrics.contentsScrollMarginTop < expectedHeader + 16) problems.push(`contents anchor offset is too small at ${metrics.contentsScrollMarginTop}px`);
    if (metrics.quoteTag !== "P") problems.push(`author pull statement uses ${metrics.quoteTag ?? "no element"} instead of a paragraph`);

    const actionLabels = await page.locator(".report-actions > *").allTextContents();
    const normalizedActions = actionLabels.map((label) => label.trim().replace(/\s+[↗↓]$/, ""));
    if (normalizedActions.join("|") !== "Launch tool|Print / save PDF|Source") problems.push(`action order is ${normalizedActions.join(" | ")}`);
    if (metrics.actions.length !== 3 || !metrics.actionGroup) {
      problems.push("report action geometry is incomplete");
    } else if (viewport.width <= 600) {
      const [first, second, third] = metrics.actions;
      const sameColumn = Math.max(first.x, second.x, third.x) - Math.min(first.x, second.x, third.x) <= 1;
      const fullWidth = metrics.actions.every((action) => Math.abs(action.width - metrics.actionGroup.width) <= 1);
      const ordered = first.y < second.y && second.y < third.y;
      if (!sameColumn || !fullWidth || !ordered) problems.push("compact report actions are not three full-width stacked rows");
    } else {
      const [first, second, third] = metrics.actions;
      if (!(first.x < second.x && Math.abs(second.x - third.x) <= 1 && second.y < third.y)) problems.push("desktop report action hierarchy is misaligned");
    }

    for (const [gridIndex, grid] of metrics.reportGrids.entries()) {
      const border = grid.borders;
      if (grid.items.length !== 4) problems.push(`report grid ${gridIndex + 1} has ${grid.items.length} items, expected 4`);
      if (border.top !== 0 || border.right !== 0 || border.bottom !== 0 || border.left !== 0) problems.push(`report grid ${gridIndex + 1} has an outer container border`);
      const [first, second, third, fourth] = grid.items;
      if (!first || !second || !third || !fourth) continue;
      if (viewport.width > 600) {
        if (first.top !== 0 || first.bottom !== 0 || first.left !== 0 || first.right < 1) problems.push(`report grid ${gridIndex + 1} first cell does not expose only the internal column divider`);
        if (second.top !== 0 || second.right !== 0 || second.bottom !== 0 || second.left !== 0) problems.push(`report grid ${gridIndex + 1} second cell has an outer border`);
        if (third.top < 1 || third.right < 1 || third.bottom !== 0 || third.left !== 0) problems.push(`report grid ${gridIndex + 1} third cell does not expose only internal dividers`);
        if (fourth.top < 1 || fourth.right !== 0 || fourth.bottom !== 0 || fourth.left !== 0) problems.push(`report grid ${gridIndex + 1} fourth cell has an outer border`);
      } else {
        if (first.top !== 0 || first.right !== 0 || first.bottom !== 0 || first.left !== 0) problems.push(`report grid ${gridIndex + 1} first stacked cell has an outer border`);
        for (const [itemIndex, item] of grid.items.slice(1).entries()) {
          if (item.top < 1 || item.right !== 0 || item.bottom !== 0 || item.left !== 0) problems.push(`report grid ${gridIndex + 1} stacked cell ${itemIndex + 2} does not use only an internal top divider`);
        }
      }
    }

    for (const [tableIndex, table] of metrics.tables.entries()) {
      if (table.captionCount !== 1) problems.push(`report table ${tableIndex + 1} is missing its caption`);
      if (viewport.width <= 760) {
        if (table.scrollWidth > table.clientWidth + 1) problems.push(`report table ${tableIndex + 1} still requires hidden horizontal scrolling`);
        if (!["block", "grid"].includes(table.rowDisplay)) problems.push(`report table ${tableIndex + 1} did not stack its rows`);
        if (!table.firstCellLabel || table.firstCellLabel === "none" || table.firstCellLabel === '""') problems.push(`report table ${tableIndex + 1} does not expose compact data labels`);
        if (table.labelledCells < 9) problems.push(`report table ${tableIndex + 1} has too few labelled cells`);
      } else if (table.tableDisplay !== "table") {
        problems.push(`report table ${tableIndex + 1} lost desktop table semantics`);
      }
    }

    if (viewport.width <= 600) {
      for (const [codeIndex, codePanel] of metrics.codePanels.entries()) {
        if (codePanel.scrollWidth > codePanel.clientWidth + 1) problems.push(`compact code panel ${codeIndex + 1} still clips or scrolls horizontally`);
        if (codePanel.whiteSpace !== "pre-wrap") problems.push(`compact code panel ${codeIndex + 1} does not preserve wrapped code formatting`);
      }
    }

    const figureBorders = metrics.comparisonFigureBorders;
    if (!figureBorders || figureBorders.left !== 0 || figureBorders.right !== 0 || figureBorders.top < 1 || figureBorders.bottom < 1) problems.push("throughput figure does not use the open editorial rule treatment");
    if (metrics.inlineStyles !== 0) problems.push("inline style attributes remain");
    if (metrics.embeddedStyles !== 0) problems.push("embedded stylesheet remains");

    const launch = page.locator(".report-action-primary");
    await launch.focus();
    await page.keyboard.press("Tab");
    const secondFocus = await page.evaluate(() => document.activeElement?.textContent?.trim().replace(/\s+[↗↓]$/, ""));
    await page.keyboard.press("Tab");
    const thirdFocus = await page.evaluate(() => document.activeElement?.textContent?.trim().replace(/\s+[↗↓]$/, ""));
    if (secondFocus !== "Print / save PDF" || thirdFocus !== "Source") problems.push(`keyboard action order is Launch tool → ${secondFocus} → ${thirdFocus}`);

    await page.evaluate(() => {
      const contents = document.querySelector("#contents");
      contents?.scrollIntoView();
      history.replaceState(null, "", "#contents");
    });
    await page.waitForTimeout(100);
    const anchorPlacement = await page.evaluate(() => ({
      headerBottom: document.querySelector(".jl-global-header")?.getBoundingClientRect().bottom ?? 0,
      contentsTop: document.querySelector(".report-toc")?.getBoundingClientRect().top ?? -1,
    }));
    if (anchorPlacement.contentsTop < anchorPlacement.headerBottom + 8) problems.push(`contents anchor lands beneath the header at ${anchorPlacement.contentsTop}px`);

    if (compactHeader) {
      await page.locator("[data-header-menu-button]").click();
      const menuOpened = await page.locator("[data-header-menu]").isVisible();
      await page.keyboard.press("Escape");
      const menuFocusRestored = await page.evaluate(() => document.activeElement?.hasAttribute("data-header-menu-button") ?? false);
      if (!menuOpened || !menuFocusRestored) problems.push("compact report navigation menu does not open and restore focus correctly");

      await page.locator("[data-site-switcher-button]").click();
      const sitesOpened = await page.locator("[data-site-switcher-menu]").isVisible();
      await page.keyboard.press("Escape");
      const sitesFocusRestored = await page.evaluate(() => document.activeElement?.hasAttribute("data-site-switcher-button") ?? false);
      if (!sitesOpened || !sitesFocusRestored) problems.push("report Sites menu does not open and restore focus correctly");
    }

    await page.locator('[data-report-section-link][href="#delivery-path"]').click();
    await page.waitForTimeout(250);
    const readingNavigation = await page.evaluate(() => {
      const activeLink = document.querySelector('[data-report-section-link][aria-current="location"]');
      const activeItem = activeLink?.closest('li');
      const indicator = document.querySelector('[data-report-toc-indicator]');
      const progress = document.querySelector('[data-report-progress]');
      const progressFill = document.querySelector('[data-report-progress-fill]');
      const currentSection = document.querySelector('#delivery-path');
      const rect = (element) => {
        const bounds = element?.getBoundingClientRect();
        return bounds ? { top: bounds.top, bottom: bounds.bottom, left: bounds.left, height: bounds.height } : null;
      };
      return {
        hash: location.hash,
        activeHref: activeLink?.getAttribute('href') ?? null,
        activeCurrent: activeLink?.getAttribute('aria-current') ?? null,
        activeItem: rect(activeItem),
        indicator: rect(indicator),
        indicatorOpacity: indicator ? getComputedStyle(indicator).opacity : null,
        indicatorTransition: indicator ? getComputedStyle(indicator).transitionDuration : null,
        progressDisplay: progress ? getComputedStyle(progress).display : null,
        progressPosition: progress ? getComputedStyle(progress).position : null,
        progressCounter: document.querySelector('[data-report-progress-counter]')?.textContent.trim() ?? null,
        progressTitle: document.querySelector('[data-report-progress-title]')?.textContent.trim() ?? null,
        previousHref: document.querySelector('[data-report-progress-previous]')?.getAttribute('href') ?? null,
        nextHref: document.querySelector('[data-report-progress-next]')?.getAttribute('href') ?? null,
        progressWidth: progressFill?.style.getPropertyValue('--report-progress') ?? null,
        progressTransition: progressFill ? getComputedStyle(progressFill).transitionDuration : null,
        progressRect: rect(progress),
        sectionRect: rect(currentSection),
      };
    });
    if (readingNavigation.hash !== '#delivery-path' || readingNavigation.activeHref !== '#delivery-path' || readingNavigation.activeCurrent !== 'location') problems.push('scroll-aware contents did not activate section 04 or update the hash');
    if (viewport.width > 820) {
      if (readingNavigation.progressDisplay !== 'none') problems.push('compact report progress is visible on desktop');
      if (readingNavigation.indicatorOpacity !== '1' || !readingNavigation.indicator || !readingNavigation.activeItem) problems.push('desktop report contents indicator is not visible');
      else if (Math.abs(readingNavigation.indicator.top - readingNavigation.activeItem.top) > 1 || Math.abs(readingNavigation.indicator.height - readingNavigation.activeItem.height) > 1) problems.push('desktop report contents indicator is not aligned with the active row');
    } else {
      if (readingNavigation.progressDisplay === 'none' || readingNavigation.progressPosition !== 'sticky') problems.push('compact report progress is not sticky and visible while reading');
      if (readingNavigation.progressCounter !== '04 / 13' || readingNavigation.progressTitle !== 'Finding the download bottleneck') problems.push('compact report progress does not identify the active section');
      if (readingNavigation.previousHref !== '#mlab' || readingNavigation.nextHref !== '#measurement-plan' || readingNavigation.progressWidth !== '30.76923076923077%') problems.push('compact report progress controls do not match section 04');
      if (readingNavigation.progressRect && readingNavigation.sectionRect && readingNavigation.sectionRect.top < readingNavigation.progressRect.bottom + 6) problems.push('compact report section lands beneath the sticky progress control');
      await page.locator('[data-report-progress-toggle]').click();
      const progressMenuOpened = await page.locator('[data-report-progress-menu]').isVisible();
      const progressMenuCurrent = await page.locator('[data-report-progress-link][aria-current="location"]').getAttribute('href');
      await page.keyboard.press('Escape');
      const progressMenuFocusRestored = await page.evaluate(() => document.activeElement?.hasAttribute('data-report-progress-toggle') ?? false);
      if (!progressMenuOpened || progressMenuCurrent !== '#delivery-path' || !progressMenuFocusRestored) problems.push('compact report progress menu does not expose the active section and restore focus');
    }
    if (readingNavigation.indicatorTransition?.split(',').some((duration) => duration.trim() !== '0s') || readingNavigation.progressTransition?.split(',').some((duration) => duration.trim() !== '0s')) problems.push('reduced-motion report navigation still animates');

    const screenshotHash = await fileHash(screenshotPath);
    if (baseline.hashes[name] && baseline.hashes[name] !== screenshotHash) problems.push(`visual baseline changed: ${screenshotHash}`);
    results.push({ name, viewport, ...metrics, screenshotHash, problems });
    await context.close();
  }

  const motionContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
  const motionPage = await motionContext.newPage();
  await motionPage.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await motionPage.locator('[data-report-section-link][href="#delivery-path"]').click();
  await motionPage.waitForTimeout(80);
  const motionMetrics = await motionPage.evaluate(() => ({
    indicatorDuration: getComputedStyle(document.querySelector('[data-report-toc-indicator]')).transitionDuration,
    linkDuration: getComputedStyle(document.querySelector('[data-report-section-link][aria-current="location"]')).transitionDuration,
  }));
  const motionProblems = [];
  if (!motionMetrics.indicatorDuration.split(',').some((duration) => Number.parseFloat(duration) > 0)) motionProblems.push('desktop contents indicator has no motion when motion is allowed');
  if (!motionMetrics.linkDuration.split(',').some((duration) => Number.parseFloat(duration) > 0)) motionProblems.push('active contents link has no transition when motion is allowed');
  results.push({ name: 'motion', ...motionMetrics, problems: motionProblems });
  await motionContext.close();

  const printContext = await browser.newContext({ viewport: { width: 816, height: 1056 }, reducedMotion: "reduce" });
  const printPage = await printContext.newPage();
  await printPage.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await printPage.emulateMedia({ media: "print" });
  const printMetrics = await printPage.evaluate(() => {
    const headingGroup = document.querySelector(".report-heading-group");
    const paragraph = document.querySelector(".report-prose p");
    return {
      headerDisplay: getComputedStyle(document.querySelector(".jl-global-header")).display,
      markerFontSize: Number.parseFloat(getComputedStyle(document.querySelector(".report-intro .report-number")).fontSize),
      sectionBreakBefore: getComputedStyle(document.querySelector(".report-section")).breakBefore,
      headingBreakInside: headingGroup ? getComputedStyle(headingGroup).breakInside : null,
      paragraphWidows: paragraph ? getComputedStyle(paragraph).widows : null,
      paragraphOrphans: paragraph ? getComputedStyle(paragraph).orphans : null,
      printedReferenceUrl: getComputedStyle(document.querySelector(".references a"), "::after").content,
    };
  });
  const pdfPath = `${output}/technical-report.pdf`;
  const pdf = await printPage.pdf({ path: pdfPath, format: "Letter", printBackground: true, tagged: true, outline: true });
  const printProblems = [];
  if (printMetrics.headerDisplay !== "none") printProblems.push("shared header is visible in print");
  if (printMetrics.markerFontSize > 10) printProblems.push(`print abstract marker is oversized at ${printMetrics.markerFontSize}px`);
  if (printMetrics.sectionBreakBefore === "page") printProblems.push("every section is still forced onto a new page");
  if (!printMetrics.headingBreakInside?.includes("avoid")) printProblems.push(`print heading groups are not kept together: ${printMetrics.headingBreakInside}`);
  if (Number.parseInt(printMetrics.paragraphWidows, 10) < 3 || Number.parseInt(printMetrics.paragraphOrphans, 10) < 3) printProblems.push("print paragraphs do not enforce widows and orphans");
  if (!printMetrics.printedReferenceUrl || printMetrics.printedReferenceUrl === "none") printProblems.push("printed references do not expose their destination URLs");
  if (pdf.byteLength < 20_000) printProblems.push(`generated PDF is unexpectedly small: ${pdf.byteLength} bytes`);

  try {
    const pdfText = execFileSync("pdftotext", ["-layout", pdfPath, "-"], { encoding: "utf8" });
    const pages = pdfText.split("\f").map(normalizeText).filter(Boolean);
    const headingOpenings = [
      ["From speed test to diagnostic system", "Ordinary speed tests compress"],
      ["The browser boundary", "Idle latency uses uncached requests"],
      ["Benchmarking against the M-Lab test used by Google Search", "Early comparisons repeatedly showed"],
      ["Finding the download bottleneck", "The initial engine repeatedly requested"],
      ["A shared measurement plan", "The browser, desktop application"],
      ["Throughput and responsiveness", "Throughput uses successfully transferred"],
      ["Endpoint and transport context", "Before a run, the browser and native core"],
      ["The native core", "NetworkDiagnostics.Core on .NET 10"],
      ["Schema 2.0 and findings parity", "Schema 2.0 is a combined envelope"],
      ["LAN isolation and interface binding", "The optional LAN server listens"],
      ["Privacy and accuracy", "The project has no accounts"],
      ["Validation and release engineering", "Continuous integration validates"],
      ["Lessons and next work", "The project’s largest improvements"],
      ["Primary sources and project records", "Measurement Lab"],
    ];
    for (const [heading, opening] of headingOpenings) {
      const headingPage = pages.findIndex((page) => page.includes(heading));
      const openingPage = pages.findIndex((page) => page.includes(opening));
      if (headingPage < 0 || openingPage < 0 || headingPage !== openingPage) printProblems.push(`print separates “${heading}” from its opening content`);
    }
    const compactPdfText = pdfText.replace(/\s+/g, "");
    if (!compactPdfText.includes("b1c549c") || !compactPdfText.includes("johnnyli.dev/projects/network-diagnostics-suite/report/")) printProblems.push("printed provenance is incomplete");
    if (!pdfText.includes("measurementlab.net") || !pdfText.includes("developers.cloudflare.com") || !pdfText.includes("w3.org/TR/resource-timing")) printProblems.push("printed references omit source destinations");
  } catch (error) {
    printProblems.push(`PDF text inspection failed: ${error.message}`);
  }

  try {
    const pdfInfo = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
    if (!/^Tagged:\s+yes$/mi.test(pdfInfo)) printProblems.push("generated audit PDF is not tagged");
  } catch (error) {
    printProblems.push(`PDF metadata inspection failed: ${error.message}`);
  }

  results.push({ name: "print", ...printMetrics, pdfBytes: pdf.byteLength, problems: printProblems });
  await printContext.close();

  const forcedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, forcedColors: "active", reducedMotion: "reduce" });
  const forcedPage = await forcedContext.newPage();
  await forcedPage.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  const forcedPath = `${output}/report-forced-colors.png`;
  await forcedPage.screenshot({ path: forcedPath, fullPage: true });
  const forcedProblems = [];
  if (await forcedPage.locator(".report-action-primary").count() !== 1) forcedProblems.push("primary action missing in forced colors");
  if (await forcedPage.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) forcedProblems.push("forced-colors report overflows horizontally");
  const forcedHash = await fileHash(forcedPath);
  if (baseline.hashes["forced-colors"] && baseline.hashes["forced-colors"] !== forcedHash) forcedProblems.push(`forced-colors visual baseline changed: ${forcedHash}`);
  results.push({ name: "forced-colors", screenshotHash: forcedHash, problems: forcedProblems });
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
