/**
 * Health Routes
 * Health data collection, BMI/BMR/TDEE calculations, and metrics history
 */

const express = require('express');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { healthMetricsValidator, paginationValidator, dateRangeValidator } = require('../utils/validators');
const { calculateAllMetrics, generateFitnessRecommendations, generateNutritionRecommendations } = require('../utils/healthCalculations');
const { logActivity } = require('../utils/logger');

const router = express.Router();

// Submit health data and get calculations
router.post('/metrics', authenticateToken, healthMetricsValidator, asyncHandler(async (req, res) => {
  const { weightKg, heightCm, age, sex, activityLevel, goal } = req.body;

  // Calculate all metrics
  const calculations = calculateAllMetrics({ weightKg, heightCm, age, sex, activityLevel, goal });

  // Save to database
  const result = await query(
    `INSERT INTO health_metrics 
     (user_id, weight_kg, height_cm, age, sex, activity_level, goal, bmi, bmr, tdee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.userId,
      weightKg,
      heightCm,
      age,
      sex,
      activityLevel,
      goal,
      calculations.bmi,
      calculations.bmr,
      calculations.tdee
    ]
  );

  const metricId = result.insertId;

  // Generate recommendations
  const fitnessRecs = generateFitnessRecommendations({
    bmiCategory: calculations.bmiCategory,
    goal,
    activityLevel,
    age,
    targetCalories: calculations.targetCalories
  });

  const nutritionRecs = generateNutritionRecommendations({
    targetCalories: calculations.targetCalories,
    goal,
    weightKg,
    bmiCategory: calculations.bmiCategory
  });

  // Save recommendations
  for (const rec of fitnessRecs) {
    await query(
      `INSERT INTO fitness_recommendations 
       (user_id, metric_id, recommendation_type, title, description, exercises, frequency, duration, intensity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.userId,
        metricId,
        rec.type,
        rec.title,
        rec.description,
        JSON.stringify(rec.exercises),
        rec.frequency,
        rec.duration,
        rec.intensity
      ]
    );
  }

  await query(
    `INSERT INTO nutrition_recommendations 
     (user_id, metric_id, recommendation_type, title, description, daily_calories, 
      protein_g, carbs_g, fat_g, fiber_g, meal_suggestions, dietary_restrictions)
     VALUES (?, ?, 'meal_plan', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.userId,
      metricId,
      `Personalized Nutrition Plan - ${goal.replace('_', ' ')}`,
      nutritionRecs.tips.join(' '),
      nutritionRecs.dailyCalories,
      nutritionRecs.macros.protein.grams,
      nutritionRecs.macros.carbs.grams,
      nutritionRecs.macros.fat.grams,
      30, // Default fiber
      JSON.stringify(nutritionRecs.meals),
      JSON.stringify(nutritionRecs.foodsToLimit)
    ]
  );

  logActivity(req.user.userId, 'HEALTH_METRICS_SUBMITTED', { metricId, bmi: calculations.bmi });

  res.status(201).json({
    success: true,
    message: 'Health metrics saved successfully',
    data: {
      metricId,
      calculations: {
        bmi: {
          value: calculations.bmi,
          category: calculations.bmiCategory,
          interpretation: calculations.bmiInterpretation
        },
        bmr: calculations.bmr,
        tdee: calculations.tdee,
        targetCalories: calculations.targetCalories,
        idealWeightRange: calculations.idealWeightRange,
        weightDifference: calculations.weightDifference
      },
      recommendations: {
        fitness: fitnessRecs,
        nutrition: nutritionRecs
      }
    }
  });
}));

// Get latest health metrics
router.get('/metrics/latest', authenticateToken, asyncHandler(async (req, res) => {
  const metrics = await query(
    `SELECT id, weight_kg, height_cm, age, sex, activity_level, goal,
            bmi, bmr, tdee, recorded_at
     FROM health_metrics
     WHERE user_id = ?
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [req.user.userId]
  );

  if (metrics.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No health metrics found. Please submit your health data first.'
    });
  }

  const m = metrics[0];

  res.json({
    success: true,
    data: {
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
    }
  });
}));

// Get health metrics history
router.get('/metrics', authenticateToken, paginationValidator, dateRangeValidator, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  let whereClause = 'WHERE user_id = ?';
  let params = [req.user.userId];

  if (startDate) {
    whereClause += ' AND recorded_at >= ?';
    params.push(startDate);
  }

  if (endDate) {
    whereClause += ' AND recorded_at <= ?';
    params.push(endDate);
  }

  // Get metrics
  const metrics = await query(
    `SELECT id, weight_kg, height_cm, age, sex, activity_level, goal,
            bmi, bmr, tdee, recorded_at
     FROM health_metrics
     ${whereClause}
     ORDER BY recorded_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM health_metrics ${whereClause}`,
    params
  );
  const total = countResult[0].total;

  // Calculate trends
  const weightTrend = await query(
    `SELECT weight_kg, recorded_at 
     FROM health_metrics 
     WHERE user_id = ? 
     ORDER BY recorded_at DESC 
     LIMIT 2`,
    [req.user.userId]
  );

  let trend = null;
  if (weightTrend.length >= 2) {
    const current = weightTrend[0].weight_kg;
    const previous = weightTrend[1].weight_kg;
    trend = {
      weightChange: Math.round((current - previous) * 100) / 100,
      direction: current > previous ? 'increased' : current < previous ? 'decreased' : 'stable'
    };
  }

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
      trend,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
}));

