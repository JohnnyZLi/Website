export const THEME_PREFERENCES = Object.freeze(["system", "light", "dark"]);
const STORAGE_KEY = "jl-theme-preference";
const COOKIE_NAME = "jl_theme";

function isPreference(value) {
  return THEME_PREFERENCES.includes(value);
}

function readCookie(document) {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function readPreference(window) {
  const cookie = readCookie(window.document);
  if (isPreference(cookie)) return cookie;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isPreference(stored)) return stored;
  } catch {
    // Storage can be blocked; system remains a safe fallback.
  }
  return "system";
}

function resolvePreference(window, preference) {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function persistPreference(window, preference) {
  try {
    window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Cookie persistence still covers normal hosted use.
  }

  const hostname = window.location.hostname;
  const domain = hostname === "johnnyli.dev" || hostname.endsWith(".johnnyli.dev")
    ? "; Domain=.johnnyli.dev"
    : "";
  window.document.cookie = `${COOKIE_NAME}=${encodeURIComponent(preference)}; Path=/; Max-Age=31536000; SameSite=Lax${domain}`;
}

export function installThemeController(options = {}) {
  const window = options.window ?? globalThis.window;
  if (!window?.document) throw new TypeError("Theme controller requires a browser window.");

  const root = window.document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  let preference = isPreference(options.preference) ? options.preference : readPreference(window);
  const listeners = new Set();

  const apply = ({ persist = false } = {}) => {
    const theme = resolvePreference(window, preference);
    root.dataset.themePreference = preference;
    root.dataset.theme = theme;
    if (persist) persistPreference(window, preference);
    const detail = Object.freeze({ preference, theme });
    window.dispatchEvent(new CustomEvent("jlthemechange", { detail }));
    listeners.forEach((listener) => listener(detail));
    return detail;
  };

  const handleSystemChange = () => {
    if (preference === "system") apply();
  };
  media.addEventListener("change", handleSystemChange);
  apply();

  return {
    get preference() {
      return preference;
    },
    get theme() {
      return root.dataset.theme;
    },
    setPreference(nextPreference) {
      if (!isPreference(nextPreference)) throw new TypeError(`Unsupported theme preference: ${nextPreference}`);
      preference = nextPreference;
      return apply({ persist: true });
    },
    subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("Theme listener must be a function.");
      listeners.add(listener);
      listener({ preference, theme: root.dataset.theme });
      return () => listeners.delete(listener);
    },
    destroy() {
      media.removeEventListener("change", handleSystemChange);
      listeners.clear();
    },
  };
}

export function installThemeControl(menu, controller, options = {}) {
  if (!(menu instanceof HTMLElement)) throw new TypeError("Theme control menu must be an HTMLElement.");
  if (!controller?.setPreference || !controller?.subscribe) throw new TypeError("Theme control requires a theme controller.");

  const document = menu.ownerDocument;
  const item = document.createElement("li");
  item.className = "jl-theme-control";
  item.dataset.themeControl = "";

  const label = document.createElement("span");
  label.className = "jl-theme-control__label";
  label.textContent = options.label ?? "Appearance";

  const optionsGroup = document.createElement("div");
  optionsGroup.className = "jl-theme-control__options";
  optionsGroup.setAttribute("role", "group");
  optionsGroup.setAttribute("aria-label", options.label ?? "Appearance");

  const labels = { system: "System", light: "Light", dark: "Dark", ...options.labels };
  const buttons = new Map();
  for (const preference of THEME_PREFERENCES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "jl-theme-control__option";
    button.dataset.themePreference = preference;
    button.textContent = labels[preference];
    button.addEventListener("click", () => controller.setPreference(preference));
    optionsGroup.append(button);
    buttons.set(preference, button);
  }

  item.append(label, optionsGroup);
  menu.append(item);

  const unsubscribe = controller.subscribe(({ preference }) => {
    buttons.forEach((button, value) => button.setAttribute("aria-pressed", String(value === preference)));
  });

  return {
    element: item,
    destroy() {
      unsubscribe();
      item.remove();
    },
  };
}
