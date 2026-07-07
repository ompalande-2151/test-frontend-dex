// Dark/light theme toggle shared across all docs pages.
// The inline anti-flash script in <head> already applies the saved theme
// before first paint; this file only wires up the toggle button.
(function() {
  const STORAGE_KEY = 'rapidex-theme';

  function applyLogos(theme) {
    document.querySelectorAll('.brand-logo').forEach((img) => {
      const dark = img.getAttribute('data-src-dark');
      const light = img.getAttribute('data-src-light');
      if (!dark || !light) return;
      img.src = theme === 'light' ? light : dark;
    });
  }

  function setTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    applyLogos(theme);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    applyLogos(current);

    document.querySelectorAll('.theme-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        setTheme(next);
      });
    });
  });
})();
