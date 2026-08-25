const { installSiteSwitcher } = await import("./assets/design-system/site-controls.js?v=db349fe587d22cef7d8af4ad90cfdb03ac3e4e96");

const HOPSCOTCH_SITE = Object.freeze({
  label: "HOPSCOTCH",
  href: "https://hopscotch.johnnyli.dev",
});

function ensureHopscotchSite(root) {
  const menu = root.querySelector("[data-site-switcher-menu]");
  if (!(menu instanceof HTMLElement)) return;
  if (menu.querySelector(`a[href="${HOPSCOTCH_SITE.href}"]`)) return;

  const item = document.createElement("li");
  const link = document.createElement("a");
  link.href = HOPSCOTCH_SITE.href;
  link.textContent = HOPSCOTCH_SITE.label;
  item.append(link);

  const networkLink = [...menu.querySelectorAll("a[href]")]
    .find((candidate) => candidate.getAttribute("href") === "https://network.johnnyli.dev");
  const networkItem = networkLink?.closest("li") ?? null;
  menu.insertBefore(item, networkItem);
}

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
  ensureHopscotchSite(root);
}
