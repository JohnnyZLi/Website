import { readFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");
const report = await read("projects/network-diagnostics-suite/report/index.html");
const styles = await read("technical-report.css");
const actions = await read("project-actions.css");
const behavior = await read("technical-report.js");
const workflow = await read(".github/workflows/technical-report-audit.yml");

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
  '<section class="report-table-wrap jl-table-region"',
  'class="report-commit"',
  'class="report-citation"',
  '<script src="../../../technical-report.js" defer></script>',
], "Technical report markup");

for (const forbidden of [
  "<style>",
  "style=\"",
  "report-header",
  "<time>",
  '<script src="../../../motion.js"',
  '<div class="report-table-wrap jl-table-region" role="region"',
  "Google’s M-Lab test",
  "report-action report-action-primary\" type=\"button\"",
]) {
  if (report.includes(forbidden)) fail(`Technical report contains forbidden legacy structure: ${forbidden}`);
}

const launch = report.indexOf(">Launch tool <");
const print = report.indexOf(">Print / save PDF <");
const source = report.indexOf(">Source <");
if (!(launch >= 0 && launch < print && print < source)) fail("Technical report action DOM order does not match its visual order.");

const referenceIds = [...report.matchAll(/id="ref-(\d+)"/g)].map((match) => Number(match[1]));
if (referenceIds.length !== 10 || referenceIds.some((value, index) => value !== index + 1)) {
  fail("Technical report references must expose sequential link targets.");
}
if ((report.match(/class="report-citation"/g) ?? []).length < 5) fail("Technical claims are not connected to enough primary sources.");
if ((report.match(/class="report-commit"/g) ?? []).length !== 4) fail("Project timeline commits are not fully linked.");

requireFragments(styles, [
  "--report-text: var(--jl-color-text);",
  ".report-abstract-lede",
  ".bar-fill-direct",
  ".bar-fill-worker",
  "@media (max-width: 900px)",
  "@media (max-width: 420px)",
  "@media (forced-colors: active)",
  "@media print",
  "break-before: auto;",
], "Technical report stylesheet");

if (/#[\da-f]{3,8}\b/i.test(styles) || /\b(?:rgb|rgba|hsl|hsla)\(/i.test(styles)) {
  fail("Technical report stylesheet contains raw color values instead of shared tokens.");
}
if (styles.includes("backdrop-filter")) fail("Technical report stylesheet re-owns the shared header surface.");

requireFragments(actions, [
  ".report-summary .report-actions > .report-action-primary",
  ".report-summary .report-actions > .report-action-resource",
], "Shared project action component");
for (const brittleSelector of [
  'a[href="https://network.johnnyli.dev"]',
  'a[href*="github.com/JohnnyZLi/Network-Diagnostics-Suite"]',
]) {
  if (actions.includes(brittleSelector)) fail(`Shared action styling still depends on a URL selector: ${brittleSelector}`);
}

if (!behavior.includes("window.print()")) fail("Technical report print behavior is missing.");
requireFragments(workflow, [
  "node scripts/validate-technical-report.mjs",
  "node scripts/technical-report-visual-audit.mjs",
  "technical-report-visual-audit",
], "Technical report workflow");

console.log("Technical report contract passed.");
