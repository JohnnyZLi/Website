(() => {
  const nav = document.querySelector("[data-portfolio-nav]");
  const button = document.querySelector("[data-portfolio-nav-button]");
  if (!(nav instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) return;

  const close = ({ restoreFocus = false } = {}) => {
    nav.classList.remove("portfolio-nav--open");
    button.setAttribute("aria-expanded", "false");
    if (restoreFocus) button.focus();
  };

  const open = () => {
    nav.classList.add("portfolio-nav--open");
    button.setAttribute("aria-expanded", "true");
  };

  button.addEventListener("click", () => {
    if (button.getAttribute("aria-expanded") === "true") close();
    else open();
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) close();
  });

  document.addEventListener("pointerdown", (event) => {
    if (event.target instanceof Node && !nav.contains(event.target) && !button.contains(event.target)) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
      event.preventDefault();
      close({ restoreFocus: true });
    }
  });

  window.matchMedia("(min-width: 901px)").addEventListener("change", (event) => {
    if (event.matches) close();
  });
})();
