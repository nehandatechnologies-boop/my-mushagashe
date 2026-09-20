/**
 * Theme Manager - Dark/Light Mode System
 * Handles theme switching, persistence, and system preference detection
 */

class ThemeManager {
  constructor() {
    this.STORAGE_KEY = 'mushagashe-theme';
    this.THEME_DARK = 'dark';
    this.THEME_LIGHT = 'light';
    this.currentTheme = this.loadTheme();
    this.init();
  }

  init() {
    // Apply saved theme or system preference
    this.applyTheme(this.currentTheme);

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        this.currentTheme = e.matches ? this.THEME_DARK : this.THEME_LIGHT;
        this.applyTheme(this.currentTheme);
      }
    });

    // Prevent flash of wrong theme
    document.documentElement.style.display = 'none';
    setTimeout(() => {
      document.documentElement.style.display = '';
    }, 0);
  }

  loadTheme() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      return saved;
    }

    // Use system preference as default
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? this.THEME_DARK
      : this.THEME_LIGHT;
  }

  saveTheme(theme) {
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    this.saveTheme(theme);

    // Update theme toggle button if it exists
    const toggleButton = document.querySelector('[data-theme-toggle]');
    if (toggleButton) {
      this.updateToggleButton(toggleButton);
    }

    // Dispatch custom event for other components
    document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
  }

  toggleTheme() {
    const newTheme = this.currentTheme === this.THEME_DARK
      ? this.THEME_LIGHT
      : this.THEME_DARK;
    this.applyTheme(newTheme);
  }

  getTheme() {
    return this.currentTheme;
  }

  isDark() {
    return this.currentTheme === this.THEME_DARK;
  }

  updateToggleButton(button) {
    const icon = button.querySelector('[data-theme-icon]');
    if (icon) {
      icon.textContent = this.isDark() ? '☀️' : '🌙';
    }

    const label = button.querySelector('[data-theme-label]');
    if (label) {
      label.textContent = this.isDark() ? 'Switch to Light' : 'Switch to Dark';
    }
  }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Make it available globally
window.themeManager = themeManager;

// Add event listener for theme toggle buttons
document.addEventListener('DOMContentLoaded', () => {
  const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
  toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      themeManager.toggleTheme();
    });

    // Initialize button state
    themeManager.updateToggleButton(button);
  });
});
