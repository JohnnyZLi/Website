const { installHeaderMenu } = await import("./assets/design-system/site-controls.js?v=929b746d6108dc563d7872cb951040ee4da8d642");

for (const header of document.querySelectorAll(".jl-global-header")) {
  if (!(header instanceof HTMLElement)) continue;
  installHeaderMenu(header, {
    onBeforeOpen: () => {
      const sitesButton = header.querySelector('[data-site-switcher-button][aria-expanded="true"]');
      if (sitesButton instanceof HTMLButtonElement) sitesButton.click();
    },
  });
}
