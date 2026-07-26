import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(".");
const index = await readFile(resolve(root, "index.html"), "utf8");
const motion = await readFile(resolve(root, "motion.js"), "utf8");
const adapter = await readFile(resolve(root, "design-system-migration.css"), "utf8");
const caseStyles = await readFile(resolve(root, "case-study.css"), "utf8");
const identityStyles = await readFile(resolve(root, "assets/design-system/site-identity.css"), "utf8");
const contentStyles = await readFile(resolve(root, "assets/design-system/content.css"), "utf8");
const version = JSON.parse(await readFile(resolve(root, "assets/design-system/version.json"), "utf8"));
const source = await readFile(resolve(root, "assets/design-system/SOURCE.md"), "utf8");

const fail = (message) => {
  throw new Error(message);
};

if (version.version !== "1.4.0") fail("Portfolio must consume Web Design System v1.4.0.");
if (!source.includes("ed00dc3897813ea049101926780a443d20dd22c5")) {
  fail("Generated asset source commit is not pinned to the reviewed v1.4.0 release.");
}

const requiredStyles = [
  "assets/design-system/tokens.css",
  "assets/design-system/foundations.css",
  "assets/design-system/site-identity.css",
  "assets/design-system/content.css",
  "styles.css",
  "knowledge.css",
  "terracotta-accent.css",
  "design-system-migration.css",
];
let previousPosition = -1;
for (const stylesheet of requiredStyles) {
  const position = index.indexOf(`href="${stylesheet}"`);
  if (position < 0) fail(`Missing homepage stylesheet ${stylesheet}.`);
  if (position <= previousPosition) fail(`Homepage stylesheet order is incorrect at ${stylesheet}.`);
  previousPosition = position;
}

for (const hook of [
  'class="jl-page"',
  'class="jl-global-header"',
  'class="jl-global-header__inner"',
  'class="jl-site-identity"',
  'class="jl-site-identity__owner"',
  'class="jl-site-identity__product"',
  'class="jl-global-header__nav"',
  'class="jl-global-header__actions"',
  'class="jl-site-switcher__button"',
  'aria-controls="owned-sites-menu"',
  'id="owned-sites-menu"',
  "data-site-switcher-button",
  "data-site-switcher-menu",
  "jl-page__inner--portfolio",
  "jl-page-section",
  "jl-page-section__header",
  "jl-page-section__body",
  "jl-content-grid",
  "jl-editorial-lead",
  "jl-prose",
]) {
  if (!index.includes(hook)) fail(`Homepage shared content hook is missing: ${hook}.`);
}
if (!index.includes('src="site-switcher.js"')) fail("Homepage site switcher script is not loaded.");

const menuStart = index.indexOf('id="owned-sites-menu"');
const menuEnd = index.indexOf("</ul>", menuStart);
if (menuStart < 0 || menuEnd < 0) fail("Homepage owned-sites menu markup is missing.");
const menu = index.slice(menuStart, menuEnd);
const ownedSites = [
  ["https://johnnyli.dev", true],
  ["https://network.johnnyli.dev", false],
  ["https://rolepacket.johnnyli.dev", false],
];
for (const [url, current] of ownedSites) {
  const pattern = new RegExp(`<a[^>]*href="${url.replaceAll(".", "\\.")}"[^>]*>`, "g");
  const links = [...menu.matchAll(pattern)];
  if (links.length !== 1) fail(`Expected exactly one homepage site-switcher link for ${url}.`);
  const tag = links[0][0];
  if (/\btarget=/.test(tag)) fail(`Owned-site link must open in the same tab: ${url}.`);
  if (current !== /aria-current="page"/.test(tag)) fail(`Incorrect homepage current-site state for ${url}.`);
}

