/**
 * Main JavaScript File
 * Shared utilities and initialization
 */

// API Configuration
// Replace 'YOUR_RENDER_BACKEND_URL' with your actual Render deployment URL after deploying
// Example: 'https://fitness-nutrition-backend.onrender.com/api'
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : 'YOUR_RENDER_BACKEND_URL/api';

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    // initNavigation();
    checkAuthStatus();
});

// Navigation Toggle (Mobile)
function toggleMenu() {
    const navMenu = document.getElementById('navMenu');
    if (navMenu) {
        navMenu.classList.toggle('active');
    }
}

// Call The Function
// document.addEventListener('DOMContentLoaded', () => {
//     initNavigation();
// });

// Check Authentication Status
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (token && user) {
        showAuthenticatedUI(user);
    } else {
        showUnauthenticatedUI();
    }
}

// Show UI for authenticated users
function showAuthenticatedUI(user) {
    const navAuth = document.getElementById('navAuth');
    const navUser = document.getElementById('navUser');
    const userName = document.getElementById('userName');
    const dashboardLink = document.getElementById('dashboardLink');
    const healthLink = document.getElementById('healthLink');
    const recsLink = document.getElementById('recsLink');
    const adminLink = document.getElementById('adminLink');

    if (navAuth) navAuth.style.display = 'none';
    if (navUser) {
        navUser.style.display = 'flex';
        userName.textContent = `${user.firstName || ''} ${user.lastName || ''}`;
    }

    // Show protected links
    if (dashboardLink) dashboardLink.style.display = 'inline';
    if (healthLink) healthLink.style.display = 'inline';
    if (recsLink) recsLink.style.display = 'inline';

    // Show admin link only for admins
    if (adminLink && user.role === 'admin') {
        adminLink.style.display = 'inline';
    }
}

// Show UI for unauthenticated users
function showUnauthenticatedUI() {
    const navAuth = document.getElementById('navAuth');
    const navUser = document.getElementById('navUser');
    const dashboardLink = document.getElementById('dashboardLink');
    const healthLink = document.getElementById('healthLink');
    const recsLink = document.getElementById('recsLink');
    const adminLink = document.getElementById('adminLink');

    if (navAuth) navAuth.style.display = 'flex';
    if (navUser) navUser.style.display = 'none';

    // Hide protected links
    if (dashboardLink) dashboardLink.style.display = 'none';
    if (healthLink) healthLink.style.display = 'none';
    if (recsLink) recsLink.style.display = 'none';
    if (adminLink) adminLink.style.display = 'none';
}

// Logout Function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// API Request Helper
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }

    return data;
}

// Show Alert
function showAlert(message, type = 'info', container = null) {
    const alertContainer = container || document.getElementById('alertContainer');

    if (!alertContainer) {
        console.warn('Alert container not found');
        return;
    }

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Clear Alert
function clearAlert(container = null) {
    const alertContainer = container || document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = '';
    }
}

// Format Date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format Number
function formatNumber(num, decimals = 0) {
    if (num === null || num === undefined) return 'N/A';
    return Number(num).toFixed(decimals);
}

// Show Loading Spinner
function showSpinner(container) {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    if (container) {
        container.innerHTML = '<div class="spinner"></div>';
    }
}

// Debounce Function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Validate Email
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Get Activity Level Label
function getActivityLevelLabel(level) {
    const labels = {
        sedentary: 'Sedentary (Little or no exercise)',
        light: 'Lightly Active (1-3 days/week)',
        moderate: 'Moderately Active (3-5 days/week)',
        active: 'Very Active (6-7 days/week)',
        very_active: 'Extremely Active (Physical job/training)'
    };
    return labels[level] || level;
}

// Get Goal Label
function getGoalLabel(goal) {
    const labels = {
        lose_weight: 'Lose Weight',
        maintain: 'Maintain Weight',
        gain_weight: 'Gain Weight',
        build_muscle: 'Build Muscle'
    };
    return labels[goal] || goal;
}

// Get BMI Category Color
function getBMICategoryColor(category) {
    const colors = {
        underweight: 'warning',
        normal: 'success',
        overweight: 'warning',
        obese: 'danger'
    };
    return colors[category] || 'info';
}

// Create Pagination
function createPagination(currentPage, totalPages, onPageChange) {
    const pagination = document.createElement('div');
    pagination.className = 'pagination';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => onPageChange(currentPage - 1);
    pagination.appendChild(prevBtn);

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.type = 'button';
        firstBtn.textContent = '1';
        firstBtn.onclick = () => onPageChange(1);
        pagination.appendChild(firstBtn);

        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            pagination.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.type = 'button';
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => {
            console.log("clicked page", i);
            onPageChange(i);
        };
        pagination.appendChild(pageBtn);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            pagination.appendChild(ellipsis);
        }

        const lastBtn = document.createElement('button');
        lastBtn.type = 'button';
        lastBtn.textContent = totalPages;
        lastBtn.onclick = () => onPageChange(totalPages);
        pagination.appendChild(lastBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        console.log("clicked next");
        onPageChange(currentPage + 1);
    };
    pagination.appendChild(nextBtn);

    return pagination;
}

// Export functions for use in other scripts
window.API_URL = API_URL;
window.apiRequest = apiRequest;
window.showAlert = showAlert;
window.clearAlert = clearAlert;
window.formatDate = formatDate;
window.formatNumber = formatNumber;
window.showSpinner = showSpinner;
window.logout = logout;
window.getActivityLevelLabel = getActivityLevelLabel;
window.getGoalLabel = getGoalLabel;
window.getBMICategoryColor = getBMICategoryColor;
window.createPagination = createPagination;
