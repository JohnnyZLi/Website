import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(".");
const read = (path) => readFile(resolve(root, path), "utf8");
const index = await read("index.html");
const motion = await read("motion.js");
const navigation = await read("portfolio-navigation.js");
const switcher = await read("site-switcher.js");
const siteControls = await read("assets/design-system/site-controls.js");
const primitives = await read("assets/design-system/content-primitives.css");
const caseStyles = await read("case-study.css");
const caseFixes = await read("case-study-fixes.css");
const adapter = await read("design-system-migration.css");
const identityStyles = await read("assets/design-system/site-identity.css");
const updater = await read("scripts/update-design-system.mjs");
const sync = await read("scripts/sync-design-system.mjs");
const syncWorkflow = await read(".github/workflows/design-system-sync.yml");
const conformanceWorkflow = await read(".github/workflows/design-system-conformance.yml");
const conformanceManifest = JSON.parse(await read("design-system.conformance.json"));
const version = JSON.parse(await read("assets/design-system/version.json"));
const lock = JSON.parse(await read("design-system.lock.json"));
const packageMetadata = JSON.parse(await read("package.json"));
const source = await read("assets/design-system/SOURCE.md");

const expectedVersion = String(lock.version ?? "");
const expectedCommit = String(lock.sourceCommit ?? "");
const fail = (message) => { throw new Error(message); };
const requireFragments = (content, fragments, label) => {
  for (const fragment of fragments) if (!content.includes(fragment)) fail(`${label} is incomplete: ${fragment}.`);
};
const requireImmutableWorkflow = (content, workflow, label) => {
  const pattern = new RegExp(`uses: JohnnyZLi/Web-Design-System/\\.github/workflows/${workflow}@[0-9a-f]{40}`);
  if (!pattern.test(content)) fail(`${label} is not pinned to an immutable design-system commit.`);
};

