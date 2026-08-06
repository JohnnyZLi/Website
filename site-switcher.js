import { installSiteSwitcher as cachedInstallSiteSwitcher } from "./assets/design-system/site-controls.js";

const { installSiteSwitcher = cachedInstallSiteSwitcher } = await import(
  "./assets/design-system/site-controls.js?v=1.9.0-theme-controls",
);

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
