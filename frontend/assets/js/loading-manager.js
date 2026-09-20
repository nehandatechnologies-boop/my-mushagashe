/**
 * Loading States Manager
 * Provides skeleton loaders and loading indicators for better UX
 */

class LoadingManager {
  constructor() {
    this.init();
  }

  init() {
    // Auto-initialize loading states for elements with data-loading attribute
    this.initializeLoadingStates();
  }

  initializeLoadingStates() {
    const loadingElements = document.querySelectorAll('[data-loading]');
    loadingElements.forEach(element => {
      this.showLoading(element);
    });
  }

  showLoading(element, type = 'default') {
    const loader = this.createLoader(type);
    element.innerHTML = '';
    element.appendChild(loader);
    element.classList.add('is-loading');
  }

  hideLoading(element, content = null) {
    element.classList.remove('is-loading');
    if (content) {
      element.innerHTML = content;
    }
  }

  createLoader(type) {
    const loader = document.createElement('div');
    loader.className = 'loading-indicator';

    switch (type) {
      case 'skeleton-card':
        loader.innerHTML = this.getSkeletonCard();
        break;
      case 'skeleton-table':
        loader.innerHTML = this.getSkeletonTable();
        break;
      case 'skeleton-text':
        loader.innerHTML = this.getSkeletonText();
        break;
      case 'spinner':
        loader.innerHTML = this.getSpinner();
        break;
      default:
        loader.innerHTML = this.getSpinner();
    }

    return loader;
  }

  getSkeletonCard() {
    return `
      <div class="skeleton-card">
        <div class="skeleton-header"></div>
        <div class="skeleton-body">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    `;
  }

  getSkeletonTable() {
    return `
      <div class="skeleton-table">
        <div class="skeleton-table-header">
          <div class="skeleton-th"></div>
          <div class="skeleton-th"></div>
          <div class="skeleton-th"></div>
          <div class="skeleton-th"></div>
        </div>
        <div class="skeleton-table-body">
          ${Array(5).fill('<div class="skeleton-table-row"><div class="skeleton-td"></div><div class="skeleton-td"></div><div class="skeleton-td"></div><div class="skeleton-td"></div></div>').join('')}
        </div>
      </div>
    `;
  }

  getSkeletonText() {
    return `
      <div class="skeleton-text">
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    `;
  }

  getSpinner() {
    return `
      <div class="spinner-container">
        <div class="spinner"></div>
        <p class="loading-text">Loading...</p>
      </div>
    `;
  }

  // Helper for async operations
  async withLoading(element, asyncOperation, type = 'default') {
    this.showLoading(element, type);
    try {
      const result = await asyncOperation();
      return result;
    } finally {
      this.hideLoading(element);
    }
  }
}

// CSS for loading states
const loadingStyles = `
  .loading-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .spinner-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--gray-200);
    border-top-color: var(--primary-600);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-text {
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }

  /* Skeleton Loaders */
  .skeleton {
    background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-md);
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .skeleton-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    width: 100%;
  }

  .skeleton-header {
    height: 24px;
    width: 60%;
    margin-bottom: var(--space-4);
  }

  .skeleton-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .skeleton-line {
    height: 16px;
    width: 100%;
  }

  .skeleton-line.short {
    width: 40%;
  }

  .skeleton-table {
    width: 100%;
  }

  .skeleton-table-header {
    display: flex;
    gap: var(--space-4);
    padding: var(--space-4);
    border-bottom: 1px solid var(--border);
  }

  .skeleton-th {
    height: 20px;
    flex: 1;
  }

  .skeleton-table-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-4);
  }

  .skeleton-table-row {
    display: flex;
    gap: var(--space-4);
  }

  .skeleton-td {
    height: 16px;
    flex: 1;
  }

  .skeleton-text {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-4);
  }

  .is-loading {
    pointer-events: none;
    opacity: 0.7;
  }
`;

// Inject loading styles
const styleSheet = document.createElement('style');
styleSheet.textContent = loadingStyles;
document.head.appendChild(styleSheet);

// Initialize loading manager
document.addEventListener('DOMContentLoaded', () => {
  window.loadingManager = new LoadingManager();
});
