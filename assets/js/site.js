(() => {
  "use strict";

  const root = document.documentElement;
  const validTheme = value => value === "light" || value === "dark";
  const systemTheme = () =>
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  const readLocalTheme = () => {
    try {
      const value = localStorage.getItem("theme");
      return validTheme(value) ? value : null;
    } catch (_) {
      return null;
    }
  };

  const readCookieTheme = () => {
    if (window.location.protocol === "file:") return null;
    const match = document.cookie.match(/(?:^|;\s*)theme=(light|dark)(?:;|$)/);
    return match ? match[1] : null;
  };

  const readUrlTheme = () => {
    try {
      const value = new URLSearchParams(window.location.search).get("theme");
      return validTheme(value) ? value : null;
    } catch (_) {
      return null;
    }
  };

  const saveTheme = theme => {
    try {
      localStorage.setItem("theme", theme);
    } catch (_) {}

    if (window.location.protocol !== "file:") {
      document.cookie = `theme=${theme}; path=/; max-age=315360000; SameSite=Lax`;
    }
  };

  const applyTheme = theme => {
    root.dataset.theme = theme;
  };

  // For normal web hosting, localStorage/cookie keeps the theme across pages.
  // For direct file:// previews, browsers may isolate storage per local file,
  // so the current theme is also carried through internal links.
  const syncLocalFileLinks = theme => {
    if (window.location.protocol !== "file:") return;

    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (link.target === "_blank") return;

      try {
        const url = new URL(href, window.location.href);
        if (url.protocol !== "file:") return;
        url.searchParams.set("theme", theme);
        link.href = url.href;
      } catch (_) {}
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    const themeButton = document.querySelector("[data-theme-toggle]");
    const menuButton = document.querySelector("[data-menu-toggle]");
    const menu = document.querySelector("[data-menu]");

    // URL theme is used mainly for file:// navigation. If present, save it
    // for this page too; otherwise use the stored preference or system theme.
    const urlTheme = readUrlTheme();
    const storedTheme = readLocalTheme() || readCookieTheme();
    let explicitTheme = urlTheme || storedTheme;
    const initialTheme = explicitTheme || systemTheme();

    applyTheme(initialTheme);
    if (urlTheme) saveTheme(urlTheme);
    syncLocalFileLinks(initialTheme);

    const updateThemeLabel = () => {
      if (!themeButton) return;
      const dark = root.dataset.theme === "dark";
      const label = dark ? "Switch to light theme" : "Switch to dark theme";
      themeButton.setAttribute("aria-label", label);
      themeButton.title = label;
    };

    if (themeButton) {
      themeButton.addEventListener("click", () => {
        const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
        explicitTheme = nextTheme;
        applyTheme(nextTheme);
        saveTheme(nextTheme);
        syncLocalFileLinks(nextTheme);
        updateThemeLabel();
      });
    }

    if (menuButton && menu) {
      menuButton.addEventListener("click", () => {
        const open = menuButton.getAttribute("aria-expanded") !== "true";
        menuButton.setAttribute("aria-expanded", String(open));
        menu.classList.toggle("is-open", open);
      });

      document.addEventListener("click", event => {
        if (!menu.contains(event.target) && !menuButton.contains(event.target)) {
          menuButton.setAttribute("aria-expanded", "false");
          menu.classList.remove("is-open");
        }
      });
    }

    // Follow a later OS theme change only while the user has never chosen
    // an explicit light/dark preference.
    if (window.matchMedia) {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const onSystemThemeChange = event => {
        if (explicitTheme || readLocalTheme() || readCookieTheme() || readUrlTheme()) return;
        const nextTheme = event.matches ? "dark" : "light";
        applyTheme(nextTheme);
        syncLocalFileLinks(nextTheme);
        updateThemeLabel();
      };

      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", onSystemThemeChange);
      } else if (typeof media.addListener === "function") {
        media.addListener(onSystemThemeChange);
      }
    }

    updateThemeLabel();
  });
})();