if (lock.package !== "@johnnyzli/web-design-system") fail("Design-system lock package is invalid.");
if (!/^\d+\.\d+\.\d+$/.test(expectedVersion)) fail("Design-system lock version is invalid.");
if (!/^[0-9a-f]{40}$/.test(expectedCommit)) fail("Design-system lock source commit is invalid.");
if (version.version !== expectedVersion) fail(`Portfolio must consume Web Design System v${expectedVersion}.`);
if (!source.includes(expectedCommit) || !source.includes(`Version: ${expectedVersion}`)) fail("Generated asset source commit is not pinned.");
if (String(packageMetadata.dependencies?.["@johnnyzli/web-design-system"] ?? "") !== `github:JohnnyZLi/Web-Design-System#${expectedCommit}`) {
  fail("Portfolio package dependency does not match the design-system lock.");
}
if (packageMetadata.scripts?.["design-system:conformance"] !== "node node_modules/@johnnyzli/web-design-system/scripts/conformance-runner.mjs") {
  fail("Portfolio conformance command drifted.");
}
if (conformanceManifest.schemaVersion !== "1.0.0" || conformanceManifest.product !== "portfolio") {
  fail("Portfolio conformance manifest metadata drifted.");
}
for (const id of ["DS-DIST-001", "DS-HEADER-001", "DS-SITES-002", "DS-RESP-001", "DS-TEST-001"]) {
  if (!conformanceManifest.rules?.[id]) fail(`Portfolio conformance manifest is missing ${id}.`);
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
if (!adapter.startsWith('@import url("assets/design-system/content-primitives.css");')) {
  fail("Portfolio adapter does not load the standalone content-primitives asset first.");
}

requireFragments(index, [
  'class="jl-global-header"', 'class="jl-global-header__inner"', 'class="jl-site-identity"',
  'class="jl-site-identity__owner"', 'class="jl-site-identity__product"',
  'class="jl-global-header__nav jl-header-menu"', 'class="jl-global-header__actions"',
  'class="jl-header-menu-toggle"', 'class="jl-site-switcher__button"',
  'aria-controls="portfolio-navigation"', 'aria-controls="owned-sites-menu"',
  'id="owned-sites-menu"', "data-header-menu", "data-header-menu-button",
  "data-site-switcher", "data-site-switcher-button", "data-site-switcher-menu",
  '<script type="module" src="site-switcher.js"></script>',
  '<script type="module" src="portfolio-navigation.js"></script>',
], "Portfolio shared header");
for (const legacy of ["site-header shell", "wordmark", "site-header__actions", "primary-nav", "portfolio-nav-toggle"]) {
  if (index.includes(legacy)) fail(`Legacy portfolio header hook remains: ${legacy}.`);
}

requireFragments(siteControls, [
  "export const OWNED_SITES", 'id: "portfolio"', 'id: "network"', 'id: "rolepacket"',
  'href: "https://johnnyli.dev"', 'href: "https://network.johnnyli.dev"',
  'href: "https://rolepacket.johnnyli.dev"', "export function installSiteSwitcher",
  "export function installHeaderMenu", 'event.key === "ArrowDown"', 'event.key === "ArrowUp"',
  'event.key === "Home"', 'event.key === "End"', 'event.key === "Escape"',
  'document.addEventListener("pointerdown"', 'closeMediaQuery: "(min-width: 901px)"',
], "Shared site-control contract");
requireFragments(switcher, [
  'import { installSiteSwitcher } from "./assets/design-system/site-controls.js"',
  'document.querySelectorAll("[data-site-switcher]")', 'currentSite: "portfolio"', "populate: true",
], "Portfolio Sites wrapper");
requireFragments(navigation, [
  'import { installHeaderMenu } from "./assets/design-system/site-controls.js"',
  'document.querySelectorAll(".jl-global-header")', "installHeaderMenu", "data-site-switcher-button",
], "Portfolio navigation wrapper");
for (const forbidden of ['document.addEventListener("pointerdown"', 'document.addEventListener("keydown"', "portfolio-nav--open", 'window.matchMedia("(min-width: 901px)")']) {
  if (navigation.includes(forbidden) || switcher.includes(forbidden)) fail(`Portfolio wrapper reimplements shared behavior: ${forbidden}.`);
}

for (const alias of ["--paper", "--ink", "--muted", "--clay", "--rule", "--ease-out"]) {
  if (!new RegExp(`${alias}:\\s*var\\(--jl-`).test(adapter)) fail(`Legacy role ${alias} is not mapped to a shared token.`);
}
if (!/--shell:\s*min\(var\(--jl-layout-portfolio-max\)/.test(adapter)) fail("Portfolio shell is not shared-token-derived.");
if (!adapter.includes("var(--jl-color-focus-ring)")) fail("Shared focus ring token is not active.");
if (!adapter.includes(".contact-section .contact-links a:nth-child(n)")) fail("Contact links can be hidden by legacy navigation CSS.");
for (const forbidden of [".portfolio-nav-toggle", "@media (max-width: 900px)", ".jl-global-header__nav.portfolio-nav--open", ".jl-site-switcher__button", ".jl-site-menu,", ".site-header__actions"]) {
  if (adapter.includes(forbidden)) fail(`Portfolio adapter re-owns shared header behavior: ${forbidden}.`);
}

if (/^\s*@layer\b/m.test(identityStyles)) fail("Shared header must remain unlayered.");
requireFragments(identityStyles, [
  ".jl-global-header__inner", "grid-template-columns: auto minmax(0, 1fr) auto", "width: 88px;",
  "height: var(--jl-control-height-md);", "font-family: var(--jl-font-ui);", "font-size: 13px;",
  "font-weight: 700;", "line-height: 1;", '.jl-site-switcher__button > [aria-hidden="true"]',
  "border-right: 2px solid currentColor;", "border-bottom: 2px solid currentColor;",
  ".jl-header-menu-toggle", ".jl-global-header__nav.jl-header-menu--open",
  "right: var(--jl-layout-gutter);", "left: var(--jl-layout-gutter);", "@media (max-width: 360px)", "@media (forced-colors: active)",
], "Shared header and compact-menu contract");

requireFragments(primitives, [
  ".jl-actions {", "display: flex;", "flex-wrap: wrap;", ".jl-button {", "display: inline-flex;",
  "align-items: center;", "justify-content: center;", "text-decoration: none;", "cursor: pointer;",
  ".jl-button--primary", ".jl-callout--danger", ".jl-empty-state", ".jl-table-region",
  ".jl-dialog {", ".jl-dialog::backdrop", ".jl-dialog__surface", ".jl-dialog__actions",
], "Standalone content-primitives asset");
requireFragments(caseStyles, [
  ".case-actions {", "--jl-actions-gap: 12px;", ".case-action {", "--jl-button-min-height: auto;",
  "--jl-button-radius: 0;", "--jl-button-hover-background: var(--clay);", ".case-action-primary {",
], "Case-study primitive customization");
for (const obsolete of [".case-actions {\n  display: flex", ".case-action {\n  display: inline-flex", "padding: 12px 16px;\n  border: 1px solid var(--rule);"]) {
  if (caseStyles.includes(obsolete)) fail(`Case-study actions still duplicate shared structure: ${obsolete}.`);
}

for (const forbidden of ['document.querySelector(".case-header")', "legacyCaseHeader", ".innerHTML", 'createElement("link")', 'createElement("script")', "portfolio-nav-toggle"]) {
  if (motion.includes(forbidden)) fail(`Motion script still performs header enhancement: ${forbidden}.`);
}
requireFragments(motion, [
  'window.matchMedia("(prefers-reduced-motion: reduce)")', "IntersectionObserver",
  'document.documentElement.classList.add("motion-ready")', 'target.classList.add("motion-reveal")',
], "Portfolio reveal-motion contract");
requireFragments(caseFixes, [".case-hero", "overflow: clip;", "@supports not (overflow: clip)", "overflow: hidden;", "overflow-wrap: anywhere;"], "Case-study correction");

requireFragments(updater, [
  'import { resolveConsumerRelease } from "@johnnyzli/web-design-system/consumer-release.js"',
  'resolveConsumerRelease({ packageJson: "package.json" })', "release.version", "release.sourceCommit",
], "Shared design-system release resolver");
requireFragments(sync, [
  'readFile(resolve("design-system.lock.json")', 'styles/content-primitives.css',
  'assets/design-system', "dependency.endsWith(`#${sourceCommit}`)",
], "Design-system synchronizer");
requireFragments(syncWorkflow, [
  "workflow_dispatch:", "schedule:", "contents: write", "pull-requests: write",
  'node-version: "24"', "npm run design-system:integration", "npm run design-system:conformance", "assets/design-system", "product-name: portfolio",
], "Shared design-system update workflow caller");
requireImmutableWorkflow(syncWorkflow, "consumer-design-system-sync\\.yml", "Shared design-system update workflow caller");
if (syncWorkflow.includes("gh pr create") || syncWorkflow.includes("git push")) fail("Portfolio workflow still duplicates shared publication behavior.");
requireFragments(conformanceWorkflow, [
  "npm run design-system:integration", "npm run design-system:conformance", "portfolio-design-system-conformance",
], "Portfolio conformance workflow caller");
requireImmutableWorkflow(conformanceWorkflow, "consumer-conformance\\.yml", "Portfolio conformance workflow caller");

const projectDirectory = resolve(root, "projects");
const projectPages = (await readdir(projectDirectory)).filter((name) => name.endsWith(".html"));
for (const page of projectPages) {
  const html = await readFile(resolve(projectDirectory, page), "utf8");
  requireFragments(html, [
    'href="../assets/design-system/tokens.css"', 'href="../assets/design-system/foundations.css"',
    'href="../assets/design-system/site-identity.css"', 'href="../design-system-migration.css"',
    'href="../case-study-fixes.css"', 'class="jl-global-header"', 'class="jl-global-header__inner"',
    'class="jl-global-header__nav jl-header-menu"', 'class="jl-header-menu-toggle"',
    "data-header-menu", "data-header-menu-button", "data-site-switcher", "data-site-switcher-button",
    "data-site-switcher-menu", 'class="case-actions jl-actions"', "jl-button jl-button--primary",
    'class="case-action jl-button"', '<script type="module" src="../site-switcher.js"></script>',
    '<script type="module" src="../portfolio-navigation.js"></script>',
  ], `${page} shared contract`);
  for (const legacy of ['class="site-header shell case-header"', 'class="wordmark"']) {
    if (html.includes(legacy)) fail(`${page} still contains legacy header markup: ${legacy}.`);
  }
  if (!html.includes('src="../motion.js"')) fail(`${page} does not load reveal motion.`);
  if (!html.includes("../index.html")) fail(`${page} cannot return to the portfolio.`);
}

console.log(`Design-system integration passed for ${projectPages.length + 1} pages.`);
