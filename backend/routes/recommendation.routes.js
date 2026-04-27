/**
 * Recommendation Routes
 * Fitness and nutrition recommendations retrieval and management
 */

const express = require('express');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { paginationValidator } = require('../utils/validators');
const { logActivity } = require('../utils/logger');

const router = express.Router();

// Get all fitness recommendations for user
router.get('/fitness', authenticateToken, paginationValidator, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const recs = await query(
    `SELECT fr.id, fr.recommendation_type, fr.title, fr.description, 
            fr.exercises, fr.frequency, fr.duration, fr.intensity, 
            fr.calories_burn_target, fr.is_completed, fr.created_at,
            hm.weight_kg, hm.bmi, hm.recorded_at as metric_date
     FROM fitness_recommendations fr
     JOIN health_metrics hm ON fr.metric_id = hm.id
     WHERE fr.user_id = ?
     ORDER BY fr.created_at DESC
     LIMIT ? OFFSET ?`,
    [req.user.userId, limit, offset]
  );

  const countResult = await query(
    'SELECT COUNT(*) as total FROM fitness_recommendations WHERE user_id = ?',
    [req.user.userId]
  );
  const total = countResult[0].total;

  res.json({
    success: true,
    data: {
      recommendations: recs.map(r => ({
        id: r.id,
        type: r.recommendation_type,
        title: r.title,
        description: r.description,
        exercises: JSON.parse(r.exercises || '[]'),
        frequency: r.frequency,
        duration: r.duration,
        intensity: r.intensity,
        caloriesBurnTarget: r.calories_burn_target,
        isCompleted: r.is_completed,
        createdAt: r.created_at,
        basedOn: {
          weight: r.weight_kg,
          bmi: r.bmi,
          metricDate: r.metric_date
        }
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

// Get all nutrition recommendations for user
router.get('/nutrition', authenticateToken, paginationValidator, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const recs = await query(
    `SELECT nr.id, nr.recommendation_type, nr.title, nr.description,
            nr.daily_calories, nr.protein_g, nr.carbs_g, nr.fat_g, nr.fiber_g,
            nr.meal_suggestions, nr.dietary_restrictions, nr.is_completed, nr.created_at,
            hm.weight_kg, hm.bmi, hm.recorded_at as metric_date
     FROM nutrition_recommendations nr
     JOIN health_metrics hm ON nr.metric_id = hm.id
     WHERE nr.user_id = ?
     ORDER BY nr.created_at DESC
     LIMIT ? OFFSET ?`,
    [req.user.userId, limit, offset]
  );

  const countResult = await query(
    'SELECT COUNT(*) as total FROM nutrition_recommendations WHERE user_id = ?',
    [req.user.userId]
  );
  const total = countResult[0].total;

  res.json({
    success: true,
    data: {
      recommendations: recs.map(r => ({
        id: r.id,
        type: r.recommendation_type,
        title: r.title,
        description: r.description,
        dailyCalories: r.daily_calories,
        macros: {
          protein: r.protein_g,
          carbs: r.carbs_g,
          fat: r.fat_g,
          fiber: r.fiber_g
        },
        mealSuggestions: JSON.parse(r.meal_suggestions || '{}'),
        dietaryRestrictions: JSON.parse(r.dietary_restrictions || '[]'),
        isCompleted: r.is_completed,
        createdAt: r.created_at,
        basedOn: {
          weight: r.weight_kg,
          bmi: r.bmi,
          metricDate: r.metric_date
        }
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

// Get latest recommendations
router.get('/latest', authenticateToken, asyncHandler(async (req, res) => {
  // Get latest fitness recommendations
  const fitnessRecs = await query(
    `SELECT fr.id, fr.recommendation_type, fr.title, fr.description, 
            fr.exercises, fr.frequency, fr.duration, fr.intensity, 
            fr.is_completed, fr.created_at
     FROM fitness_recommendations fr
     WHERE fr.user_id = ?
     ORDER BY fr.created_at DESC
     LIMIT 5`,
    [req.user.userId]
  );

  // Get latest nutrition recommendation
  const nutritionRecs = await query(
    `SELECT nr.id, nr.recommendation_type, nr.title, nr.description,
            nr.daily_calories, nr.protein_g, nr.carbs_g, nr.fat_g, nr.fiber_g,
            nr.meal_suggestions, nr.dietary_restrictions, nr.is_completed, nr.created_at
     FROM nutrition_recommendations nr
     WHERE nr.user_id = ?
     ORDER BY nr.created_at DESC
     LIMIT 1`,
    [req.user.userId]
  );

  res.json({
    success: true,
    data: {
      fitness: fitnessRecs.map(r => ({
        id: r.id,
        type: r.recommendation_type,
        title: r.title,
        description: r.description,
        exercises: JSON.parse(r.exercises || '[]'),
        frequency: r.frequency,
        duration: r.duration,
        intensity: r.intensity,
        isCompleted: r.is_completed,
        createdAt: r.created_at
      })),
      nutrition: nutritionRecs.length > 0 ? {
        id: nutritionRecs[0].id,
        type: nutritionRecs[0].recommendation_type,
        title: nutritionRecs[0].title,
        description: nutritionRecs[0].description,
        dailyCalories: nutritionRecs[0].daily_calories,
        macros: {
          protein: nutritionRecs[0].protein_g,
          carbs: nutritionRecs[0].carbs_g,
          fat: nutritionRecs[0].fat_g,
          fiber: nutritionRecs[0].fiber_g
        },
        mealSuggestions: JSON.parse(nutritionRecs[0].meal_suggestions || '{}'),
        dietaryRestrictions: JSON.parse(nutritionRecs[0].dietary_restrictions || '[]'),
        isCompleted: nutritionRecs[0].is_completed,
        createdAt: nutritionRecs[0].created_at
      } : null
    }
  });
}));

// Get specific fitness recommendation
router.get('/fitness/:id', authenticateToken, asyncHandler(async (req, res) => {
  const recId = req.params.id;

  const recs = await query(
    `SELECT fr.*, hm.weight_kg, hm.bmi, hm.tdee
     FROM fitness_recommendations fr
     JOIN health_metrics hm ON fr.metric_id = hm.id
     WHERE fr.id = ? AND fr.user_id = ?`,
    [recId, req.user.userId]
  );

  if (recs.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Recommendation not found'
    });
  }

  const r = recs[0];

  res.json({
    success: true,
    data: {
      id: r.id,
      type: r.recommendation_type,
      title: r.title,
      description: r.description,
      exercises: JSON.parse(r.exercises || '[]'),
      frequency: r.frequency,
      duration: r.duration,
      intensity: r.intensity,
      caloriesBurnTarget: r.calories_burn_target,
      isCompleted: r.is_completed,
      createdAt: r.created_at,
      basedOn: {
        weight: r.weight_kg,
        bmi: r.bmi,
        tdee: r.tdee
      }
    }
  });
}));

// Get specific nutrition recommendation
router.get('/nutrition/:id', authenticateToken, asyncHandler(async (req, res) => {
  const recId = req.params.id;

  const recs = await query(
    `SELECT nr.*, hm.weight_kg, hm.bmi, hm.tdee
     FROM nutrition_recommendations nr
     JOIN health_metrics hm ON nr.metric_id = hm.id
     WHERE nr.id = ? AND nr.user_id = ?`,
    [recId, req.user.userId]
  );

  if (recs.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Recommendation not found'
    });
  }

  const r = recs[0];

  res.json({
    success: true,
    data: {
      id: r.id,
      type: r.recommendation_type,
      title: r.title,
      description: r.description,
      dailyCalories: r.daily_calories,
      macros: {
        protein: r.protein_g,
        carbs: r.carbs_g,
        fat: r.fat_g,
        fiber: r.fiber_g
      },
      mealSuggestions: JSON.parse(r.meal_suggestions || '{}'),
      dietaryRestrictions: JSON.parse(r.dietary_restrictions || '[]'),
      isCompleted: r.is_completed,
      createdAt: r.created_at,
      basedOn: {
        weight: r.weight_kg,
        bmi: r.bmi,
        tdee: r.tdee
      }
    }
  });
}));

// Mark fitness recommendation as completed
router.patch('/fitness/:id/complete', authenticateToken, asyncHandler(async (req, res) => {
  const recId = req.params.id;

  // Check if recommendation exists and belongs to user
  const recs = await query(
    'SELECT id FROM fitness_recommendations WHERE id = ? AND user_id = ?',
    [recId, req.user.userId]
  );

  if (recs.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Recommendation not found'
    });
  }

  await query(
    'UPDATE fitness_recommendations SET is_completed = TRUE WHERE id = ?',
    [recId]
  );

  logActivity(req.user.userId, 'FITNESS_REC_COMPLETED', { recId });

  res.json({
    success: true,
    message: 'Recommendation marked as completed'
  });
}));

// Mark nutrition recommendation as completed
router.patch('/nutrition/:id/complete', authenticateToken, asyncHandler(async (req, res) => {
  const recId = req.params.id;

  // Check if recommendation exists and belongs to user
  const recs = await query(
    'SELECT id FROM nutrition_recommendations WHERE id = ? AND user_id = ?',
    [recId, req.user.userId]
  );

  if (recs.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Recommendation not found'
    });
  }

  await query(
    'UPDATE nutrition_recommendations SET is_completed = TRUE WHERE id = ?',
    [recId]
  );

  logActivity(req.user.userId, 'NUTRITION_REC_COMPLETED', { recId });

  res.json({
    success: true,
    message: 'Recommendation marked as completed'
  });
}));

// Get recommendation statistics
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  // Fitness stats
  const fitnessStats = await query(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_completed = TRUE THEN 1 ELSE 0 END) as completed
     FROM fitness_recommendations
     WHERE user_id = ?`,
    [req.user.userId]
  );

  // Nutrition stats
  const nutritionStats = await query(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_completed = TRUE THEN 1 ELSE 0 END) as completed
     FROM nutrition_recommendations
     WHERE user_id = ?`,
    [req.user.userId]
  );

  // Recent activity
  const recentActivity = await query(
    `SELECT action, created_at
     FROM activity_logs
     WHERE user_id = ? AND (action LIKE '%REC_%' OR action = 'HEALTH_METRICS_SUBMITTED')
     ORDER BY created_at DESC
     LIMIT 10`,
    [req.user.userId]
  );

  res.json({
    success: true,
    data: {
      fitness: {
        total: fitnessStats[0].total,
        completed: fitnessStats[0].completed || 0,
        completionRate: fitnessStats[0].total > 0 
          ? Math.round((fitnessStats[0].completed / fitnessStats[0].total) * 100) 
          : 0
      },
      nutrition: {
        total: nutritionStats[0].total,
        completed: nutritionStats[0].completed || 0,
        completionRate: nutritionStats[0].total > 0 
          ? Math.round((nutritionStats[0].completed / nutritionStats[0].total) * 100) 
          : 0
      },
      recentActivity: recentActivity.map(a => ({
        action: a.action,
        createdAt: a.created_at
      }))
    }
  });
}));

module.exports = router;
