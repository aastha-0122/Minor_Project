/**
 * MediTrack - Authentication & Session Management
 */

const auth = {
  // Check if user is currently authenticated
  isAuthenticated() {
    return localStorage.getItem(CONFIG.CURRENT_USER_KEY) !== null || 
           sessionStorage.getItem(CONFIG.CURRENT_USER_KEY) !== null;
  },

  // Get current user object
  getUser() {
    const stored = localStorage.getItem(CONFIG.CURRENT_USER_KEY) || 
                   sessionStorage.getItem(CONFIG.CURRENT_USER_KEY);
    if (!stored) {
      // Default fallback for previewing if direct file access
      return {
        id: "USR-01",
        name: "Dr. Rajesh Sharma",
        email: "dr.sharma@meditrack.org",
        role: "Admin",
        pharmacy: "Central Hospital Pharmacy"
      };
    }
    try {
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  },

  // Perform Login
  async login(email, password, rememberMe = false) {
    if (!CONFIG.USE_MOCK_DATA) {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Login failed');
        }

        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem(CONFIG.CURRENT_USER_KEY, JSON.stringify(data.user));
        storage.setItem(CONFIG.AUTH_TOKEN_KEY, data.token);
        return data.user;
      } catch (e) {
        throw e;
      }
    }

    // Mock Login Authentication
    const users = JSON.parse(localStorage.getItem('meditrack_users') || '[]');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      throw new Error("No account found with this email address.");
    }

    if (user.status !== 'Active') {
      throw new Error("This account is currently deactivated. Contact your administrator.");
    }

    // Accept standard passwords for demo
    const validPasswords = ['admin123', 'pharma123', 'staff123', 'password123', 'meditrack2026'];
    if (password.length < 6 && !validPasswords.includes(password)) {
      throw new Error("Invalid password credentials. Please try again.");
    }

    // Save session
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(CONFIG.CURRENT_USER_KEY, JSON.stringify(user));
    storage.setItem(CONFIG.AUTH_TOKEN_KEY, 'mock-jwt-token-' + Date.now());

    return user;
  },

  // Logout current user
  logout() {
    localStorage.removeItem(CONFIG.CURRENT_USER_KEY);
    localStorage.removeItem(CONFIG.AUTH_TOKEN_KEY);
    sessionStorage.removeItem(CONFIG.CURRENT_USER_KEY);
    sessionStorage.removeItem(CONFIG.AUTH_TOKEN_KEY);
    window.location.href = 'login.html';
  },

  // Guard protected pages
  guardPage() {
    const isLoginPage = window.location.pathname.endsWith('login.html');
    const isPublicPage = window.location.pathname.endsWith('availability.html') || 
                         window.location.pathname.endsWith('index.html');

    if (!this.isAuthenticated() && !isLoginPage && !isPublicPage) {
      // In standalone demo preview, if not set, auto-initialize demo user so pages don't block
      const defaultUser = {
        id: "USR-01",
        name: "Dr. Rajesh Sharma",
        email: "dr.sharma@meditrack.org",
        role: "Admin",
        pharmacy: "Central Hospital Pharmacy"
      };
      localStorage.setItem(CONFIG.CURRENT_USER_KEY, JSON.stringify(defaultUser));
    }
  },

  // Update profile and header elements
  syncUI() {
    const user = this.getUser();
    if (!user) return;

    document.querySelectorAll('.user-name-display').forEach(el => {
      el.textContent = user.name;
    });

    document.querySelectorAll('.user-role-display').forEach(el => {
      el.textContent = user.role;
    });

    document.querySelectorAll('.user-avatar-initials').forEach(el => {
      const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2);
      el.textContent = initials;
    });

    document.querySelectorAll('.pharmacy-branch-display').forEach(el => {
      el.textContent = user.pharmacy || "Central Hospital Pharmacy";
    });
  }
};

// Auto-run guard and UI sync
document.addEventListener('DOMContentLoaded', () => {
  auth.guardPage();
  auth.syncUI();

  // Attach logout handlers
  document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showConfirm("Log Out", "Are you sure you want to end your current session?", () => {
        auth.logout();
      });
    });
  });
});
