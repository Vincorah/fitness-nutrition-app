/**
 * Authentication Routes
 * User registration, login, logout, and token management
 */
const express = require('express');
const router = express.Router();

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
// Setup mail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'nutrifitsupport@gmail.com',
    pass: 'vsmgkcmbercnliks'
  }
});

// const router = express.Router();

// Forgot Password
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  const users = await query(
    'SELECT id, email FROM users WHERE email = ?',
    [email]
  );

  if (users.length === 0) {
    return res.json({
      success: true,
      message: 'If that email exists, a reset link has been sent.'
    });
  }

  const user = users[0];

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  await query(
    'UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?',
    [token, expires, user.id]
  );

  // Generate the reset link dynamically based on where the request came from
  const referer = req.headers.referer || 'http://localhost:3000/pages/forgot-password.html';
  const baseUrl = referer.split('?')[0]; // Remove any existing query parameters
  const resetLink = `${baseUrl.replace('forgot-password.html', 'reset-password.html')}?token=${token}`;

  await transporter.sendMail({
    from: '"NutriFit" <yourprojectemail@gmail.com>',
    to: user.email,
    subject: 'Password Reset',
    html: `
      <p>You requested a password reset.</p>
      <p>Click below:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link expires in 15 minutes.</p>
    `
  });

  res.json({
    success: true,
    message: 'Reset link sent to your email.'
  });
}));

// Reset Password
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const users = await query(
    'SELECT id FROM users WHERE reset_token = ? AND reset_expires > NOW()',
    [token]
  );

  if (users.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }

  const userId = users[0].id;

  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  await query(
    'UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?',
    [hashedPassword, userId]
  );

  res.json({
    success: true,
    message: 'Password reset successful'
  });
}));



// const express = require('express');
// const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const { query } = require('../config/database');
// const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../utils/validators');
const { logActivity } = require('../utils/logger');

// const router = express.Router();

// Register new user
router.post('/register', registerValidator, asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUsers = await query(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (existingUsers.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered'
    });
  }

  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const result = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name) 
     VALUES (?, ?, ?, ?)`,
    [email, passwordHash, firstName, lastName]
  );

  const userId = result.insertId;

  // Create empty profile
  await query(
    'INSERT INTO user_profiles (user_id) VALUES (?)',
    [userId]
  );

  // Log activity
  logActivity(userId, 'USER_REGISTERED', { email });

  // Generate JWT token
  const token = jwt.sign(
    { userId, email, role: 'user' },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: userId,
        email,
        firstName,
        lastName,
        role: 'user'
      },
      token
    }
  });
}));

// Login user
router.post('/login', loginValidator, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const users = await query(
    `SELECT id, email, password_hash, first_name, last_name, role, is_active 
     FROM users WHERE email = ?`,
    [email]
  );

  if (users.length === 0) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  const user = users[0];

  // Check if account is active
  if (!user.is_active) {
    return res.status(403).json({
      success: false,
      message: 'Account is deactivated. Please contact support.'
    });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Update last login
  await query(
    'UPDATE users SET last_login = NOW() WHERE id = ?',
    [user.id]
  );

  // Log activity
  logActivity(user.id, 'USER_LOGIN', { email });

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token
    }
  });
}));

// Logout user (client-side token removal, but we can log it)
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  logActivity(req.user.userId, 'USER_LOGOUT', { email: req.user.email });

  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

// Get current user info
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const users = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.created_at, u.last_login,
            p.date_of_birth, p.sex, p.height_cm, p.target_weight_kg, p.phone, p.city, p.country, p.bio, p.avatar_url
     FROM users u
     LEFT JOIN user_profiles p ON u.id = p.user_id
     WHERE u.id = ?`,
    [req.user.userId]
  );

  if (users.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const user = users[0];

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      profile: {
        dateOfBirth: user.date_of_birth,
        sex: user.sex,
        heightCm: user.height_cm,
        targetWeightKg: user.target_weight_kg,
        phone: user.phone,
        city: user.city,
        country: user.country,
        bio: user.bio,
        avatarUrl: user.avatar_url
      }
    }
  });
}));

// Refresh token
router.post('/refresh', authenticateToken, asyncHandler(async (req, res) => {
  // Generate new token
  const token = jwt.sign(
    { userId: req.user.userId, email: req.user.email, role: req.user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  res.json({
    success: true,
    message: 'Token refreshed',
    data: { token }
  });
}));

// Change password
router.post('/change-password', authenticateToken, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get current password hash
  const users = await query(
    'SELECT password_hash FROM users WHERE id = ?',
    [req.user.userId]
  );

  if (users.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Hash new password
  const saltRounds = 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await query(
    'UPDATE users SET password_hash = ? WHERE id = ?',
    [newPasswordHash, req.user.userId]
  );

  logActivity(req.user.userId, 'PASSWORD_CHANGED', {});

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

module.exports = router;
