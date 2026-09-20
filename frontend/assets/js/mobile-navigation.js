/**
 * Mobile Navigation Manager
 * Handles mobile sidebar toggle, overlay interactions, and accessibility
 */

class MobileNavigation {
  constructor() {
    this.sidebar = document.getElementById('sidebar');
    this.menuToggle = document.getElementById('menuToggle');
    this.sidebarOverlay = document.getElementById('sidebarOverlay');
    this.body = document.body;
    this.isOpen = false;

    this.init();
  }

  init() {
    if (!this.sidebar || !this.menuToggle || !this.sidebarOverlay) {
      console.warn('Mobile navigation elements not found');
      return;
    }

    // Toggle sidebar on menu button click
    this.menuToggle.addEventListener('click', () => this.toggle());

    // Close sidebar on overlay click
    this.sidebarOverlay.addEventListener('click', () => this.close());

    // Close sidebar on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Close sidebar when clicking a nav item
    const navItems = this.sidebar.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          this.close();
        }
      });
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024 && this.isOpen) {
        this.close();
      }
    });
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    this.sidebar.classList.add('open');
    this.sidebarOverlay.classList.add('show');
    this.body.classList.add('sidebar-open');

    // Trap focus inside sidebar for accessibility
    this.trapFocus();

    // Announce to screen readers
    this.announce('Sidebar opened');
  }

  close() {
    this.isOpen = false;
    this.sidebar.classList.remove('open');
    this.sidebarOverlay.classList.remove('show');
    this.body.classList.remove('sidebar-open');

    // Return focus to menu toggle
    this.menuToggle.focus();

    // Announce to screen readers
    this.announce('Sidebar closed');
  }

  trapFocus() {
    const focusableElements = this.sidebar.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    this.sidebar.addEventListener('keydown', (e) => {
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
    }, { once: true });
  }

  announce(message) {
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
}

// Initialize mobile navigation
document.addEventListener('DOMContentLoaded', () => {
  window.mobileNavigation = new MobileNavigation();
});
