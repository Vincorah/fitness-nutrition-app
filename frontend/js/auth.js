/**
 * Authentication JavaScript
 * Login, Register, and Auth-related functions
 */

// Handle Login Form
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    clearAlert();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Validation
    if (!email || !password) {
        showAlert('Please enter both email and password', 'error');
        return;
    }

    // Show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        // Store token and user data
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        showAlert('Login successful! Redirecting...', 'success');

        // Redirect based on role
        setTimeout(() => {
            if (data.data.user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        }, 1000);

    } catch (error) {
        showAlert(error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Login';
    }
}

// Handle Register
async function handleRegister(e) {
    e.preventDefault();
    clearAlert();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Validation
    if (!firstName || !lastName || !email || !password) {
        showAlert('Please fill in all fields', 'error');
        return;
    }

    if (password.length < 8) {
        showAlert('Password must be at least 8 characters long', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }

    // Password strength check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(password)) {
        showAlert('Password must contain at least one uppercase letter, one lowercase letter, and one number', 'error');
        return;
    }

    // Show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ firstName, lastName, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        // Store token and user data
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        showAlert('Account created successfully! Redirecting...', 'success');

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        showAlert(error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Account';
    }
}

// Check if user is authenticated (for protected pages)
function requireAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Check if user is admin (for admin pages)
function requireAdmin() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
}

// Get current user
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user') || '{}');
}

// Get auth token
function getToken() {
    return localStorage.getItem('token');
}

// Update user data in localStorage
function updateUserData(updates) {
    const user = getCurrentUser();
    const updatedUser = { ...user, ...updates };
    localStorage.setItem('user', JSON.stringify(updatedUser));
}

// Export functions
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.requireAuth = requireAuth;
window.requireAdmin = requireAdmin;
window.getCurrentUser = getCurrentUser;
window.getToken = getToken;
window.updateUserData = updateUserData;
