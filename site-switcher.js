(() => {
  const switcher = document.querySelector("[data-site-switcher]");
  if (!(switcher instanceof HTMLElement)) return;

  const button = switcher.querySelector("[data-site-switcher-button]");
  const menu = switcher.querySelector("[data-site-switcher-menu]");
  if (!(button instanceof HTMLButtonElement) || !(menu instanceof HTMLElement)) return;

  const links = [...menu.querySelectorAll("a")];

  const setOpen = (open, { restoreFocus = false } = {}) => {
    button.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
    if (restoreFocus) button.focus();
  };

  const openAndFocusFirst = () => {
    setOpen(true);
    links[0]?.focus();
  };

  button.addEventListener("click", () => {
    setOpen(button.getAttribute("aria-expanded") !== "true");
  });

  button.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    openAndFocusFirst();
  });

  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false, { restoreFocus: true });
      return;
    }

    if (!links.includes(document.activeElement)) return;
    const current = links.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      links[(current + 1) % links.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      links[(current - 1 + links.length) % links.length]?.focus();
    }
  });

  menu.addEventListener("click", () => setOpen(false));

  document.addEventListener("pointerdown", (event) => {
    if (event.target instanceof Node && !switcher.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) setOpen(false, { restoreFocus: true });
  });
})();
