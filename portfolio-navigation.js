import { installHeaderMenu } from "./assets/design-system/site-controls.js";

for (const header of document.querySelectorAll(".jl-global-header")) {
  if (!(header instanceof HTMLElement)) continue;
  installHeaderMenu(header, {
    onBeforeOpen: () => {
      const sitesButton = header.querySelector('[data-site-switcher-button][aria-expanded="true"]');
      if (sitesButton instanceof HTMLButtonElement) sitesButton.click();
    },
  });
}

const reportActions = document.querySelector(".report-actions");
if (reportActions instanceof HTMLElement) {
  const launchAction = reportActions.querySelector('a[href="https://network.johnnyli.dev"]');
  const printAction = reportActions.querySelector("[data-print-report]");

  if (launchAction instanceof HTMLAnchorElement && printAction instanceof HTMLButtonElement) {
    launchAction.classList.add("report-action-primary");
    printAction.classList.remove("report-action-primary");
    reportActions.prepend(launchAction);
  }

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = new URL("./report-actions.css", import.meta.url).href;
  document.head.append(stylesheet);
}
