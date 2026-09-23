# Shared appearance

The Portfolio consumes Web Design System 1.9.0 from commit `db349fe587d22cef7d8af4ad90cfdb03ac3e4e96`.

System, Light, and Dark are resolved before first paint and controlled from the shared Settings disclosure. The preference persists across supported `*.johnnyli.dev` surfaces through the shared appearance contract. Screen themes retain the Portfolio’s semantic hierarchy, while technical-report printing is forced to the light paper presentation and restores the selected screen appearance afterward.

## Shared Portfolio footer

The homepage, Privacy, stable non-HOPSCOTCH case studies, and the Network Diagnostics technical report use one Portfolio-owned footer contract:

- `.portfolio-footer jl-surface-inverse`
- `.portfolio-footer__inner shell`
- `.portfolio-footer__links`

The component owns the full-width inverse surface, single top rule, muted owner identity, right-aligned destination group on wider screens, compact stacked layout at 560px and below, inverse focus treatment, and the approved dark-mode black surface. Footer copy and destinations remain page-owned; geometry and visual treatment do not.

Pages MUST NOT introduce a separate footer background, shell, radius, shadow, or responsive implementation. HOPSCOTCH is the explicit temporary exception while its interface is undergoing a separate redesign and is not part of this footer migration.

Release validation covers the homepage, Privacy, a stable case study, and the technical report in Light and Dark at desktop, mobile, and 320-pixel widths. The theme audit asserts the shared footer is present, retains its boundary rule and destination group, and resolves to the approved inverse surface in both themes.


## Shared Portfolio editorial primitives

Privacy and stable case studies share the same Portfolio-owned editorial composition through `portfolio-editorial.css`. The shared layer owns:

- numbered section-label geometry and typography;
- the twelve-column narrative copy grid;
- serif lead typography and selected lead emphasis;
- the supporting body column and paragraph rhythm;
- the tablet/mobile stacking behavior for those structures.

Page-specific styles retain only page-specific composition such as Privacy boundaries, case-study process/decision groups, hero treatments, metrics, and next-project sections. A page MUST NOT copy the shared label/grid/lead/body declarations back into its own stylesheet.

Existing `.case-*` and `.privacy-*` hooks remain supported compatibility selectors, while new Portfolio narrative work can use the `.portfolio-*` aliases directly.

### Terracotta restraint

Terracotta is a hierarchy signal, not a default treatment for editorial leads.

- Section numbers, compact markers, arrows, and similar metadata use the decorative accent role.
- Large lead text remains neutral by default.
- A lead MAY contain a source-authored primary-accent phrase when that phrase carries a specific semantic emphasis.
- Multiple consecutive leads SHOULD NOT each contain terracotta emphasis; repeated highlighting weakens hierarchy.
- Privacy intentionally uses one large lead accent—`local result storage` in the Network Diagnostics section—while its remaining lead sentences stay neutral.
