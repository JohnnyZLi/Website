import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(".");
const index = await readFile(resolve(root, "index.html"), "utf8");
const motion = await readFile(resolve(root, "motion.js"), "utf8");
const navigation = await readFile(resolve(root, "portfolio-navigation.js"), "utf8");
const switcher = await readFile(resolve(root, "site-switcher.js"), "utf8");
const siteControls = await readFile(resolve(root, "assets/design-system/site-controls.js"), "utf8");
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

if (version.version !== "1.5.0") fail("Portfolio must consume Web Design System v1.5.0.");
if (!source.includes("14fc1281f02d3a1fa33e6d80aae24637d93b04f7")) {
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
  'class="jl-global-header__nav jl-header-menu"',
  'class="jl-global-header__actions"',
  'class="jl-header-menu-toggle"',
  'class="jl-site-switcher__button"',
  'aria-controls="portfolio-navigation"',
  'aria-controls="owned-sites-menu"',
  'id="owned-sites-menu"',
  "data-header-menu",
  "data-header-menu-button",
  "data-site-switcher",
  "data-site-switcher-button",
  "data-site-switcher-menu",
]) {
  if (!index.includes(hook)) fail(`Shared global-header hook is missing: ${hook}.`);
}
for (const script of [
  '<script type="module" src="site-switcher.js"></script>',
  '<script type="module" src="portfolio-navigation.js"></script>',
]) {
  if (!index.includes(script)) fail(`Shared module script is not loaded: ${script}.`);
}
for (const legacy of ["site-header shell", "wordmark", "site-header__actions", "primary-nav", "portfolio-nav-toggle"]) {
  if (index.includes(legacy)) fail(`Legacy portfolio header hook remains: ${legacy}.`);
}

for (const contract of [
  "export const OWNED_SITES",
  'id: "portfolio"',
  'id: "network"',
  'id: "rolepacket"',
  'href: "https://johnnyli.dev"',
  'href: "https://network.johnnyli.dev"',
  'href: "https://rolepacket.johnnyli.dev"',
  "export function installSiteSwitcher",
  "export function installHeaderMenu",
  'event.key === "ArrowDown"',
  'event.key === "ArrowUp"',
  'event.key === "Home"',
  'event.key === "End"',
  'event.key === "Escape"',
  'document.addEventListener("pointerdown"',
  'closeMediaQuery: "(min-width: 901px)"',
]) {
  if (!siteControls.includes(contract)) fail(`Shared site-control contract is incomplete: ${contract}.`);
}
for (const contract of [
  'import { installSiteSwitcher } from "./assets/design-system/site-controls.js"',
  'document.querySelectorAll("[data-site-switcher]")',
  'currentSite: "portfolio"',
  "populate: true",
  "installSiteSwitcher",
]) {
  if (!switcher.includes(contract)) fail(`Portfolio Sites wrapper is incomplete: ${contract}.`);
}
for (const contract of [
  'import { installHeaderMenu } from "./assets/design-system/site-controls.js"',
  'document.querySelectorAll(".jl-global-header")',
  "installHeaderMenu",
  "data-site-switcher-button",
]) {
  if (!navigation.includes(contract)) fail(`Portfolio navigation wrapper is incomplete: ${contract}.`);
}
for (const forbidden of [
  'document.addEventListener("pointerdown"',
  'document.addEventListener("keydown"',
  "portfolio-nav--open",
  'window.matchMedia("(min-width: 901px)")',
]) {
  if (navigation.includes(forbidden) || switcher.includes(forbidden)) {
    fail(`Portfolio wrapper reimplements shared controller behavior: ${forbidden}.`);
  }
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
for (const forbidden of [
  ".portfolio-nav-toggle",
  "@media (max-width: 900px)",
  ".jl-global-header__nav.portfolio-nav--open",
  ".jl-site-switcher__button",
  ".jl-site-menu,",
  ".site-header__actions",
]) {
  if (adapter.includes(forbidden)) fail(`Portfolio adapter re-owns shared header behavior or styling: ${forbidden}.`);
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
  ".jl-header-menu-toggle",
  ".jl-global-header__nav.jl-header-menu--open",
  "right: var(--jl-layout-gutter);",
  "left: var(--jl-layout-gutter);",
  "@media (forced-colors: active)",
]) {
  if (!identityStyles.includes(contract)) fail(`Shared header and compact-menu contract is incomplete: ${contract}.`);
}

for (const forbidden of [
  'document.querySelector(".case-header")',
  "legacyCaseHeader",
  ".innerHTML",
  "createElement(\"link\")",
  "createElement(\"script\")",
  "portfolio-nav-toggle",
]) {
  if (motion.includes(forbidden)) fail(`Motion script still performs header enhancement: ${forbidden}.`);
}
for (const contract of [
  'window.matchMedia("(prefers-reduced-motion: reduce)")',
  "IntersectionObserver",
  'document.documentElement.classList.add("motion-ready")',
  'target.classList.add("motion-reveal")',
]) {
  if (!motion.includes(contract)) fail(`Portfolio reveal-motion contract is incomplete: ${contract}.`);
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
  for (const contract of [
    'href="../assets/design-system/tokens.css"',
    'href="../assets/design-system/foundations.css"',
    'href="../assets/design-system/site-identity.css"',
    'href="../design-system-migration.css"',
    'href="../case-study-fixes.css"',
    'class="jl-global-header"',
    'class="jl-global-header__inner"',
    'class="jl-global-header__nav jl-header-menu"',
    'class="jl-header-menu-toggle"',
    "data-header-menu",
    "data-header-menu-button",
    "data-site-switcher",
    "data-site-switcher-button",
    "data-site-switcher-menu",
    '<script type="module" src="../site-switcher.js"></script>',
    '<script type="module" src="../portfolio-navigation.js"></script>',
  ]) {
    if (!html.includes(contract)) fail(`${page} lacks native shared-header contract: ${contract}.`);
  }
  for (const legacy of ['class="site-header shell case-header"', 'class="wordmark"']) {
    if (html.includes(legacy)) fail(`${page} still contains legacy header markup: ${legacy}.`);
  }
  if (!html.includes('src="../motion.js"')) fail(`${page} does not load reveal motion.`);
  if (!html.includes("../index.html")) fail(`${page} cannot return to the portfolio.`);
}

console.log(`Design-system integration passed for ${projectPages.length + 1} pages.`);
