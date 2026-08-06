# Shared appearance

The portfolio and technical report consume Web Design System 1.9.0 from commit `aca8bf9f4c5c2b93a123ac91ca804b4079ec64b9`.

System, Light, and Dark are resolved before first paint and controlled from the shared Sites menu. The preference persists across owned production domains. Screen themes retain the portfolio’s semantic hierarchy, while technical-report printing is forced to the light paper presentation and restores the selected screen appearance afterward.

Release validation covers the homepage, a case study, and the technical report in both modes at desktop, mobile, and 320-pixel widths, including menu state, keyboard focus, responsive containment, report navigation, and PDF output. Runtime report progress is applied through a constructable stylesheet, preserving the report’s no-inline-style contract.