const directTokenAliases = ["--paper", "--ink", "--muted", "--clay", "--rule", "--ease-out"];
for (const alias of directTokenAliases) {
  if (!new RegExp(`${alias}:\\s*var\\(--jl-`).test(adapter)) {
    fail(`Legacy portfolio role ${alias} is not mapped to a shared token.`);
  }
}
if (!/--shell:\s*min\(var\(--jl-layout-portfolio-max\)/.test(adapter)) {
  fail("Portfolio shell is not derived from the shared portfolio rail.");
}
if (!adapter.includes("var(--jl-color-focus-ring)")) fail("Shared focus-ring token is not active.");
if (!adapter.includes(".contact-section .contact-links a:nth-child(n)")) {
  fail("Legacy responsive navigation must not hide portfolio contact links.");
}
for (const forbidden of [".jl-site-switcher__button", ".jl-site-menu,", ".site-header__actions"]) {
  if (adapter.includes(forbidden)) fail(`Portfolio must not override shared header ownership: ${forbidden}.`);
}
if (/^\s*@layer\b/m.test(identityStyles)) {
  fail("Shared header must remain unlayered so product resets cannot override it.");
}

for (const contract of [
  ".jl-global-header__inner",
  "grid-template-columns: auto minmax(0, 1fr) auto",
  "width: 88px;",
  "height: var(--jl-control-height-md);",
  "font-family: var(--jl-font-ui);",
  "font-size: 13px;",
  "font-weight: 700;",
  "line-height: 1;",
  '.jl-site-switcher__button > [aria-hidden="true"]',
  "border-right: 2px solid currentColor;",
  "border-bottom: 2px solid currentColor;",
]) {
  if (!identityStyles.includes(contract)) fail(`Shared Sites control contract is incomplete: ${contract}.`);
}

for (const contract of [
  ".jl-page__inner",
  ".jl-page-hero__grid",
  ".jl-page-meta",
  ".jl-page-section__header",
  ".jl-content-grid",
  ".jl-prose",
  ".jl-editorial-lead",
  ".jl-panel",
  ".jl-process-list",
  ".jl-metric-grid",
  ".jl-callout--success",
  ".jl-button--primary",
  ".jl-code-block",
  ".jl-media__frame",
  ".jl-table-region",
  ".jl-empty-state",
  "@media (max-width: 560px)",
  "@media (forced-colors: active)",
]) {
  if (!contentStyles.includes(contract)) fail(`Shared page-content contract is incomplete: ${contract}.`);
}

for (const forbidden of [
  'document.querySelector(".case-header")',
  "legacyCaseHeader",
  'stylesheet.href = "../assets/design-system',
  'switcherScript.src = "../site-switcher.js"',
]) {
  if (motion.includes(forbidden)) fail(`Runtime case-study shell injection remains: ${forbidden}.`);
}

for (const forbidden of [
  "grid-template-columns: repeat(12, minmax(0, 1fr))",
  ".case-facts {",
  ".case-section-label {",
  ".case-section-content {",
  ".process-list {",
  ".metric-grid {",
  'font-family: "Iowan Old Style"',
  "color: #3f3d38",
]) {
  if (caseStyles.includes(forbidden)) fail(`Case-study adapter redefines shared content ownership: ${forbidden}.`);
}

const projectDirectory = resolve(root, "projects");
const projectPages = (await readdir(projectDirectory)).filter((name) => name.endsWith(".html")).sort();
const expectedPages = [
  "concurrent-c2s-proxy.html",
  "network-config-auditor.html",
  "network-diagnostics-suite.html",
  "ospf-resiliency-lab.html",
  "reliable-udp-transport.html",
];
if (JSON.stringify(projectPages) !== JSON.stringify(expectedPages)) {
  fail(`Project page inventory changed without a content-system audit: ${projectPages.join(", ")}.`);
}

const projectStyleOrder = [
  "../assets/design-system/tokens.css",
  "../assets/design-system/foundations.css",
  "../assets/design-system/site-identity.css",
  "../assets/design-system/content.css",
  "../styles.css",
  "../case-study.css",
  "../design-system-migration.css",
];
const projectHooks = [
  'class="jl-page"',
  'class="jl-global-header"',
  'class="jl-global-header__inner"',
  'class="jl-site-identity"',
  'class="jl-global-header__nav"',
  'class="jl-site-switcher__button"',
  "jl-page-hero",
  "jl-page-title",
  "jl-page-lede",
  "jl-actions",
  "jl-button",
  "jl-page-meta",
  "jl-meta-item",
  "jl-page-section",
  "jl-page-section__header",
  "jl-page-section__body",
  "jl-content-grid",
  "jl-editorial-lead",
  "jl-prose",
  "jl-panel",
  "jl-process-list",
  "jl-metric-grid",
  'src="../motion.js"',
  'src="../site-switcher.js"',
];
for (const page of projectPages) {
  const html = await readFile(resolve(projectDirectory, page), "utf8");
  let previous = -1;
  for (const stylesheet of projectStyleOrder) {
    const position = html.indexOf(`href="${stylesheet}"`);
    if (position < 0) fail(`${page} is missing stylesheet ${stylesheet}.`);
    if (position <= previous) fail(`${page} stylesheet order is incorrect at ${stylesheet}.`);
    previous = position;
  }
  for (const hook of projectHooks) {
    if (!html.includes(hook)) fail(`${page} lacks shared content hook: ${hook}.`);
  }
  if (!html.includes("../index.html")) fail(`${page} cannot return to the portfolio.`);
  if (html.includes("case-header")) fail(`${page} still contains the legacy case-header enhancement target.`);
  if (html.match(/<h1\b/g)?.length !== 1) fail(`${page} must contain exactly one primary heading.`);
  if (!html.includes('class="case-next jl-surface-inverse"')) fail(`${page} lacks shared next-project treatment.`);
}

console.log(`Web Design System v1.4.0 content integration passed for ${projectPages.length + 1} portfolio pages.`);
