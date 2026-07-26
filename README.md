# Johnny Li — Portfolio

The source for my personal portfolio website.

## Design system

The portfolio consumes `@johnnyzli/web-design-system` v1.3.4 from the exact source commit recorded in `package.json` and `assets/design-system/SOURCE.md`.

The deployed site remains static. During development and CI, `npm run design-system:sync` copies the package's generated tokens and shared CSS foundations into `assets/design-system/`. `npm run design-system:check` fails when those committed assets drift from the pinned package.

Product-specific editorial layout remains in this repository. Shared colors, typography roles, focus behavior, canvas texture, spacing primitives, the global header, and the Sites control come from the design-system package. The homepage and project case studies use the same global-header contract.

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
