const { installHeaderMenu } = await import("./assets/design-system/site-controls.js?v=3bfa0c6897c30ebfe5feffa1349c3811d29fa8bb");

for (const header of document.querySelectorAll(".jl-global-header")) {
  if (!(header instanceof HTMLElement)) continue;
  installHeaderMenu(header, {
    onBeforeOpen: () => {
      const sitesButton = header.querySelector('[data-site-switcher-button][aria-expanded="true"]');
      if (sitesButton instanceof HTMLButtonElement) sitesButton.click();
    },
  });
}
