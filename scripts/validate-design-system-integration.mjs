import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(".");
const index = await readFile(resolve(root, "index.html"), "utf8");
const adapter = await readFile(resolve(root, "design-system-migration.css"), "utf8");
const version = JSON.parse(
  await readFile(resolve(root, "assets/design-system/version.json"), "utf8"),
);
const source = await readFile(resolve(root, "assets/design-system/SOURCE.md"), "utf8");

const fail = (message) => {
  throw new Error(message);
};

if (version.version !== "1.3.2") fail("Portfolio must consume Web Design System v1.3.2.");
if (!source.includes("1999e51c5b3f340ab6360cf958ac24d77203d140")) {
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

if (!index.includes('aria-controls="owned-sites-menu"')) fail("Site switcher button is not connected to its menu.");
if (!index.includes('id="owned-sites-menu"')) fail("Owned-sites menu is missing.");
if (!index.includes("data-site-switcher-button") || !index.includes("data-site-switcher-menu")) {
  fail("Site switcher behavior hooks are missing.");
}
if (!index.includes('src="site-switcher.js"')) fail("Site switcher script is not loaded.");

const ownedSites = [
  ["https://johnnyli.dev", true],
  ["https://network.johnnyli.dev", false],
  ["https://rolepacket.johnnyli.dev", false],
];
for (const [url, current] of ownedSites) {
  const linkPattern = new RegExp(`<a[^>]*href="${url.replaceAll(".", "\\.")}"[^>]*>`, "g");
  const links = [...index.matchAll(linkPattern)];
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
if (!adapter.includes("@media (max-width: 420px)")) fail("Compact header transformation is missing.");

const projectDirectory = resolve(root, "projects");
const projectPages = (await readdir(projectDirectory)).filter((name) => name.endsWith(".html"));
for (const page of projectPages) {
  const html = await readFile(resolve(projectDirectory, page), "utf8");
  if (!html.includes("../index.html")) fail(`${page} cannot return to the portfolio.`);
}

console.log(`Design-system integration passed for ${projectPages.length + 1} pages.`);
