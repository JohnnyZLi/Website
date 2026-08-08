const { installHeaderMenu } = await import("./assets/design-system/site-controls.js?v=45b70e02c9ef1f7c9a6f915069950cdd620cfef1");

for (const header of document.querySelectorAll(".jl-global-header")) {
  if (!(header instanceof HTMLElement)) continue;
  installHeaderMenu(header, {
    onBeforeOpen: () => {
      const sitesButton = header.querySelector('[data-site-switcher-button][aria-expanded="true"]');
      if (sitesButton instanceof HTMLButtonElement) sitesButton.click();
    },
  });
}
