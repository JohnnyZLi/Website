const { installHeaderMenu } = await import("./assets/design-system/site-controls.js?v=db349fe587d22cef7d8af4ad90cfdb03ac3e4e96");

for (const header of document.querySelectorAll(".jl-global-header")) {
  if (!(header instanceof HTMLElement)) continue;
  installHeaderMenu(header, {
    onBeforeOpen: () => {
      const sitesButton = header.querySelector('[data-site-switcher-button][aria-expanded="true"]');
      if (sitesButton instanceof HTMLButtonElement) sitesButton.click();
    },
  });
}
