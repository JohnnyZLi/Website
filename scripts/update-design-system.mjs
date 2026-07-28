import { resolveConsumerRelease } from "@johnnyzli/web-design-system/consumer-release.js";

const release = await resolveConsumerRelease({ packageJson: "package.json" });
console.log(`Locked ${release.package} v${release.version} at ${release.sourceCommit}.`);
