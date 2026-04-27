/**
 * User Routes
 * Profile management and user-related operations
 */

const express = require('express');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, authorize } = require('../middleware/auth');
const { updateProfileValidator, paginationValidator } = require('../utils/validators');
const { logActivity } = require('../utils/logger');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const users = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.created_at,
            p.date_of_birth, p.sex, p.height_cm, p.target_weight_kg, 
            p.phone, p.address, p.city, p.country, p.bio, p.avatar_url
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
      profile: {
        dateOfBirth: user.date_of_birth,
        sex: user.sex,
        heightCm: user.height_cm,
        targetWeightKg: user.target_weight_kg,
        phone: user.phone,
        address: user.address,
        city: user.city,
        country: user.country,
        bio: user.bio,
        avatarUrl: user.avatar_url
      }
    }
  });
}));

// Update user profile
router.put('/profile', authenticateToken, updateProfileValidator, asyncHandler(async (req, res) => {
  const {
    dateOfBirth,
    sex,
    heightCm,
    targetWeightKg,
    phone,
    address,
    city,
    country,
    bio,
    avatarUrl
  } = req.body;

  // Check if profile exists
  const profiles = await query(
    'SELECT id FROM user_profiles WHERE user_id = ?',
    [req.user.userId]
  );

  if (profiles.length === 0) {
    // Create new profile
    await query(
      `INSERT INTO user_profiles 
       (user_id, date_of_birth, sex, height_cm, target_weight_kg, phone, address, city, country, bio, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.userId, dateOfBirth, sex, heightCm, targetWeightKg, phone, address, city, country, bio, avatarUrl]
    );
  } else {
    // Update existing profile
    await query(
      `UPDATE user_profiles SET
       date_of_birth = COALESCE(?, date_of_birth),
       sex = COALESCE(?, sex),
       height_cm = COALESCE(?, height_cm),
       target_weight_kg = COALESCE(?, target_weight_kg),
       phone = COALESCE(?, phone),
       address = COALESCE(?, address),
       city = COALESCE(?, city),
       country = COALESCE(?, country),
       bio = COALESCE(?, bio),
       avatar_url = COALESCE(?, avatar_url)
       WHERE user_id = ?`,
      [dateOfBirth, sex, heightCm, targetWeightKg, phone, address, city, country, bio, avatarUrl, req.user.userId]
    );
  }

  logActivity(req.user.userId, 'PROFILE_UPDATED', {});

  res.json({
    success: true,
    message: 'Profile updated successfully'
  });
}));

// Update user basic info
router.put('/info', authenticateToken, asyncHandler(async (req, res) => {
  const { firstName, lastName } = req.body;

  await query(
    'UPDATE users SET first_name = ?, last_name = ? WHERE id = ?',
    [firstName, lastName, req.user.userId]
  );

  logActivity(req.user.userId, 'USER_INFO_UPDATED', { firstName, lastName });

  res.json({
    success: true,
    message: 'User information updated successfully'
  });
}));

// Get user's health metrics history
router.get('/metrics-history', authenticateToken, paginationValidator, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await query(
    'SELECT COUNT(*) as total FROM health_metrics WHERE user_id = ?',
    [req.user.userId]
  );
  const total = countResult[0].total;

  // Get metrics
  const metrics = await query(
    `SELECT id, weight_kg, height_cm, age, sex, activity_level, goal,
            bmi, bmr, tdee, recorded_at
     FROM health_metrics
     WHERE user_id = ?
     ORDER BY recorded_at DESC
     LIMIT ? OFFSET ?`,
    [req.user.userId, limit, offset]
  );

  res.json({
    success: true,
    data: {
      metrics: metrics.map(m => ({
        id: m.id,
        weightKg: m.weight_kg,
        heightCm: m.height_cm,
        age: m.age,
        sex: m.sex,
        activityLevel: m.activity_level,
        goal: m.goal,
        bmi: m.bmi,
        bmr: m.bmr,
        tdee: m.tdee,
        recordedAt: m.recorded_at
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
}));

// Get user's activity logs
router.get('/activity-logs', authenticateToken, paginationValidator, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const logs = await query(
    `SELECT id, action, details, created_at
     FROM activity_logs
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [req.user.userId, limit, offset]
  );

  const countResult = await query(
    'SELECT COUNT(*) as total FROM activity_logs WHERE user_id = ?',
    [req.user.userId]
  );
  const total = countResult[0].total;

  res.json({
    success: true,
    data: {
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        details: log.details,
        createdAt: log.created_at
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
}));

// Delete user account
router.delete('/account', authenticateToken, asyncHandler(async (req, res) => {
  const { password } = req.body;

  // Verify password
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

  const bcrypt = require('bcryptjs');
  const isPasswordValid = await bcrypt.compare(password, users[0].password_hash);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Password is incorrect'
    });
  }

  // Delete user (cascade will handle related records)
  await query('DELETE FROM users WHERE id = ?', [req.user.userId]);

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
}));

// Admin: Get all users
router.get('/all', authenticateToken, authorize('admin'), paginationValidator, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  let whereClause = '';
  let params = [];

  if (search) {
    whereClause = 'WHERE email LIKE ? OR first_name LIKE ? OR last_name LIKE ?';
    params = [`%${search}%`, `%${search}%`, `%${search}%`];
  }

  // Get users
  const users = await query(
    `SELECT id, email, first_name, last_name, role, is_active, created_at, last_login
     FROM users
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM users ${whereClause}`,
    params
  );
  const total = countResult[0].total;

  res.json({
    success: true,
    data: {
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        role: u.role,
        isActive: u.is_active,
        createdAt: u.created_at,
        lastLogin: u.last_login
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
}));

// Admin: Get user by ID
router.get('/:id', authenticateToken, authorize('admin'), asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const users = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, 
            u.created_at, u.last_login,
            p.date_of_birth, p.sex, p.height_cm, p.target_weight_kg, 
            p.phone, p.city, p.country, p.bio
     FROM users u
     LEFT JOIN user_profiles p ON u.id = p.user_id
     WHERE u.id = ?`,
    [userId]
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
      isActive: user.is_active,
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
        bio: user.bio
      }
    }
  });
}));

module.exports = router;
