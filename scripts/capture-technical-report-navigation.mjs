#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.REPORT_AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const route = "/projects/network-diagnostics-suite/report/";
const output = "technical-report-visual-audit";
const captures = [
  ["desktop", { width: 1440, height: 1000 }],
  ["narrow-desktop", { width: 720, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
  ["minimum", { width: 320, height: 700 }],
];

const browser = await chromium.launch({ headless: true });
try {
  for (const [name, viewport] of captures) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await page.locator('[data-report-section-link][href="#delivery-path"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/report-reading-${name}.png` });

    if (viewport.width <= 820) {
      await page.locator('[data-report-progress-toggle]').click();
      await page.screenshot({ path: `${output}/report-reading-${name}-menu.png` });
    }
    await context.close();
  }
} finally {
  await browser.close();
}
