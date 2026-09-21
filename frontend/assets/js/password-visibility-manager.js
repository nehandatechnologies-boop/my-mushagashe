/**
 * Password Visibility Manager
 * Handles show/hide password functionality across all password fields
 */

class PasswordVisibilityManager {
  constructor() {
    this.init();
  }

  init() {
    // Auto-initialize all password fields with toggle buttons
    this.initializePasswordToggles();

    // Listen for dynamically added password fields
    this.observeDynamicPasswords();
  }

  initializePasswordToggles() {
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
      this.addToggleToPassword(input);
    });
  }

  addToggleToPassword(passwordInput) {
    // Check if toggle already exists
    if (passwordInput.nextElementSibling && passwordInput.nextElementSibling.classList.contains('password-toggle')) {
      return;
    }

    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'password-toggle';
    toggleButton.setAttribute('aria-label', 'Toggle password visibility');
    toggleButton.setAttribute('tabindex', '0');
    toggleButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;

    // Add click handler
    toggleButton.addEventListener('click', () => {
      this.togglePasswordVisibility(passwordInput, toggleButton);
    });

    // Insert after password input
    passwordInput.parentNode.insertBefore(toggleButton, passwordInput.nextSibling);
  }

  togglePasswordVisibility(passwordInput, toggleButton) {
    const icon = toggleButton.querySelector('svg');

    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      toggleButton.setAttribute('aria-label', 'Hide password');
      icon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
    } else {
      passwordInput.type = 'password';
      toggleButton.setAttribute('aria-label', 'Show password');
      icon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
    }
  }

  observeDynamicPasswords() {
    // Use MutationObserver to detect dynamically added password fields
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Check if the added node is a password input
            if (node.tagName === 'INPUT' && node.type === 'password') {
              this.addToggleToPassword(node);
            }
            // Check if the added node contains password inputs
            const passwordInputs = node.querySelectorAll('input[type="password"]');
            passwordInputs.forEach(input => {
              this.addToggleToPassword(input);
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// CSS for password toggles
const passwordStyles = `
  .password-toggle {
    position: absolute;
    right: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-tertiary);
    transition: color var(--transition-base);
    padding: var(--space-1);
    border-radius: var(--radius-md);
  }

  .password-toggle:hover {
    color: var(--text-primary);
    background: var(--gray-100);
  }

  .password-toggle:focus {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
  }

  .password-toggle:active {
    transform: translateY(-50%) scale(0.95);
  }

  /* Ensure password input has proper positioning */
  input[type="password"] {
    padding-right: var(--space-10);
  }

  /* Style adjustment for password containers */
  .form-group {
    position: relative;
  }
`;

// Inject password styles
(function() {
  const passwordStyleSheet = document.createElement('style');
  passwordStyleSheet.textContent = passwordStyles;
  document.head.appendChild(passwordStyleSheet);
})();

// Initialize password visibility manager
document.addEventListener('DOMContentLoaded', () => {
  window.passwordVisibilityManager = new PasswordVisibilityManager();
});
