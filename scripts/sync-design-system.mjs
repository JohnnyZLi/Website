import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const packageRoot = resolve("node_modules/@johnnyzli/web-design-system");
const outputRoot = resolve("assets/design-system");
const lock = JSON.parse(await readFile(resolve("design-system.lock.json"), "utf8"));
const sourceCommit = String(lock.sourceCommit ?? "");
const lockedVersion = String(lock.version ?? "");
if (!/^[0-9a-f]{40}$/.test(sourceCommit)) throw new Error("design-system.lock.json has an invalid source commit.");
if (!/^\d+\.\d+\.\d+$/.test(lockedVersion)) throw new Error("design-system.lock.json has an invalid version.");

const files = [
  ["tokens/tokens.css", "tokens.css"],
  ["styles/foundations.css", "foundations.css"],
  ["styles/site-identity.css", "site-identity.css"],
  ["styles/theme-control.css", "theme-control.css"],
  ["styles/content-primitives.css", "content-primitives.css"],
  ["scripts/theme-bootstrap.js", "theme-bootstrap.js"],
  ["scripts/site-controls.js", "site-controls.js"],
  ["version.json", "version.json"],
];

await mkdir(outputRoot, { recursive: true });
for (const [source, destination] of files) {
  const sourcePath = resolve(packageRoot, source);
  const destinationPath = resolve(outputRoot, destination);
  await mkdir(dirname(destinationPath), { recursive: true });
  await copyFile(sourcePath, destinationPath);
}

const packageMetadata = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
const versionMetadata = JSON.parse(await readFile(resolve(outputRoot, "version.json"), "utf8"));
if (packageMetadata.version !== versionMetadata.version || packageMetadata.version !== lockedVersion) {
  throw new Error(`Design-system version mismatch: package ${packageMetadata.version}, metadata ${versionMetadata.version}, lock ${lockedVersion}`);
}

const consumerPackage = JSON.parse(await readFile(resolve("package.json"), "utf8"));
const dependency = String(consumerPackage.dependencies?.["@johnnyzli/web-design-system"] ?? "");
if (!dependency.endsWith(`#${sourceCommit}`)) {
  throw new Error("Portfolio dependency does not match design-system.lock.json.");
}

await writeFile(
  resolve(outputRoot, "SOURCE.md"),
  [
    "# Generated design-system assets",
    "",
    "Do not edit these files directly.",
    "",
    `Package: ${packageMetadata.name}`,
    `Version: ${packageMetadata.version}`,
    `Source commit: ${sourceCommit}`,
    "",
    "Regenerate with `npm run design-system:sync`.",
    "",
  ].join("\n"),
  "utf8",
);
console.log(`Synced ${packageMetadata.name} v${packageMetadata.version} at ${sourceCommit}.`);
