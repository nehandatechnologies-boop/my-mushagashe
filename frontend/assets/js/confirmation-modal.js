/**
 * Confirmation Modal Manager
 * Handles reusable confirmation dialogs for destructive actions
 */

class ConfirmationModal {
  constructor() {
    this.modal = null;
    this.init();
  }

  init() {
    this.createModal();
  }

  createModal() {
    if (document.querySelector('.confirmation-modal')) {
      this.modal = document.querySelector('.confirmation-modal');
      return;
    }

    this.modal = document.createElement('div');
    this.modal.className = 'confirmation-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'confirmation-title');
    this.modal.innerHTML = `
      <div class="confirmation-modal-overlay"></div>
      <div class="confirmation-modal-content">
        <div class="confirmation-modal-header">
          <h2 id="confirmation-title">Confirm Action</h2>
          <button class="confirmation-modal-close" aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="confirmation-modal-body">
          <p id="confirmation-message">Are you sure you want to proceed?</p>
        </div>
        <div class="confirmation-modal-footer">
          <button class="btn btn-secondary confirmation-cancel">Cancel</button>
          <button class="btn btn-danger confirmation-confirm">Confirm</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);

    // Add event listeners
    this.modal.querySelector('.confirmation-modal-close').addEventListener('click', () => this.hide());
    this.modal.querySelector('.confirmation-modal-overlay').addEventListener('click', () => this.hide());
    this.modal.querySelector('.confirmation-cancel').addEventListener('click', () => this.hide());

    // Handle Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('show')) {
        this.hide();
      }
    });
  }

  show(options = {}) {
    const {
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      type = 'danger',
      onConfirm = null
    } = options;

    // Update content
    this.modal.querySelector('#confirmation-title').textContent = title;
    this.modal.querySelector('#confirmation-message').textContent = message;
    this.modal.querySelector('.confirmation-confirm').textContent = confirmText;
    this.modal.querySelector('.confirmation-cancel').textContent = cancelText;

    // Update button type
    const confirmBtn = this.modal.querySelector('.confirmation-confirm');
    confirmBtn.className = `btn btn-${type} confirmation-confirm`;

    // Store confirm callback
    this.onConfirm = onConfirm;

    // Add confirm handler
    confirmBtn.onclick = () => {
      if (this.onConfirm) {
        this.onConfirm();
      }
      this.hide();
    };

    // Show modal
    this.modal.classList.add('show');
    document.body.classList.add('modal-open');

    // Focus confirm button
    setTimeout(() => confirmBtn.focus(), 100);
  }

  hide() {
    this.modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    this.onConfirm = null;
  }
}

// CSS for confirmation modal
const modalStyles = `
  .confirmation-modal {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    display: none;
    align-items: center;
    justify-content: center;
  }

  .confirmation-modal.show {
    display: flex;
  }

  .confirmation-modal-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  }

  .confirmation-modal-content {
    position: relative;
    background: var(--surface);
    border-radius: var(--radius-xl);
    max-width: 480px;
    width: 90%;
    max-height: 90vh;
    overflow: auto;
    box-shadow: var(--shadow-xl);
    animation: modalSlideIn 0.3s ease-out;
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .confirmation-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-6);
    border-bottom: 1px solid var(--border);
  }

  .confirmation-modal-header h2 {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
  }

  .confirmation-modal-close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-tertiary);
    padding: var(--space-2);
    border-radius: var(--radius-md);
    transition: all var(--transition-base);
  }

  .confirmation-modal-close:hover {
    color: var(--text-primary);
    background: var(--gray-100);
  }

  .confirmation-modal-body {
    padding: var(--space-6);
  }

  .confirmation-modal-body p {
    margin: 0;
    color: var(--text-secondary);
    line-height: var(--leading-relaxed);
  }

  .confirmation-modal-footer {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
    padding: var(--space-6);
    border-top: 1px solid var(--border);
  }

  .modal-open {
    overflow: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    .confirmation-modal-content {
      animation: none;
    }
  }
`;

// Inject modal styles
(function() {
  const modalStyleSheet = document.createElement('style');
  modalStyleSheet.textContent = modalStyles;
  document.head.appendChild(modalStyleSheet);
})();

// Initialize confirmation modal
document.addEventListener('DOMContentLoaded', () => {
  window.confirmationModal = new ConfirmationModal();
});
