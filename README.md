# Johnny Li — Portfolio

The source for my personal portfolio website.

## Design system

The portfolio consumes `@johnnyzli/web-design-system` v1.5.0 from the exact source commit recorded in `package.json` and `assets/design-system/SOURCE.md`.

The deployed site remains static. During development and CI, `npm run design-system:sync` copies the generated tokens, accessibility foundations, shared header CSS, and framework-neutral site-control module into `assets/design-system/`. `npm run design-system:check` fails when those committed assets drift from the pinned package.

The current production UI is the approved portfolio baseline. Product-specific editorial composition, spacing, case-study structure, and reveal motion remain in this repository. Shared colors, typography roles, focus behavior, canvas texture, global-header geometry, owned-site registry, Sites-menu behavior, and compact header-menu shell come from the design-system package.

Every case-study header now exists directly in source HTML rather than being created at runtime. The local `site-switcher.js` and `portfolio-navigation.js` files are thin module wrappers around the shared controllers. The design system also provides optional content utilities for future work, but stable portfolio markup does not need to be rewritten solely to adopt shared class names.

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
