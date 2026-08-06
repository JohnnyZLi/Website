const printButton = document.querySelector('[data-print-report]');
if (printButton instanceof HTMLButtonElement) {
  printButton.addEventListener('click', () => window.print());
}

const toc = document.querySelector('[data-report-toc]');
const progress = document.querySelector('[data-report-progress]');

if (toc instanceof HTMLElement && progress instanceof HTMLElement) {
  const tocLinks = [...toc.querySelectorAll('[data-report-section-link]')].filter(
    (link) => link instanceof HTMLAnchorElement,
  );
  const sections = tocLinks
    .map((link) => document.querySelector(link.hash))
    .filter((section) => section instanceof HTMLElement);
  const indicator = toc.querySelector('[data-report-toc-indicator]');
  const progressToggle = progress.querySelector('[data-report-progress-toggle]');
  const progressCounter = progress.querySelector('[data-report-progress-counter]');
  const progressTitle = progress.querySelector('[data-report-progress-title]');
  const progressPrevious = progress.querySelector('[data-report-progress-previous]');
  const progressNext = progress.querySelector('[data-report-progress-next]');
  const progressFill = progress.querySelector('[data-report-progress-fill]');
  const progressMenu = progress.querySelector('[data-report-progress-menu]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (
    sections.length === tocLinks.length
    && indicator instanceof HTMLElement
    && progressToggle instanceof HTMLButtonElement
    && progressCounter instanceof HTMLElement
    && progressTitle instanceof HTMLElement
    && progressPrevious instanceof HTMLAnchorElement
    && progressNext instanceof HTMLAnchorElement
    && progressFill instanceof HTMLElement
    && progressMenu instanceof HTMLElement
  ) {
    const compactList = toc.querySelector('ol')?.cloneNode(true);
    if (compactList instanceof HTMLOListElement) {
      compactList.className = 'report-progress-list';
      compactList.querySelectorAll('a').forEach((link) => {
        link.removeAttribute('aria-current');
        link.removeAttribute('data-report-section-link');
        link.setAttribute('data-report-progress-link', '');
      });
      progressMenu.append(compactList);
    }

    const compactLinks = [...progressMenu.querySelectorAll('[data-report-progress-link]')].filter(
      (link) => link instanceof HTMLAnchorElement,
    );
    let activeIndex = -1;
    let observer;
    let scheduled = false;
    let navigationTarget = -1;
    let navigationTargetTimer;
    let indicatorY = '0px';
    let indicatorHeight = '0px';
    let progressValue = '0%';
    let dynamicStyleSheet;

    try {
      if ('adoptedStyleSheets' in document && 'replaceSync' in CSSStyleSheet.prototype) {
        dynamicStyleSheet = new CSSStyleSheet();
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, dynamicStyleSheet];
      }
    } catch {
      dynamicStyleSheet = undefined;
    }

    const headerHeight = () => document.querySelector('.jl-global-header')?.getBoundingClientRect().height ?? 0;

    const syncDynamicStyles = () => {
      const transitionOverride = reducedMotion.matches ? 'transition: none !important;' : '';
      if (dynamicStyleSheet) {
        dynamicStyleSheet.replaceSync(`
          [data-report-toc-indicator] {
            --report-toc-indicator-y: ${indicatorY};
            --report-toc-indicator-height: ${indicatorHeight};
            ${transitionOverride}
          }
          [data-report-progress-fill] {
            --report-progress: ${progressValue};
            ${transitionOverride}
          }
        `);
        if (activeIndex >= 0) progressFill.style.setProperty('--report-progress', progressValue);
        return;
      }

      indicator.setAttribute('data-report-dynamic-style', '');
      progressFill.setAttribute('data-report-dynamic-style', '');
      indicator.style.setProperty('--report-toc-indicator-y', indicatorY);
      indicator.style.setProperty('--report-toc-indicator-height', indicatorHeight);
      progressFill.style.setProperty('--report-progress', progressValue);
      indicator.style.transition = reducedMotion.matches ? 'none' : '';
      progressFill.style.transition = reducedMotion.matches ? 'none' : '';
    };

    const setCurrent = (link, current) => {
      if (current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    };

    const closeProgressMenu = ({ restoreFocus = false } = {}) => {
      progressMenu.hidden = true;
      progressToggle.setAttribute('aria-expanded', 'false');
      progress.classList.remove('is-menu-open');
      if (restoreFocus) progressToggle.focus();
    };

    const syncIndicator = () => {
      if (activeIndex < 0 || window.innerWidth <= 820) {
        indicator.classList.remove('is-visible');
        return;
      }
      const item = tocLinks[activeIndex]?.closest('li');
      if (!(item instanceof HTMLLIElement)) return;
      indicatorY = `${item.offsetTop}px`;
      indicatorHeight = `${item.offsetHeight}px`;
      syncDynamicStyles();
      indicator.classList.add('is-visible');
    };

    const setDirectionalLink = (link, index, label) => {
      const available = index >= 0 && index < sections.length;
      link.classList.toggle('is-disabled', !available);
      link.setAttribute('aria-disabled', String(!available));
      if (!available) {
        link.removeAttribute('href');
        link.tabIndex = -1;
        return;
      }
      link.href = `#${sections[index].id}`;
      link.tabIndex = 0;
      link.setAttribute('aria-label', `${label}: ${tocLinks[index].textContent.trim()}`);
    };

    const setActiveSection = (index, { updateHash = true } = {}) => {
      if (index < -1 || index >= sections.length) return;
      const changed = index !== activeIndex;
      activeIndex = index;

      tocLinks.forEach((link, linkIndex) => {
        const current = linkIndex === activeIndex;
        setCurrent(link, current);
        link.closest('li')?.classList.toggle('is-active', current);
        link.closest('li')?.classList.toggle('is-complete', activeIndex >= 0 && linkIndex < activeIndex);
      });
      compactLinks.forEach((link, linkIndex) => setCurrent(link, linkIndex === activeIndex));

      if (activeIndex >= 0) {
        const count = String(activeIndex + 1).padStart(2, '0');
        progressCounter.textContent = `${count} / ${String(sections.length).padStart(2, '0')}`;
        progressTitle.textContent = tocLinks[activeIndex].textContent.trim();
        progressValue = `${((activeIndex + 1) / sections.length) * 100}%`;
        setDirectionalLink(progressPrevious, activeIndex - 1, 'Previous section');
        setDirectionalLink(progressNext, activeIndex + 1, 'Next section');
        if (updateHash && changed && window.location.hash !== `#${sections[activeIndex].id}`) {
          history.replaceState(null, '', `#${sections[activeIndex].id}`);
        }
      } else {
        progressCounter.textContent = `00 / ${String(sections.length).padStart(2, '0')}`;
        progressTitle.textContent = 'Report contents';
        progressValue = '0%';
        setDirectionalLink(progressPrevious, -1, 'Previous section');
        setDirectionalLink(progressNext, 0, 'Next section');
      }

      syncDynamicStyles();
      requestAnimationFrame(syncIndicator);
    };

    const calculateActiveSection = () => {
      if (navigationTarget >= 0) {
        setActiveSection(navigationTarget);
        return;
      }

      const readingLine = headerHeight() + Math.min(180, window.innerHeight * 0.28);
      let index = -1;
      sections.forEach((section, sectionIndex) => {
        if (section.getBoundingClientRect().top <= readingLine) index = sectionIndex;
      });
      if (index < 0 && activeIndex >= 0) index = activeIndex;
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
        index = sections.length - 1;
      }
      setActiveSection(index);
    };

    const scheduleActiveSection = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        calculateActiveSection();
      });
    };

    const rebuildObserver = () => {
      observer?.disconnect();
      const topMargin = Math.round(headerHeight() + Math.min(180, window.innerHeight * 0.28));
      const bottomMargin = Math.round(window.innerHeight * 0.55);
      observer = new IntersectionObserver(scheduleActiveSection, {
        rootMargin: `-${topMargin}px 0px -${bottomMargin}px 0px`,
        threshold: [0, 1],
      });
      sections.forEach((section) => observer.observe(section));
      scheduleActiveSection();
    };

    const releaseNavigationTarget = () => {
      navigationTarget = -1;
      scheduleActiveSection();
    };

    const scrollToSection = (index) => {
      const section = sections[index];
      if (!(section instanceof HTMLElement)) return;
      closeProgressMenu();
      navigationTarget = index;
      clearTimeout(navigationTargetTimer);
      setActiveSection(index);
      section.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      navigationTargetTimer = setTimeout(releaseNavigationTarget, reducedMotion.matches ? 500 : 1100);
    };

    tocLinks.forEach((link, index) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        scrollToSection(index);
      });
    });
    compactLinks.forEach((link, index) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        scrollToSection(index);
      });
    });
    [progressPrevious, progressNext].forEach((link) => {
      link.addEventListener('click', (event) => {
        if (link.getAttribute('aria-disabled') === 'true') {
          event.preventDefault();
          return;
        }
        const index = sections.findIndex((section) => `#${section.id}` === link.hash);
        if (index >= 0) {
          event.preventDefault();
          scrollToSection(index);
        }
      });
    });

    progressToggle.addEventListener('click', () => {
      const opening = progressMenu.hidden;
      progressMenu.hidden = !opening;
      progressToggle.setAttribute('aria-expanded', String(opening));
      progress.classList.toggle('is-menu-open', opening);
      if (opening) compactLinks[Math.max(activeIndex, 0)]?.focus();
    });

    document.addEventListener('click', (event) => {
      if (!progressMenu.hidden && event.target instanceof Node && !progress.contains(event.target)) {
        closeProgressMenu();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !progressMenu.hidden) {
        event.preventDefault();
        closeProgressMenu({ restoreFocus: true });
      }
    });

    progress.hidden = false;
    syncDynamicStyles();
    reducedMotion.addEventListener('change', syncDynamicStyles);
    window.addEventListener('scroll', scheduleActiveSection, { passive: true });
    window.addEventListener('resize', rebuildObserver);
    document.fonts?.ready.then(() => {
      rebuildObserver();
      syncIndicator();
    });
    rebuildObserver();
  }
}
