const { installSiteSwitcher } = await import("./assets/design-system/site-controls.js?v=9114a8833555584f3e5a15659ac03ab3898d2e6f");

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
