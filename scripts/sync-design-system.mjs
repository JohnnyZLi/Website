import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const packageRoot = resolve("node_modules/@johnnyzli/web-design-system");
const outputRoot = resolve("assets/design-system");
const files = [
  ["tokens/tokens.css", "tokens.css"],
  ["styles/foundations.css", "foundations.css"],
  ["styles/site-identity.css", "site-identity.css"],
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
    "Source commit: 1999e51c5b3f340ab6360cf958ac24d77203d140",
    "",
    "Regenerate with `npm run design-system:sync`.",
    "",
  ].join("\n"),
  "utf8",
);

console.log(`Synced ${packageMetadata.name} v${packageMetadata.version}.`);
