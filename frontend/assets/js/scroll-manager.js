/**
 * Scroll Progress Manager
 * Handles scroll progress indicator and back-to-top button
 */

class ScrollManager {
  constructor() {
    this.scrollProgress = null;
    this.backToTopButton = null;
    this.init();
  }

  init() {
    // Create scroll progress bar
    this.createScrollProgress();

    // Create back-to-top button
    this.createBackToTopButton();

    // Add scroll event listener
    window.addEventListener('scroll', () => this.handleScroll());
  }

  createScrollProgress() {
    if (document.querySelector('.scroll-progress')) {
      this.scrollProgress = document.querySelector('.scroll-progress');
      return;
    }

    this.scrollProgress = document.createElement('div');
    this.scrollProgress.className = 'scroll-progress';
    document.body.appendChild(this.scrollProgress);
  }

  createBackToTopButton() {
    if (document.querySelector('.back-to-top')) {
      this.backToTopButton = document.querySelector('.back-to-top');
      return;
    }

    this.backToTopButton = document.createElement('button');
    this.backToTopButton.className = 'back-to-top';
    this.backToTopButton.setAttribute('aria-label', 'Back to top');
    this.backToTopButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 19V5"></path>
        <path d="M5 12l7 7 7-7"></path>
      </svg>
    `;
    this.backToTopButton.addEventListener('click', () => this.scrollToTop());
    document.body.appendChild(this.backToTopButton);
  }

  handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercent = (scrollTop / scrollHeight) * 100;

    // Update scroll progress bar
    if (this.scrollProgress) {
      this.scrollProgress.style.width = `${scrollPercent}%`;
    }

    // Show/hide back-to-top button
    if (this.backToTopButton) {
      if (scrollTop > 300) {
        this.backToTopButton.classList.add('visible');
      } else {
        this.backToTopButton.classList.remove('visible');
      }

      // Update header scroll state
      const header = document.querySelector('.app-header');
      if (header) {
        if (scrollTop > 50) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }
    }
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}

// CSS for scroll progress and back-to-top
const scrollStyles = `
  .scroll-progress {
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--primary-600), var(--accent-600));
    width: 0%;
    z-index: var(--z-fixed);
    transition: width var(--transition-base);
  }

  .back-to-top {
    position: fixed;
    bottom: var(--space-6);
    right: var(--space-6);
    width: 48px;
    height: 48px;
    border-radius: var(--radius-full);
    background: var(--primary-600);
    color: var(--text-inverse);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    transform: translateY(20px);
    transition: all var(--transition-base);
    z-index: var(--z-fixed);
    box-shadow: var(--shadow-lg);
  }

  .back-to-top.visible {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .back-to-top:hover {
    background: var(--primary-700);
    transform: translateY(-2px);
  }

  .back-to-top:focus {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .back-to-top {
      transition: none;
    }

    .back-to-top:hover {
      transform: none;
    }
  }
`;

// Inject scroll styles
(function() {
  const scrollStyleSheet = document.createElement('style');
  scrollStyleSheet.textContent = scrollStyles;
  document.head.appendChild(scrollStyleSheet);
})();

// Initialize scroll manager
document.addEventListener('DOMContentLoaded', () => {
  window.scrollManager = new ScrollManager();
});
