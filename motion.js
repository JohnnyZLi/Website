(() => {
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
