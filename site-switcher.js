const { installSiteSwitcher } = await import("./assets/design-system/site-controls.js?v=e770272dda6389b106402e008fe9a0d69bdf4618");

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
