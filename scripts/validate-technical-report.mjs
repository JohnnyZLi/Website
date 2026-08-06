import { readFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");
const report = await read("projects/network-diagnostics-suite/report/index.html");
const styles = await read("technical-report.css");
const actions = await read("project-actions.css");
const behavior = await read("technical-report.js");
const workflow = await read(".github/workflows/technical-report-audit.yml");
const visualAudit = await read("scripts/technical-report-visual-audit.mjs");
const visualBaseline = JSON.parse(await read("scripts/technical-report-visual-baseline.json"));
const socialCard = await read("assets/network-diagnostics-report-social.svg");

const fail = (message) => { throw new Error(message); };
const requireFragments = (content, fragments, label) => {
  for (const fragment of fragments) {
    if (!content.includes(fragment)) fail(`${label} is incomplete: ${fragment}`);
  }
};

requireFragments(report, [
  'href="../../../technical-report.css"',
  'class="jl-global-header"',
  'class="report-actions jl-actions"',
  'report-action-primary jl-button jl-button--primary',
  'report-action-resource jl-button',
  'class="report-abstract-lede"',
  'data-report-toc',
  'data-report-toc-indicator',
  'data-report-section-link',
  'data-report-progress',
  'data-report-progress-toggle',
  'data-report-progress-menu',
  'class="report-heading-group"',
  '<section class="report-table-wrap jl-table-region"',
  '<caption class="report-table-caption">',
  'data-label="Interpretation"',
  'class="report-grid-item"',
  '<figure class="report-bars">',
  '<p class="report-quote">',
  'class="report-commit"',
  'class="report-citation"',
  'class="report-print-provenance"',
  'b1c549c5c83c2101c8530d861e79710bf894f1ca',
  '<link rel="canonical" href="https://johnnyli.dev/projects/network-diagnostics-suite/report/">',
  '<meta property="og:image" content="https://johnnyli.dev/assets/network-diagnostics-report-social.svg">',
  '<script src="../../../technical-report.js" defer></script>',
], "Technical report markup");

for (const forbidden of [
  "<style>",
  "style=\"",
  "report-header",
  "<time>6ed3cdb",
  '<script src="../../../motion.js"',
  '<div class="report-table-wrap jl-table-region" role="region"',
  "Google’s M-Lab test",
  "report-action report-action-primary\" type=\"button\"",
  '<blockquote class="report-quote">',
  '<div class="report-grid">\n              <article>',
  "Network-Diagnostics-Suite/blob/main/",
  "a GUI and a command line",
]) {
  if (report.includes(forbidden)) fail(`Technical report contains forbidden legacy structure: ${forbidden}`);
}

const launch = report.indexOf(">Launch tool <");
const print = report.indexOf(">Print / save PDF <");
const source = report.indexOf(">Source <");
if (!(launch >= 0 && launch < print && print < source)) fail("Technical report action DOM order does not match its visual order.");

if ((report.match(/class="report-heading-group"/g) ?? []).length !== 15) fail("Every report section must expose one print-safe heading group.");
if ((report.match(/class="report-grid-item"/g) ?? []).length !== 12) fail("The three editorial grids must contain twelve semantic grid items.");
if ((report.match(/<caption class="report-table-caption">/g) ?? []).length !== 2) fail("Both technical report tables require captions.");
if ((report.match(/data-label="/g) ?? []).length !== 25) fail("Every compact table value must expose its column label.");

const referenceIds = [...report.matchAll(/id="ref-(\d+)"/g)].map((match) => Number(match[1]));
if (referenceIds.length !== 10 || referenceIds.some((value, index) => value !== index + 1)) {
  fail("Technical report references must expose sequential link targets.");
}
const citedReferences = new Set([...report.matchAll(/class="report-citation" href="#ref-(\d+)"/g)].map((match) => Number(match[1])));
if (citedReferences.size !== 10 || [...citedReferences].some((value) => value < 1 || value > 10)) {
  fail("Every bibliography entry must be connected to an inline technical claim.");
}
if ((report.match(/class="report-commit"/g) ?? []).length !== 4) fail("Project timeline commits are not fully linked.");

requireFragments(styles, [
  "--report-text: var(--jl-color-text);",
  ".report-abstract-lede",
  ".report-toc-indicator",
  ".report-progress-controls",
  ".report-progress-menu",
  "@media (prefers-reduced-motion: reduce)",
  ".report-intro + .report-section",
  ".report-toc {",
  "scroll-margin-top: 110px;",
  ".report-grid-item:nth-child(n + 3)",
  ".report-grid-item:nth-child(n + 2)",
  ".report-table-caption",
  '@media (max-width: 760px)',
  'content: attr(data-label);',
  ".report-bars figcaption",
  ".report-heading-group",
  "break-inside: avoid-page;",
  "orphans: 3;",
  "widows: 3;",
  "white-space: pre-wrap;",
  "overflow-wrap: anywhere;",
  '.references a[href^="http"]::after',
  ".report-print-provenance",
  "@media (max-width: 900px)",
  "@media (max-width: 420px)",
  "@media (forced-colors: active)",
  "@media print",
], "Technical report stylesheet");

if (/#[\da-f]{3,8}\b/i.test(styles) || /\b(?:rgb|rgba|hsl|hsla)\(/i.test(styles)) {
  fail("Technical report stylesheet contains raw color values instead of shared tokens.");
}
if (styles.includes("backdrop-filter")) fail("Technical report stylesheet re-owns the shared header surface.");
if (/^\.report-actions\s*\{/m.test(styles)) fail("Report action layout must remain owned by the shared project action component.");

const reportPrincipleBlock = styles.match(/\.report-principle \{([^}]*)\}/)?.[1] ?? "";
if (/border-bottom\s*:/.test(reportPrincipleBlock)) fail("Report principle must not duplicate the following section boundary.");
if (!/border-top\s*:/.test(reportPrincipleBlock)) fail("Report principle must retain its accent top rule.");

const reportGridBlock = styles.match(/\.report-grid \{([^}]*)\}/)?.[1] ?? "";
if (/border(?:-top|-right|-bottom|-left)?\s*:/.test(reportGridBlock)) fail("Report grids must not draw an outer container border.");
const reportGridItemBlock = styles.match(/\.report-grid-item \{([^}]*)\}/)?.[1] ?? "";
if (/border-bottom\s*:/.test(reportGridItemBlock)) fail("Report grid items must not create a bottom outer border.");

requireFragments(actions, [
  ".report-summary .report-actions {",
  ".report-summary .report-actions > .report-action-primary",
  ".report-summary .report-actions > .report-action-resource:first-of-type",
  ".report-summary .report-actions > .report-action-resource:last-child",
  ".report-summary .report-actions > .report-action-resource:first-of-type,",
  ".report-summary .report-actions > .report-action-resource:last-child {",
], "Shared project action component");
for (const brittleSelector of [
  'a[href="https://network.johnnyli.dev"]',
  'a[href*="github.com/JohnnyZLi/Network-Diagnostics-Suite"]',
]) {
  if (actions.includes(brittleSelector)) fail(`Shared action styling still depends on a URL selector: ${brittleSelector}`);
}

requireFragments(behavior, [
  "window.print()",
  "IntersectionObserver",
  "history.replaceState",
  "aria-current', 'location'",
  "data-report-progress-link",
  "prefers-reduced-motion: reduce",
], "Technical report behavior");
requireFragments(workflow, [
  "runs-on: ubuntu-24.04",
  "poppler-utils",
  "node scripts/validate-technical-report.mjs",
  "node scripts/technical-report-visual-audit.mjs",
  "technical-report-visual-baseline.json",
  "technical-report-visual-audit",
], "Technical report workflow");
requireFragments(visualAudit, [
  "compact report actions are not three full-width stacked rows",
  "scroll-aware contents did not activate section 04",
  "compact report progress menu",
  "desktop contents indicator has no motion",
  "still requires hidden horizontal scrolling",
  "compact code panel",
  "print separates",
  "pdftotext",
  "generated audit PDF is not tagged",
  "visual baseline changed",
  "contents anchor lands beneath the header",
], "Technical report rendered audit");

const expectedBaselineNames = ["desktop", "narrow-desktop", "mobile", "minimum", "forced-colors"];
const baselineNames = Object.keys(visualBaseline.hashes ?? {}).sort();
if (visualBaseline.schemaVersion !== "1.0.0" || visualBaseline.runner !== "ubuntu-24.04" || visualBaseline.playwright !== "1.54.1") {
  fail("Technical report visual baseline metadata is invalid.");
}
if (baselineNames.join("|") !== [...expectedBaselineNames].sort().join("|")) fail("Technical report visual baseline viewport set is incomplete.");
for (const name of expectedBaselineNames) {
  if (!/^[0-9a-f]{64}$/.test(visualBaseline.hashes[name] ?? "")) fail(`Technical report visual baseline hash is invalid: ${name}`);
}
if (!socialCard.includes("Network Diagnostics") || !socialCard.includes("Technical report")) fail("Technical report social card content is incomplete.");

console.log("Technical report contract passed.");
