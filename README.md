# Johnny Li — Portfolio

The source for my personal portfolio website.

## Design system

The portfolio consumes `@johnnyzli/web-design-system` v1.6.1 from the exact source commit recorded in `design-system.lock.json`, `package.json`, and `assets/design-system/SOURCE.md`.

The deployed site remains static. During development and CI, `npm run design-system:sync` copies the generated tokens, accessibility foundations, shared header CSS, standalone content primitives, and framework-neutral site-control module into `assets/design-system/`. `npm run design-system:check` fails when those committed assets drift from the pinned package.

The current production UI is the approved portfolio baseline. Product-specific editorial composition, spacing, case-study structure, and reveal motion remain in this repository. Shared colors, typography roles, focus behavior, canvas texture, global-header geometry, owned-site registry, Sites-menu behavior, compact header-menu shell, and case-study action structure come from the design-system package.

Every case-study header exists directly in source HTML. The local `site-switcher.js` and `portfolio-navigation.js` files are thin module wrappers around the shared controllers. The five case-study action groups now use the shared `jl-actions` and `jl-button` shells while local variables preserve their square editorial treatment.

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
npm run design-system:integration
npm run lint:html
npm run lint:css
```

GitHub Actions also runs Web Content Accessibility Guidelines 2 AA checks across every HTML page.

## Hosting

This site is dependency-free at runtime and designed for GitHub Pages. Publish the repository from the `main` branch and repository root.
