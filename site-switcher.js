const { installSiteSwitcher } = await import("./assets/design-system/site-controls.js?v=3bfa0c6897c30ebfe5feffa1349c3811d29fa8bb");

for (const root of document.querySelectorAll("[data-site-switcher]")) {
  if (!(root instanceof HTMLElement)) continue;
  installSiteSwitcher(root, {
    currentSite: "portfolio",
    populate: true,
    onBeforeOpen: () => {
      const headerButton = root
        .closest(".jl-global-header")
        ?.querySelector('[data-header-menu-button][aria-expanded="true"]');
      if (headerButton instanceof HTMLButtonElement) headerButton.click();
    },
  });
}
