(() => {
  const legacyCaseHeader = document.querySelector(".case-header");
  if (legacyCaseHeader instanceof HTMLElement) {
    [
      "../assets/design-system/tokens.css",
      "../assets/design-system/foundations.css",
      "../assets/design-system/site-identity.css",
      "../design-system-migration.css",
      "../case-study-fixes.css"
    ].forEach((href) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = href;
      document.head.append(stylesheet);
    });

    legacyCaseHeader.className = "jl-global-header";
    legacyCaseHeader.innerHTML = `
      <div class="jl-global-header__inner">
        <div class="jl-site-identity">
          <a class="jl-site-identity__owner" href="../index.html">Johnny Li</a>
          <span class="jl-site-identity__separator" aria-hidden="true">/</span>
          <a class="jl-site-identity__product" href="../index.html" aria-current="page">Portfolio</a>
        </div>
        <nav class="jl-global-header__nav" aria-label="Case study navigation">
          <a href="../index.html#work">All work</a>
          <a href="../index.html#experience">Experience</a>
          <a href="../index.html#contact">Contact</a>
        </nav>
        <div class="jl-global-header__actions">
          <div class="jl-site-switcher" data-site-switcher>
            <button class="jl-site-switcher__button" type="button" aria-expanded="false" aria-controls="owned-sites-menu" data-site-switcher-button>
              Sites
              <span aria-hidden="true">⌄</span>
            </button>
            <ul class="jl-site-menu" id="owned-sites-menu" aria-label="Johnny Li sites" data-site-switcher-menu hidden>
              <li><a href="https://johnnyli.dev" aria-current="page">Portfolio</a></li>
              <li><a href="https://network.johnnyli.dev">Network Diagnostics</a></li>
              <li><a href="https://rolepacket.johnnyli.dev">RolePacket</a></li>
            </ul>
          </div>
        </div>
      </div>`;

    const switcherScript = document.createElement("script");
    switcherScript.src = "../site-switcher.js";
    document.head.append(switcherScript);
  }

  const globalHeader = document.querySelector(".jl-global-header");
  if (globalHeader instanceof HTMLElement) {
    const navigation = globalHeader.querySelector(".jl-global-header__nav");
    const actions = globalHeader.querySelector(".jl-global-header__actions");
    if (navigation instanceof HTMLElement && actions instanceof HTMLElement) {
      navigation.id = "portfolio-navigation";
      navigation.dataset.portfolioNav = "";

      const navButton = document.createElement("button");
      navButton.className = "portfolio-nav-toggle";
      navButton.type = "button";
      navButton.setAttribute("aria-expanded", "false");
      navButton.setAttribute("aria-controls", navigation.id);
      navButton.setAttribute("data-portfolio-nav-button", "");
      navButton.textContent = "Menu";
      actions.prepend(navButton);

      const navigationScript = document.createElement("script");
      navigationScript.dataset.portfolioNavigation = "";
      navigationScript.src = legacyCaseHeader ? "../portfolio-navigation.js" : "portfolio-navigation.js";
      document.head.append(navigationScript);
    }
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const targets = document.querySelectorAll([
    ".section-kicker",
    ".work-item",
    ".experience-grid",
    ".about-grid",
    ".knowledge-block",
    ".contact-grid",
    ".case-facts",
    ".case-section-label",
    ".case-section-content",
    ".case-next-inner"
  ].join(","));

  document.documentElement.classList.add("motion-ready");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  targets.forEach((target, index) => {
    target.classList.add("motion-reveal");
    target.style.setProperty("--motion-delay", `${(index % 3) * 55}ms`);
    observer.observe(target);
  });
})();
