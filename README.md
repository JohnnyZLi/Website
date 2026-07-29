# Johnny Li — Portfolio

The source for my personal portfolio website.

## Design system

The portfolio consumes `@johnnyzli/web-design-system` v1.8.2 from the exact source commit recorded in `design-system.lock.json`, `package.json`, and `assets/design-system/SOURCE.md`.

The deployed site remains static. During development and continuous integration, `npm run design-system:sync` copies the generated tokens, accessibility foundations, shared header CSS, standalone content primitives, and framework-neutral site-control module into `assets/design-system/`. `npm run design-system:check` fails when those committed assets drift from the pinned package.

The current production UI is the approved portfolio baseline. Product-specific editorial composition, spacing, case-study structure, and reveal motion remain in this repository. Shared colors, typography roles, focus behavior, canvas texture, global-header geometry, owned-site registry, Sites-menu behavior, compact header-menu shell, and case-study action structure come from the design-system package.

Every case-study header exists directly in source HTML. The local `site-switcher.js` and `portfolio-navigation.js` files are thin module wrappers around the shared controllers. The five case-study action groups use the shared `jl-actions` and `jl-button` shells while local variables preserve their square editorial treatment.

`npm run design-system:update` resolves the latest reviewed design-system commit and updates the lock and package pin. A weekly and manually dispatchable GitHub Actions workflow validates that update and opens a draft pull request rather than changing `main` directly.

## Local preview

```bash
npm install
npm run design-system:check
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Validation

```bash
npm run design-system:check
npm run design-system:integration
npm run design-system:conformance
npm run lint:html
npm run lint:css
```

GitHub Actions also runs Web Content Accessibility Guidelines 2 AA checks and a rendered visual audit across every HTML page. Generated conformance reports and visual-audit screenshots are ignored locally.

## Performance baseline

The monthly and manually dispatchable performance workflow inventories production HTML, CSS, JavaScript, images, and fonts, then records median desktop and mobile browser timings for every page. It uploads `performance-baseline/report.json` and `performance-baseline/report.md` as a 30-day artifact.

For a local run:

```bash
npm install --no-save --no-package-lock playwright@1.54.1
npx playwright install chromium
npm run performance:baseline
```

Treat the browser timings as same-environment engineering evidence rather than field data. Compare runs only when the machine, browser build, power state, and workload are reasonably equivalent.

## Hosting

This site is dependency-free at runtime and designed for GitHub Pages. Publish the repository from the `main` branch and repository root.
