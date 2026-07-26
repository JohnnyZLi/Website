import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(".");
const read = (path) => readFile(resolve(root, path), "utf8");
const fail = (message) => { throw new Error(message); };

const index = await read("index.html");
const adapter = await read("design-system-migration.css");
const caseStyles = await read("case-study.css");
const contentStyles = await read("assets/design-system/content.css");
const contentGuard = await read("assets/design-system/content-guard.css");
const identityStyles = await read("assets/design-system/site-identity.css");
const version = JSON.parse(await read("assets/design-system/version.json"));
const source = await read("assets/design-system/SOURCE.md");

if (version.version !== "1.4.0") fail("Portfolio must consume Web Design System v1.4.0.");
if (!source.includes("8a223a383fe1f41000c2fbe34ac5f92c73a1e710")) {
  fail("Portfolio is not pinned to the final reviewed v1.4.0 content source.");
}
if (!adapter.startsWith('@import url("assets/design-system/content-guard.css");')) {
  fail("Portfolio content guard must load after legacy styles through the final adapter.");
}
if (/^\s*@layer\b/m.test(contentGuard)) fail("Content guard must remain unlayered.");

for (const contract of [
  ".jl-page__inner", ".jl-page-hero__grid", ".jl-page-meta",
  ".jl-page-section__header", ".jl-content-grid", ".jl-prose",
  ".jl-editorial-lead", ".jl-panel", ".jl-process-list",
  ".jl-metric-grid", ".jl-callout--success", ".jl-button--primary",
  ".jl-code-block", ".jl-media__frame", ".jl-table-region", ".jl-empty-state",
  "@media (max-width: 560px)", "@media (forced-colors: active)",
]) {
  if (!contentStyles.includes(contract)) fail(`Shared content contract is incomplete: ${contract}.`);
}
for (const contract of [
  ".jl-page-title", ".jl-page-lede", ".jl-prose", ".jl-editorial-lead",
  ".jl-meta-item dt", ".jl-meta-item dd", ".jl-metric__value",
  ".jl-button--primary", ".jl-code-block", ".jl-surface-inverse .jl-prose",
]) {
  if (!contentGuard.includes(contract)) fail(`Shared content guard is incomplete: ${contract}.`);
}
for (const contract of [
  ".jl-global-header__inner", "width: 88px;", "font-size: 13px;",
  "font-weight: 700;", "border-right: 2px solid currentColor;",
]) {
  if (!identityStyles.includes(contract)) fail(`Shared header contract is incomplete: ${contract}.`);
}

for (const hook of [
  'class="jl-page"', 'class="jl-global-header"', "jl-page__inner--portfolio",
  "jl-page-section", "jl-page-section__header", "jl-page-section__body",
  "jl-content-grid", "jl-editorial-lead", "jl-prose", "jl-panel",
]) {
  if (!index.includes(hook)) fail(`Homepage shared content hook is missing: ${hook}.`);
}

const projectPages = (await readdir(resolve(root, "projects")))
  .filter((name) => name.endsWith(".html"))
  .sort();
const expectedPages = [
  "concurrent-c2s-proxy.html",
  "network-config-auditor.html",
  "network-diagnostics-suite.html",
  "ospf-resiliency-lab.html",
  "reliable-udp-transport.html",
];
if (JSON.stringify(projectPages) !== JSON.stringify(expectedPages)) {
  fail(`Project inventory changed without a content audit: ${projectPages.join(", ")}.`);
}

const projectStyles = [
  "../assets/design-system/tokens.css",
  "../assets/design-system/foundations.css",
  "../assets/design-system/site-identity.css",
  "../assets/design-system/content.css",
  "../styles.css",
  "../case-study.css",
  "../design-system-migration.css",
];
const projectHooks = [
  'class="jl-page"', 'class="jl-global-header"', "jl-page-hero",
  "jl-page-title", "jl-page-lede", "jl-actions", "jl-button",
  "jl-page-meta", "jl-meta-item", "jl-page-section",
  "jl-page-section__header", "jl-page-section__body", "jl-content-grid",
  "jl-editorial-lead", "jl-prose", "jl-panel", "jl-process-list",
  "jl-metric-grid", 'src="../motion.js"', 'src="../site-switcher.js"',
];
for (const page of projectPages) {
  const html = await read(`projects/${page}`);
  let previous = -1;
  for (const stylesheet of projectStyles) {
    const position = html.indexOf(`href="${stylesheet}"`);
    if (position < 0) fail(`${page} is missing stylesheet ${stylesheet}.`);
    if (position <= previous) fail(`${page} stylesheet order is incorrect at ${stylesheet}.`);
    previous = position;
  }
  for (const hook of projectHooks) {
    if (!html.includes(hook)) fail(`${page} lacks shared content hook: ${hook}.`);
  }
  if (html.includes("case-header")) fail(`${page} still uses the legacy runtime header target.`);
  if (html.match(/<h1\b/g)?.length !== 1) fail(`${page} must contain exactly one primary heading.`);
  if (!html.includes('class="case-next jl-surface-inverse"')) fail(`${page} lacks shared next-project treatment.`);
}

for (const forbidden of [
  "grid-template-columns: repeat(12, minmax(0, 1fr))",
  ".case-facts {", ".case-section-label {", ".case-section-content {",
  ".process-list {", ".metric-grid {", 'font-family: "Iowan Old Style"',
  "color: #3f3d38",
]) {
  if (caseStyles.includes(forbidden)) fail(`Case-study CSS reclaims shared content ownership: ${forbidden}.`);
}

console.log(`Web Design System v1.4.0 content integration passed for ${projectPages.length + 1} portfolio pages.`);
