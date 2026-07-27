import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(".");
const index = await readFile(resolve(root, "index.html"), "utf8");
const motion = await readFile(resolve(root, "motion.js"), "utf8");
const navigation = await readFile(resolve(root, "portfolio-navigation.js"), "utf8");
const caseFixes = await readFile(resolve(root, "case-study-fixes.css"), "utf8");
const adapter = await readFile(resolve(root, "design-system-migration.css"), "utf8");
const identityStyles = await readFile(
  resolve(root, "assets/design-system/site-identity.css"),
  "utf8",
);
const version = JSON.parse(
  await readFile(resolve(root, "assets/design-system/version.json"), "utf8"),
);
const source = await readFile(resolve(root, "assets/design-system/SOURCE.md"), "utf8");

const fail = (message) => {
  throw new Error(message);
};

if (version.version !== "1.3.4") fail("Portfolio must consume Web Design System v1.3.4.");
if (!source.includes("27f83fa7333903a38c2c5ca36ed0455fa71598fc")) {
  fail("Generated asset source commit is not pinned.");
}

const requiredStyles = [
  "assets/design-system/tokens.css",
  "assets/design-system/foundations.css",
  "assets/design-system/site-identity.css",
  "styles.css",
  "knowledge.css",
  "terracotta-accent.css",
  "design-system-migration.css",
];
let previousPosition = -1;
for (const stylesheet of requiredStyles) {
  const position = index.indexOf(`href="${stylesheet}"`);
  if (position < 0) fail(`Missing stylesheet ${stylesheet}.`);
  if (position <= previousPosition) fail(`Stylesheet order is incorrect at ${stylesheet}.`);
  previousPosition = position;
}

for (const hook of [
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
]) {
  if (!index.includes(hook)) fail(`Shared global-header hook is missing: ${hook}.`);
}
if (!index.includes('src="site-switcher.js"')) fail("Site switcher script is not loaded.");
for (const legacy of ["site-header shell", "wordmark", "site-header__actions", "primary-nav"]) {
  if (index.includes(legacy)) fail(`Legacy portfolio header hook remains: ${legacy}.`);
}

const menuStart = index.indexOf('id="owned-sites-menu"');
const menuEnd = index.indexOf("</ul>", menuStart);
if (menuStart < 0 || menuEnd < 0) fail("Owned-sites menu markup is missing.");
const menu = index.slice(menuStart, menuEnd);
const ownedSites = [
  ["https://johnnyli.dev", true],
  ["https://network.johnnyli.dev", false],
  ["https://rolepacket.johnnyli.dev", false],
];
for (const [url, current] of ownedSites) {
  const linkPattern = new RegExp(`<a[^>]*href="${url.replaceAll(".", "\\.")}"[^>]*>`, "g");
  const links = [...menu.matchAll(linkPattern)];
  if (links.length !== 1) fail(`Expected exactly one site-switcher link for ${url}.`);
  const tag = links[0][0];
  if (/\btarget=/.test(tag)) fail(`Owned-site link must open in the same tab: ${url}.`);
  if (current !== /aria-current="page"/.test(tag)) fail(`Incorrect current-site state for ${url}.`);
}

const directTokenAliases = ["--paper", "--ink", "--muted", "--clay", "--rule", "--ease-out"];
for (const alias of directTokenAliases) {
  const pattern = new RegExp(`${alias}:\\s*var\\(--jl-`);
  if (!pattern.test(adapter)) fail(`Legacy role ${alias} is not mapped to a shared token.`);
}
if (!/--shell:\s*min\(var\(--jl-layout-portfolio-max\)/.test(adapter)) {
  fail("Portfolio shell is not derived from the shared portfolio rail.");
}
if (!adapter.includes("var(--jl-color-focus-ring)")) fail("Shared focus ring token is not active.");
if (!adapter.includes(".contact-section .contact-links a:nth-child(n)")) {
  fail("Legacy responsive navigation must not hide portfolio contact links.");
}
for (const contract of [
  ".portfolio-nav-toggle",
  "@media (max-width: 900px)",
  ".jl-global-header__nav.portfolio-nav--open",
  ".jl-global-header__nav a:nth-child(n)",
  "display: grid;",
  "var(--jl-shadow-high)",
]) {
  if (!adapter.includes(contract)) fail(`Compact portfolio navigation styling is incomplete: ${contract}.`);
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
  'document.querySelector(".case-header")',
  'legacyCaseHeader.className = "jl-global-header"',
  'class="jl-global-header__inner"',
  'class="jl-site-identity__owner"',
  'class="jl-site-identity__product"',
  'class="jl-global-header__nav"',
  'class="jl-site-switcher__button"',
  '"../assets/design-system/tokens.css"',
  '"../assets/design-system/foundations.css"',
  '"../assets/design-system/site-identity.css"',
  '"../design-system-migration.css"',
  '"../case-study-fixes.css"',
  'switcherScript.src = "../site-switcher.js"',
  'navigation.dataset.portfolioNav = ""',
  'navButton.className = "portfolio-nav-toggle"',
  'navigationScript.src = legacyCaseHeader ? "../portfolio-navigation.js" : "portfolio-navigation.js"',
]) {
  if (!motion.includes(contract)) fail(`Portfolio header enhancement contract is missing: ${contract}.`);
}

for (const contract of [
  "portfolio-nav--open",
  'event.key === "Escape"',
  'document.addEventListener("pointerdown"',
  'window.matchMedia("(min-width: 901px)")',
  "restoreFocus",
]) {
  if (!navigation.includes(contract)) fail(`Compact portfolio navigation behavior is incomplete: ${contract}.`);
}
for (const contract of [
  ".case-hero",
  "overflow: clip;",
  "@supports not (overflow: clip)",
  "overflow: hidden;",
  "overflow-wrap: anywhere;",
]) {
  if (!caseFixes.includes(contract)) fail(`Case-study rendered-page correction is incomplete: ${contract}.`);
}

const projectDirectory = resolve(root, "projects");
const projectPages = (await readdir(projectDirectory)).filter((name) => name.endsWith(".html"));
for (const page of projectPages) {
  const html = await readFile(resolve(projectDirectory, page), "utf8");
  if (!html.includes('class="site-header shell case-header"')) fail(`${page} lacks the case-header enhancement target.`);
  if (!html.includes('src="../motion.js"')) fail(`${page} does not load the shared case-study shell enhancer.`);
  if (!html.includes("../index.html")) fail(`${page} cannot return to the portfolio.`);
}

console.log(`Design-system integration passed for ${projectPages.length + 1} pages.`);
