import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const packageRoot = resolve("node_modules/@johnnyzli/web-design-system");
const outputRoot = resolve("assets/design-system");
const sourceCommit = "14fc1281f02d3a1fa33e6d80aae24637d93b04f7";
const files = [
  ["tokens/tokens.css", "tokens.css"],
  ["styles/foundations.css", "foundations.css"],
  ["styles/site-identity.css", "site-identity.css"],
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

const packageMetadata = JSON.parse(
  await readFile(resolve(packageRoot, "package.json"), "utf8"),
);
const versionMetadata = JSON.parse(
  await readFile(resolve(outputRoot, "version.json"), "utf8"),
);

if (packageMetadata.version !== versionMetadata.version) {
  throw new Error(
    `Design-system version mismatch: package ${packageMetadata.version}, metadata ${versionMetadata.version}`,
  );
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

console.log(`Synced ${packageMetadata.name} v${packageMetadata.version}.`);
