import { installSiteSwitcher } from "./assets/design-system/site-controls.js";
import {
  installThemeControl,
  installThemeController,
} from "./assets/design-system/theme.js";

const themeController = installThemeController();

for (const root of document.querySelectorAll("[data-site-switcher]")) {
  if (!(root instanceof HTMLElement)) continue;
  const menu = root.querySelector("[data-site-switcher-menu]");
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
  if (menu instanceof HTMLElement && !menu.querySelector("[data-theme-control]")) {
    installThemeControl(menu, themeController);
  }
}
