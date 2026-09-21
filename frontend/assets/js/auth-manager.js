/**
 * Authentication Manager
 * Handles proper JWT session persistence, token validation, and user session restoration
 */

class AuthenticationManager {
  constructor() {
    this.STORAGE_KEYS = {
      TOKEN: 'token',
      USER: 'user',
      PERMISSIONS: 'permissions',
      SESSION_START: 'session_start'
    };
    this.currentUser = null;
    this.currentToken = null;
    this.isAuthenticated = false;
    this.init();
  }

  init() {
    // Restore session on page load
    this.restoreSession();

    // Listen for storage changes (sync across tabs)
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEYS.TOKEN || e.key === this.STORAGE_KEYS.USER) {
        this.restoreSession();
      }
    });

    // Listen for visibility changes (validate when tab becomes visible)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isAuthenticated) {
        this.validateSession();
      }
    });
  }

  async restoreSession() {
    const token = localStorage.getItem(this.STORAGE_KEYS.TOKEN);
    const userStr = localStorage.getItem(this.STORAGE_KEYS.USER);
    const permissionsStr = localStorage.getItem(this.STORAGE_KEYS.PERMISSIONS);

    if (!token || !userStr) {
      this.clearSession();
      return false;
    }

    try {
      const user = JSON.parse(userStr);
      const permissions = permissionsStr ? JSON.parse(permissionsStr) : [];

      this.currentToken = token;
      this.currentUser = user;
      this.currentPermissions = permissions;
      this.isAuthenticated = true;

      // Validate token with backend
      const isValid = await this.validateToken(token);

      if (!isValid) {
        this.clearSession();
        return false;
      }

      // Dispatch session restored event
      this.dispatchSessionEvent('sessionRestored', { user, permissions });

      return true;
    } catch (error) {
      console.error('Session restoration error:', error);
      this.clearSession();
      return false;
    }
  }

  async validateToken(token) {
    try {
      const API_BASE = this.getApiBase();
      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return true;
      } else if (response.status === 401) {
        console.warn('Token validation failed: Unauthorized');
        return false;
      } else {
        console.warn('Token validation failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Token validation error:', error);
      // If network error, assume token is still valid (offline mode)
      return true;
    }
  }

  async validateSession() {
    if (!this.isAuthenticated || !this.currentToken) {
      return false;
    }

    const isValid = await this.validateToken(this.currentToken);
    if (!isValid) {
      this.clearSession();
      this.dispatchSessionEvent('sessionExpired');
      return false;
    }

    return true;
  }

  setSession(token, user, permissions = []) {
    this.currentToken = token;
    this.currentUser = user;
    this.currentPermissions = permissions;
    this.isAuthenticated = true;

    // Store in localStorage
    localStorage.setItem(this.STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(this.STORAGE_KEYS.PERMISSIONS, JSON.stringify(permissions));
    localStorage.setItem(this.STORAGE_KEYS.SESSION_START, Date.now().toString());

    // Dispatch session created event
    this.dispatchSessionEvent('sessionCreated', { user, permissions });
  }

  clearSession() {
    this.currentToken = null;
    this.currentUser = null;
    this.currentPermissions = null;
    this.isAuthenticated = false;

    // Clear localStorage
    localStorage.removeItem(this.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(this.STORAGE_KEYS.USER);
    localStorage.removeItem(this.STORAGE_KEYS.PERMISSIONS);
    localStorage.removeItem(this.STORAGE_KEYS.SESSION_START);

    // Dispatch session destroyed event
    this.dispatchSessionEvent('sessionDestroyed');
  }

  getToken() {
    return this.currentToken;
  }

  getUser() {
    return this.currentUser;
  }

  getPermissions() {
    return this.currentPermissions || [];
  }

  isLoggedIn() {
    return this.isAuthenticated;
  }

  hasPermission(permissionName) {
    if (!this.currentUser) return false;

    // Support both legacy 'admin' and new RBAC roles
    const role = this.currentUser.role;
    if (role === 'SUPER_ADMIN' || role === 'super_admin' || role === 'admin') return true;

    return this.currentPermissions.some(p => p.name === permissionName);
  }

  hasRole(roleName) {
    if (!this.currentUser) return false;
    const role = this.currentUser.role;
    return role === roleName || role === roleName.toLowerCase();
  }

  dispatchSessionEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
  }

  getApiBase() {
    const isNgrok = window.location.hostname.includes('ngrok-free.app') || window.location.hostname.includes('ngrok.io');
    const isRender = window.location.hostname.includes('onrender.com');
    const isFly = window.location.hostname.includes('fly.dev');
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isNgrok || isRender || isFly) {
      return '/api';
    } else if (isLocalhost) {
      return 'http://localhost:5000/api';
    } else {
      return '/api';
    }
  }

  // Helper for API requests with automatic authentication
  async authenticatedFetch(endpoint, options = {}) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    const url = `${this.getApiBase()}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${this.currentToken}`,
        'Content-Type': 'application/json'
      }
    };

    // Don't override Content-Type if sending FormData
    if (options.body instanceof FormData) {
      delete defaultOptions.headers['Content-Type'];
    }

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, finalOptions);

      // Handle 401 errors (token expired)
      if (response.status === 401) {
        this.clearSession();
        this.dispatchSessionEvent('sessionExpired');
        throw new Error('Session expired');
      }

      return response;
    } catch (error) {
      console.error('Authenticated fetch error:', error);
      throw error;
    }
  }
}

// Initialize authentication manager
document.addEventListener('DOMContentLoaded', () => {
  window.authManager = new AuthenticationManager();
});
