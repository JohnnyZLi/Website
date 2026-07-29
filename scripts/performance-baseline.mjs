#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { gzipSync } from "node:zlib";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { chromium } from "playwright";

const root = resolve(".");
const outputDirectory = resolve(root, "performance-baseline");
const baseUrl = "http://127.0.0.1:4174";
const runs = Number.parseInt(process.env.PERFORMANCE_RUNS ?? "3", 10);
const productionExtensions = new Set([".html", ".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".woff", ".woff2"]);
const excludedDirectories = new Set([".git", ".github", "node_modules", "scripts", "performance-baseline", "visual-audit", "design-system-conformance"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function contentType(path) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  })[extname(path).toLowerCase()] ?? "application/octet-stream";
}

async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", baseUrl);
      const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
      const path = resolve(root, `.${requested}`);
      if (path !== root && !path.startsWith(`${root}${sep}`)) throw new Error("Path escape rejected");
      const info = await stat(path);
      const file = info.isDirectory() ? resolve(path, "index.html") : path;
      const body = await readFile(file);
      response.writeHead(200, { "content-type": contentType(file), "cache-control": "no-store" });
      response.end(body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(4174, "127.0.0.1", resolvePromise);
  });
  return server;
}

async function measure(browser, path, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__portfolioPerformance = { lcp: 0, cls: 0, longTasks: 0 };
    new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      if (last) window.__portfolioPerformance.lcp = last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__portfolioPerformance.cls += entry.value;
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      window.__portfolioPerformance.longTasks += list.getEntries().length;
    }).observe({ type: "longtask", buffered: true });
  });
  await page.goto(`${baseUrl}/${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const result = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const paints = Object.fromEntries(performance.getEntriesByType("paint").map((entry) => [entry.name, entry.startTime]));
    const resources = performance.getEntriesByType("resource");
    return {
      domContentLoadedMs: navigation.domContentLoadedEventEnd,
      loadMs: navigation.loadEventEnd,
      firstContentfulPaintMs: paints["first-contentful-paint"] ?? 0,
      largestContentfulPaintMs: window.__portfolioPerformance.lcp,
      cumulativeLayoutShift: window.__portfolioPerformance.cls,
      longTasks: window.__portfolioPerformance.longTasks,
      transferBytes: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
      decodedBodyBytes: resources.reduce((sum, entry) => sum + entry.decodedBodySize, 0),
      resourceCount: resources.length,
      domNodes: document.getElementsByTagName("*").length,
    };
  });
  await context.close();
  return result;
}

if (!Number.isInteger(runs) || runs < 1 || runs > 10) throw new Error("PERFORMANCE_RUNS must be an integer from 1 through 10.");
const allFiles = await walk(root);
const pages = allFiles.filter((path) => extname(path) === ".html").map((path) => relative(root, path)).sort();
const productionFiles = allFiles.filter((path) => productionExtensions.has(extname(path).toLowerCase()));
const assets = [];
for (const path of productionFiles) {
  const body = await readFile(path);
  assets.push({ path: relative(root, path), bytes: body.byteLength, gzipBytes: gzipSync(body, { level: 9 }).byteLength, sha256: createHash("sha256").update(body).digest("hex") });
}
assets.sort((a, b) => b.gzipBytes - a.gzipBytes);
const server = await startServer();
const browser = await chromium.launch({ headless: true });
const viewports = { desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } };
const samples = {};
try {
  for (const path of pages) {
    samples[path] = {};
    for (const [viewportName, viewport] of Object.entries(viewports)) {
      samples[path][viewportName] = [];
      for (let index = 0; index < runs; index += 1) samples[path][viewportName].push(await measure(browser, path, viewport));
    }
  }
} finally {
  await browser.close();
  await new Promise((resolvePromise, reject) => server.close((error) => error ? reject(error) : resolvePromise()));
}
const metrics = {};
for (const [path, viewportResults] of Object.entries(samples)) {
  metrics[path] = {};
  for (const [viewportName, results] of Object.entries(viewportResults)) {
    metrics[path][viewportName] = Object.fromEntries(Object.keys(results[0]).map((key) => [key, round(median(results.map((result) => result[key])))]));
  }
}
const totals = assets.reduce((value, asset) => ({ bytes: value.bytes + asset.bytes, gzipBytes: value.gzipBytes + asset.gzipBytes }), { bytes: 0, gzipBytes: 0 });
const report = {
  schemaVersion: "1.0.0",
  product: "portfolio",
  commit: process.env.GITHUB_SHA ?? null,
  recordedAt: new Date().toISOString(),
  environment: { platform: process.platform, architecture: process.arch, node: process.version, runs },
  methodology: "Median local static-server measurements at desktop and mobile widths with reduced motion.",
  pages,
  assets: { totals, largestByGzip: assets.slice(0, 25) },
  metrics,
};
await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
const rows = Object.entries(metrics).flatMap(([path, viewportResults]) => Object.entries(viewportResults).map(([viewport, values]) => `| ${path} | ${viewport} | ${values.firstContentfulPaintMs} | ${values.largestContentfulPaintMs} | ${values.cumulativeLayoutShift} | ${values.transferBytes} |`));
const markdown = [
  "# Portfolio performance baseline",
  "",
  `Recorded: ${report.recordedAt}`,
  `Commit: ${report.commit ?? "local working tree"}`,
  `Environment: ${process.platform} ${process.arch}, ${process.version}, ${runs} runs`,
  "",
  `Production files: ${totals.bytes} bytes raw; ${totals.gzipBytes} bytes gzip.`,
  "",
  "| Page | Viewport | FCP ms | LCP ms | CLS | Transfer bytes |",
  "| --- | --- | ---: | ---: | ---: | ---: |",
  ...rows,
  "",
].join("\n");
await writeFile(resolve(outputDirectory, "report.md"), markdown);
console.log(markdown);
