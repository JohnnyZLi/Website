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

### Terracotta emphasis and cadence

Large editorial leads stay predominantly neutral, with a small, meaningful terracotta phrase creating emphasis inside the sentence.

- A lead SHOULD emphasize one concise phrase when it helps identify the section's promise, behavior, result, or limitation. Usually one to three words is enough; grammar or meaning MAY justify a slightly longer phrase. This is an editorial guide, not a fixed word quota.
- Emphasis is authored in the source around the actual idea. Entire lead or body sentences MUST NOT be colored as a shortcut, and a long clause SHOULD be reduced to its semantic core. Negation and qualifications MUST retain their meaning; include them in the accent when omitting them would reverse the emphasized claim.
- Keep a highlighted phrase continuous, including connecting words and punctuation that belong to it. Do not split one idea into alternating accented and neutral words. The homepage About phrase `evidence, state, and failure` is one highlight, including `and`.
- Consecutive leads MAY each contain a short accent when they mark distinct ideas. Review the colored extent and line wrapping within each lead rather than imposing a page-wide accent quota. A lead MAY remain entirely neutral when emphasis adds no useful distinction.
- Prominent text uses `--jl-color-accent` or the Portfolio alias `--clay-text`. Section numbers and compact metadata on the canvas use the decorative accent role; secondary inverse-surface arrows, underlines, and borders use the soft role under the inverse-section contract.
- Hero headlines and closing contact compositions follow the homepage's hierarchy: keep surrounding headline text neutral and use the primary accent for a short meaningful phrase or action. Their serif/display treatment remains page-owned.

Privacy's selected phrases are `visitor profiles`, `functional preference`, `local result storage`, `processing traffic`, and `different storage requirements`. Each marks a different privacy boundary while its surrounding sentence remains neutral.

Privacy's opening keeps `Privacy,` neutral and emphasizes the promise `without guesswork.` in terracotta editorial serif. Its closing question keeps the surrounding text neutral and emphasizes `handled?` with the same accent and serif treatment. These display accents give the page an opening and closing rhythm alongside its section leads.

The shared editorial layer supplies geometry, typography, and the emphasis style. Content selects the phrase; the primitive MUST NOT inject emphasis or force every section into the same composition. Privacy's wider Network Diagnostics lead and boundary columns remain page-owned.

Validation protects shared primitive ownership and checks that authored Privacy emphasis stays inside predominantly neutral leads. It does not impose a fixed accent count across the page.
