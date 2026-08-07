const { installHeaderMenu } = await import("./assets/design-system/site-controls.js?v=055a08d6236329f0fe318c7b78ad2c5ab7a50302");

for (const header of document.querySelectorAll(".jl-global-header")) {
  if (!(header instanceof HTMLElement)) continue;
  installHeaderMenu(header, {
    onBeforeOpen: () => {
      const sitesButton = header.querySelector('[data-site-switcher-button][aria-expanded="true"]');
      if (sitesButton instanceof HTMLButtonElement) sitesButton.click();
    },
  });
}