// Get specific metric by ID
router.get('/metrics/:id', authenticateToken, asyncHandler(async (req, res) => {
  const metricId = req.params.id;

  const metrics = await query(
    `SELECT id, weight_kg, height_cm, age, sex, activity_level, goal,
            bmi, bmr, tdee, recorded_at
     FROM health_metrics
     WHERE id = ? AND user_id = ?`,
    [metricId, req.user.userId]
  );

  if (metrics.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Health metric not found'
    });
  }

  const m = metrics[0];

  res.json({
    success: true,
    data: {
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
    }
  });
}));

// Delete health metric
router.delete('/metrics/:id', authenticateToken, asyncHandler(async (req, res) => {
  const metricId = req.params.id;

  // Check if metric exists and belongs to user
  const metrics = await query(
    'SELECT id FROM health_metrics WHERE id = ? AND user_id = ?',
    [metricId, req.user.userId]
  );

  if (metrics.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Health metric not found'
    });
  }

  // Delete metric (cascade will handle recommendations)
  await query('DELETE FROM health_metrics WHERE id = ?', [metricId]);

  logActivity(req.user.userId, 'HEALTH_METRIC_DELETED', { metricId });

  res.json({
    success: true,
    message: 'Health metric deleted successfully'
  });
}));

// Get health summary (dashboard data)
router.get('/summary', authenticateToken, asyncHandler(async (req, res) => {
  // Get latest metrics
  const latestMetrics = await query(
    `SELECT weight_kg, height_cm, age, sex, activity_level, goal,
            bmi, bmr, tdee, recorded_at
     FROM health_metrics
     WHERE user_id = ?
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [req.user.userId]
  );

  // Get metrics count
  const countResult = await query(
    'SELECT COUNT(*) as total FROM health_metrics WHERE user_id = ?',
    [req.user.userId]
  );

  // Get weight history for chart (last 30 days)
  const weightHistory = await query(
    `SELECT weight_kg, recorded_at
     FROM health_metrics
     WHERE user_id = ?
     ORDER BY recorded_at ASC
     LIMIT 30`,
    [req.user.userId]
  );

  // Get recommendations count
  const fitnessRecsCount = await query(
    'SELECT COUNT(*) as total FROM fitness_recommendations WHERE user_id = ?',
    [req.user.userId]
  );

  const nutritionRecsCount = await query(
    'SELECT COUNT(*) as total FROM nutrition_recommendations WHERE user_id = ?',
    [req.user.userId]
  );

  res.json({
    success: true,
    data: {
      hasData: latestMetrics.length > 0,
      latestMetrics: latestMetrics.length > 0 ? {
        weightKg: latestMetrics[0].weight_kg,
        heightCm: latestMetrics[0].height_cm,
        age: latestMetrics[0].age,
        sex: latestMetrics[0].sex,
        activityLevel: latestMetrics[0].activity_level,
        goal: latestMetrics[0].goal,
        bmi: latestMetrics[0].bmi,
        bmr: latestMetrics[0].bmr,
        tdee: latestMetrics[0].tdee,
        recordedAt: latestMetrics[0].recorded_at
      } : null,
      stats: {
        totalMetrics: countResult[0].total,
        fitnessRecommendations: fitnessRecsCount[0].total,
        nutritionRecommendations: nutritionRecsCount[0].total
      },
      weightHistory: weightHistory.map(w => ({
        weight: w.weight_kg,
        date: w.recorded_at
      }))
    }
  });
}));

// Calculate without saving (for quick check)
router.post('/calculate', authenticateToken, healthMetricsValidator, asyncHandler(async (req, res) => {
  const { weightKg, heightCm, age, sex, activityLevel, goal } = req.body;

  const calculations = calculateAllMetrics({ weightKg, heightCm, age, sex, activityLevel, goal });

  const fitnessRecs = generateFitnessRecommendations({
    bmiCategory: calculations.bmiCategory,
    goal,
    activityLevel,
    age,
    targetCalories: calculations.targetCalories
  });

  const nutritionRecs = generateNutritionRecommendations({
    targetCalories: calculations.targetCalories,
    goal,
    weightKg,
    bmiCategory: calculations.bmiCategory
  });

  res.json({
    success: true,
    data: {
      calculations: {
        bmi: {
          value: calculations.bmi,
          category: calculations.bmiCategory,
          interpretation: calculations.bmiInterpretation
        },
        bmr: calculations.bmr,
        tdee: calculations.tdee,
        targetCalories: calculations.targetCalories,
        idealWeightRange: calculations.idealWeightRange,
        weightDifference: calculations.weightDifference
      },
      recommendations: {
        fitness: fitnessRecs,
        nutrition: nutritionRecs
      }
    }
  });
}));

module.exports = router;
