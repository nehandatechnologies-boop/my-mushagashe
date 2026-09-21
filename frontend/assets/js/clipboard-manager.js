/**
 * Copy to Clipboard Manager
 * Handles copying text to clipboard with visual feedback
 */

class ClipboardManager {
  constructor() {
    this.init();
  }

  init() {
    // Initialize all elements with data-copy attribute
    this.initializeCopyButtons();

    // Listen for dynamically added copy buttons
    this.observeDynamicCopyButtons();
  }

  initializeCopyButtons() {
    const copyElements = document.querySelectorAll('[data-copy]');
    copyElements.forEach(element => {
      this.addCopyFunctionality(element);
    });
  }

  addCopyFunctionality(element) {
    const textToCopy = element.getAttribute('data-copy');

    // Make element clickable
    element.style.cursor = 'pointer';
    element.classList.add('copy-enabled');

    // Add click handler
    element.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.copyToClipboard(textToCopy, element);
    });

    // Add keyboard support
    element.setAttribute('role', 'button');
    element.setAttribute('tabindex', '0');
    element.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        await this.copyToClipboard(textToCopy, element);
      }
    });
  }

  async copyToClipboard(text, element) {
    try {
      await navigator.clipboard.writeText(text);
      this.showSuccessFeedback(element);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      this.fallbackCopy(text, element);
    }
  }

  fallbackCopy(text, element) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      this.showSuccessFeedback(element);
    } catch (error) {
      console.error('Fallback copy failed:', error);
      this.showErrorFeedback(element);
    }

    document.body.removeChild(textArea);
  }

  showSuccessFeedback(element) {
    const originalText = element.textContent;
    const originalTitle = element.getAttribute('title');

    // Add success class
    element.classList.add('copy-success');

    // Update text temporarily
    element.textContent = 'Copied!';
    element.setAttribute('title', 'Copied to clipboard');

    // Revert after delay
    setTimeout(() => {
      element.textContent = originalText;
      element.setAttribute('title', originalTitle || '');
      element.classList.remove('copy-success');
    }, 2000);
  }

  showErrorFeedback(element) {
    const originalText = element.textContent;
    const originalTitle = element.getAttribute('title');

    // Add error class
    element.classList.add('copy-error');

    // Update text temporarily
    element.textContent = 'Failed to copy';
    element.setAttribute('title', 'Failed to copy to clipboard');

    // Revert after delay
    setTimeout(() => {
      element.textContent = originalText;
      element.setAttribute('title', originalTitle || '');
      element.classList.remove('copy-error');
    }, 2000);
  }

  observeDynamicCopyButtons() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.hasAttribute && node.hasAttribute('data-copy')) {
              this.addCopyFunctionality(node);
            }
            const copyElements = node.querySelectorAll('[data-copy]');
            copyElements.forEach(el => {
              this.addCopyFunctionality(el);
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

// CSS for clipboard functionality
const clipboardStyles = `
  .copy-enabled {
    position: relative;
  }

  .copy-enabled:hover {
    color: var(--primary-600);
  }

  .copy-enabled:focus {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
  }

  .copy-success {
    color: var(--success-600) !important;
  }

  .copy-error {
    color: var(--danger-600) !important;
  }

  .copy-enabled::after {
    content: '📋';
    position: absolute;
    right: -24px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0;
    transition: opacity var(--transition-base);
    font-size: 12px;
  }

  .copy-enabled:hover::after {
    opacity: 1;
  }
`;

// Inject clipboard styles
(function() {
  const clipboardStyleSheet = document.createElement('style');
  clipboardStyleSheet.textContent = clipboardStyles;
  document.head.appendChild(clipboardStyleSheet);
})();

// Initialize clipboard manager
document.addEventListener('DOMContentLoaded', () => {
  window.clipboardManager = new ClipboardManager();
});
