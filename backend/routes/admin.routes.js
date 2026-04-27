/**
 * Admin Routes
 * Administrative endpoints for system management
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, authorize } = require('../middleware/auth');
const { paginationValidator, idParamValidator } = require('../utils/validators');
const { logActivity } = require('../utils/logger');

const router = express.Router();

// All routes require admin role
router.use(authenticateToken, authorize('admin'));

// ==================== USER MANAGEMENT ====================

// Get all users
router.get('/users', paginationValidator, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const role = req.query.role;

  let whereClause = '';
  let params = [];

  if (search) {
    whereClause = 'WHERE (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
    params = [`%${search}%`, `%${search}%`, `%${search}%`];
  }

  if (role) {
    whereClause = whereClause ? `${whereClause} AND role = ?` : 'WHERE role = ?';
    params.push(role);
  }

  const users = await query(
    `SELECT id, email, first_name, last_name, role, is_active, created_at, last_login
     FROM users
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

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

// Get user details
router.get('/users/:id', idParamValidator, asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const users = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, 
            u.created_at, u.last_login,
            p.date_of_birth, p.sex, p.height_cm, p.target_weight_kg, 
            p.phone, p.address, p.city, p.country, p.bio
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

  // Get user's health metrics count
  const metricsCount = await query(
    'SELECT COUNT(*) as total FROM health_metrics WHERE user_id = ?',
    [userId]
  );

  // Get user's recommendations count
  const fitnessRecsCount = await query(
    'SELECT COUNT(*) as total FROM fitness_recommendations WHERE user_id = ?',
    [userId]
  );

  const nutritionRecsCount = await query(
    'SELECT COUNT(*) as total FROM nutrition_recommendations WHERE user_id = ?',
    [userId]
  );

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
        address: user.address,
        city: user.city,
        country: user.country,
        bio: user.bio
      },
      stats: {
        healthMetrics: metricsCount[0].total,
        fitnessRecommendations: fitnessRecsCount[0].total,
        nutritionRecommendations: nutritionRecsCount[0].total
      }
    }
  });
}));

// Update user role
router.patch('/users/:id/role', idParamValidator, asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Role must be either "user" or "admin"'
    });
  }

  // Prevent self-demotion
  if (parseInt(userId) === req.user.userId && role === 'user') {
    return res.status(403).json({
      success: false,
      message: 'Cannot demote yourself from admin'
    });
  }

  const users = await query('SELECT id FROM users WHERE id = ?', [userId]);

  if (users.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  await query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

  logActivity(req.user.userId, 'USER_ROLE_CHANGED', { targetUserId: userId, newRole: role });

  res.json({
    success: true,
    message: 'User role updated successfully'
  });
}));

// Toggle user active status
router.patch('/users/:id/status', idParamValidator, asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { isActive } = req.body;

  // Prevent self-deactivation
  if (parseInt(userId) === req.user.userId && !isActive) {
    return res.status(403).json({
      success: false,
      message: 'Cannot deactivate your own account'
    });
  }

  const users = await query('SELECT id FROM users WHERE id = ?', [userId]);

  if (users.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  await query('UPDATE users SET is_active = ? WHERE id = ?', [isActive, userId]);

  logActivity(req.user.userId, 'USER_STATUS_CHANGED', { targetUserId: userId, isActive });

  res.json({
    success: true,
    message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
  });
}));

// Reset user password
router.post('/users/:id/reset-password', idParamValidator, asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 8 characters'
    });
  }

  const users = await query('SELECT id FROM users WHERE id = ?', [userId]);

  if (users.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);

  logActivity(req.user.userId, 'USER_PASSWORD_RESET', { targetUserId: userId });

  res.json({
    success: true,
    message: 'Password reset successfully'
  });
}));

// Delete user
router.delete('/users/:id', idParamValidator, asyncHandler(async (req, res) => {
  const userId = req.params.id;

  // Prevent self-deletion
  if (parseInt(userId) === req.user.userId) {
    return res.status(403).json({
      success: false,
      message: 'Cannot delete your own account'
    });
  }

  const users = await query('SELECT id FROM users WHERE id = ?', [userId]);

  if (users.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  await query('DELETE FROM users WHERE id = ?', [userId]);

  logActivity(req.user.userId, 'USER_DELETED', { targetUserId: userId });

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

// ==================== DASHBOARD STATS ====================

// Get dashboard statistics
router.get('/dashboard-stats', asyncHandler(async (req, res) => {
  // User statistics
  const userStats = await query(`
    SELECT 
      COUNT(*) as total_users,
      SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
      SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_count,
      SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_users,
      SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as new_today
    FROM users
  `);

  // Health metrics statistics
  const healthStats = await query(`
    SELECT 
      COUNT(*) as total_metrics,
      COUNT(DISTINCT user_id) as users_with_metrics,
      AVG(bmi) as avg_bmi,
      AVG(tdee) as avg_tdee
    FROM health_metrics
  `);

  // Recommendations statistics
  const fitnessStats = await query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_completed = TRUE THEN 1 ELSE 0 END) as completed
    FROM fitness_recommendations
  `);

  const nutritionStats = await query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_completed = TRUE THEN 1 ELSE 0 END) as completed
    FROM nutrition_recommendations
  `);

  // Content statistics
  const exerciseStats = await query(`
    SELECT COUNT(*) as total FROM exercises WHERE is_active = TRUE
  `);

  const foodStats = await query(`
    SELECT COUNT(*) as total FROM nutrition_foods WHERE is_active = TRUE
  `);

  // Recent activity
  const recentActivity = await query(`
    SELECT al.id, al.action, al.details, al.created_at, u.email, u.first_name, u.last_name
    FROM activity_logs al
    JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC
    LIMIT 20
  `);

  res.json({
    success: true,
    data: {
      users: {
        total: userStats[0].total_users,
        admins: userStats[0].admin_count,
        regularUsers: userStats[0].user_count,
        active: userStats[0].active_users,
        newToday: userStats[0].new_today
      },
      healthMetrics: {
        total: healthStats[0].total_metrics,
        uniqueUsers: healthStats[0].users_with_metrics,
        averageBMI: Math.round(healthStats[0].avg_bmi * 100) / 100,
        averageTDEE: Math.round(healthStats[0].avg_tdee)
      },
      recommendations: {
        fitness: {
          total: fitnessStats[0].total,
          completed: fitnessStats[0].completed || 0
        },
        nutrition: {
          total: nutritionStats[0].total,
          completed: nutritionStats[0].completed || 0
        }
      },
      content: {
        exercises: exerciseStats[0].total,
        foods: foodStats[0].total
      },
      recentActivity: recentActivity.map(a => ({
        id: a.id,
        action: a.action,
        details: a.details,
        user: {
          email: a.email,
          name: `${a.first_name} ${a.last_name}`
        },
        createdAt: a.created_at
      }))
    }
  });
}));

// ==================== SYSTEM LOGS ====================

// Get system logs
router.get('/logs', paginationValidator, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const level = req.query.level;

  let whereClause = '';
  let params = [];

  if (level) {
    whereClause = 'WHERE level = ?';
    params.push(level);
  }

  const logs = await query(
    `SELECT id, level, message, context, created_at
     FROM system_logs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) as total FROM system_logs ${whereClause}`,
    params
  );
  const total = countResult[0].total;

  res.json({
    success: true,
    data: {
      logs: logs.map(l => ({
        id: l.id,
        level: l.level,
        message: l.message,
        context: l.context,
        createdAt: l.created_at
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

// Clear old logs
router.delete('/logs', asyncHandler(async (req, res) => {
  const daysToKeep = req.query.days || 30;

  await query(
    'DELETE FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
    [daysToKeep]
  );

  logActivity(req.user.userId, 'LOGS_CLEARED', { daysToKeep });

  res.json({
    success: true,
    message: 'Old logs cleared successfully'
  });
}));

// ==================== BACKUP & MAINTENANCE ====================

// Get database stats
router.get('/db-stats', asyncHandler(async (req, res) => {
  const tables = await query(`
    SELECT 
      table_name,
      table_rows,
      ROUND(data_length / 1024 / 1024, 2) as data_size_mb,
      ROUND(index_length / 1024 / 1024, 2) as index_size_mb
    FROM information_schema.tables
    WHERE table_schema = ?
    ORDER BY data_length DESC
  `, [process.env.DB_NAME || 'fitness_nutrition_db']);

  res.json({
    success: true,
    data: {
      tables: tables.map(t => ({
        name: t.table_name,
        rows: t.table_rows,
        dataSizeMB: t.data_size_mb,
        indexSizeMB: t.index_size_mb
      }))
    }
  });
}));

module.exports = router;
