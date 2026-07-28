import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const repository = "JohnnyZLi/Web-Design-System";
const commitResponse = await fetch(`https://api.github.com/repos/${repository}/commits/main`, {
  headers: {
    accept: "application/vnd.github+json",
    "user-agent": "Johnny-Li-Portfolio-Design-System-Updater/1.0",
  },
});
if (!commitResponse.ok) {
  throw new Error(`Unable to resolve Web Design System main: ${commitResponse.status} ${commitResponse.statusText}`);
}
const commit = await commitResponse.json();
const sourceCommit = String(commit.sha ?? "");
if (!/^[0-9a-f]{40}$/.test(sourceCommit)) throw new Error("Web Design System returned an invalid commit SHA.");

const versionResponse = await fetch(`https://raw.githubusercontent.com/${repository}/${sourceCommit}/version.json`);
if (!versionResponse.ok) {
  throw new Error(`Unable to read Web Design System version: ${versionResponse.status} ${versionResponse.statusText}`);
}
const versionMetadata = await versionResponse.json();
const version = String(versionMetadata.version ?? "");
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Web Design System returned an invalid version.");

const lockPath = resolve("design-system.lock.json");
const lock = { package: "@johnnyzli/web-design-system", version, sourceCommit };
await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");

const packagePath = resolve("package.json");
const packageMetadata = JSON.parse(await readFile(packagePath, "utf8"));
packageMetadata.dependencies["@johnnyzli/web-design-system"] = `github:${repository}#${sourceCommit}`;
await writeFile(packagePath, `${JSON.stringify(packageMetadata, null, 2)}\n`, "utf8");
console.log(`Locked Web Design System v${version} at ${sourceCommit}.`);
