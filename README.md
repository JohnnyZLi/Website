# Johnny Li — Portfolio

The source for my personal portfolio website.

## Design system

The portfolio consumes `@johnnyzli/web-design-system` v1.4.0 from the exact source commit recorded in `package.json` and `assets/design-system/SOURCE.md`.

The deployed site remains static. During development and CI, `npm run design-system:sync` copies the package's generated tokens and shared CSS into `assets/design-system/`. `npm run design-system:check` fails when those committed assets drift from the pinned package.

Shared colors, typography roles, focus behavior, canvas texture, spacing primitives, the global header, the Sites control, page rails, heroes, metadata, sections, prose, grids, panels, process steps, metrics, callouts, actions, code, media, tables, empty states, and responsive transformations come from the design-system package.

The homepage and all five project case studies use these shared content roles directly in their source markup. Portfolio-specific CSS is limited to the editorial composition, decorative hero treatment, selected-work expression, and dark contact or next-project sections.

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

GitHub Actions also runs WCAG 2 AA checks across every HTML page.

## Hosting

This site is dependency-free at runtime and designed for GitHub Pages. Publish the repository from the `main` branch and repository root.
