(() => {
  const preferenceKey = "jl-theme-preference";
  const allowed = new Set(["system", "light", "dark"]);
  const root = document.documentElement;

  const readCookie = () => {
    const match = document.cookie.match(/(?:^|;\s*)jl_theme=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  let preference = readCookie();
  if (!allowed.has(preference)) {
    try {
      preference = localStorage.getItem(preferenceKey);
    } catch {
      preference = null;
    }
  }
  if (!allowed.has(preference)) preference = "system";

  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const resolved = preference === "system" ? (systemDark ? "dark" : "light") : preference;
  root.dataset.themePreference = preference;
  root.dataset.theme = resolved;
})();
