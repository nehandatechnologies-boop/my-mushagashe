/**
 * Accessibility Manager
 * Handles skip links, ARIA attributes, focus management, and screen reader support
 */

class AccessibilityManager {
  constructor() {
    this.init();
  }

  init() {
    this.addSkipLink();
    this.manageFocus();
    this.handleModals();
    this.announcePageChanges();
  }

  addSkipLink() {
    // Add skip to main content link if it doesn't exist
    if (!document.querySelector('.skip-link')) {
      const skipLink = document.createElement('a');
      skipLink.href = '#main-content';
      skipLink.className = 'skip-link';
      skipLink.textContent = 'Skip to main content';
      document.body.insertBefore(skipLink, document.body.firstChild);

      // Add id to main content if it doesn't exist
      const mainContent = document.querySelector('.main-content, .page-content, main');
      if (mainContent && !mainContent.id) {
        mainContent.id = 'main-content';
      }
    }
  }

  manageFocus() {
    // Handle focus management for interactive elements
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');

    interactiveElements.forEach(element => {
      // Ensure keyboard accessibility
      if (element.tagName === 'BUTTON' && !element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }

      // Add proper focus styles
      element.addEventListener('focus', () => {
        element.classList.add('focus-visible');
      });

      element.addEventListener('blur', () => {
        element.classList.remove('focus-visible');
      });
    });
  }

  handleModals() {
    // Focus trap for modals
    const modals = document.querySelectorAll('[role="dialog"], .modal');

    modals.forEach(modal => {
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        modal.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            if (e.shiftKey) {
              if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
              }
            } else {
              if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
              }
            }
          }
        });
      }
    });
  }

  announcePageChanges() {
    // Announce dynamic content changes to screen readers
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              // Check if it's important content
              if (node.classList.contains('toast') ||
                  node.classList.contains('notification') ||
                  node.classList.contains('error-message') ||
                  node.classList.contains('success-message')) {
                this.announceToScreenReader(node.textContent);
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Helper to set ARIA attributes dynamically
  setAria(element, attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(`aria-${key}`, value);
    });
  }

  // Helper to remove ARIA attributes
  removeAria(element, attributes) {
    attributes.forEach(attr => {
      element.removeAttribute(`aria-${attr}`);
    });
  }
}

// CSS for accessibility
const accessibilityStyles = `
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--primary-600);
    color: white;
    padding: 8px 16px;
    z-index: 10000;
    text-decoration: none;
    transition: top 0.3s;
  }

  .skip-link:focus {
    top: 0;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  .focus-visible {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
  }

  /* Ensure sufficient color contrast */
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
`;

// Inject accessibility styles
(function() {
  const accessibilityStyleSheet = document.createElement('style');
  accessibilityStyleSheet.textContent = accessibilityStyles;
  document.head.appendChild(accessibilityStyleSheet);
})();

// Initialize accessibility manager
document.addEventListener('DOMContentLoaded', () => {
  window.accessibilityManager = new AccessibilityManager();
});
