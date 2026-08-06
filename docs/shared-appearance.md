# Shared appearance

The portfolio and technical report consume Web Design System 1.9.0 from commit `730fe5fc66de8321184ab7dae22c226a97d1aeb8`.

System, Light, and Dark are resolved before first paint and controlled from the shared Sites menu. The preference persists across owned production domains. Screen themes retain the portfolio’s semantic hierarchy, while technical-report printing is forced to the light paper presentation and restores the selected screen appearance afterward.

Release validation covers the homepage, a case study, and the technical report in both modes at desktop, mobile, and 320-pixel widths, including menu state, keyboard focus, responsive containment, report navigation, and PDF output.
