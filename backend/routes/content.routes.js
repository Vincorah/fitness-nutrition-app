/**
 * Content Routes
 * Exercise and nutrition content management
 */

const express = require('express');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, authorize } = require('../middleware/auth');
const { exerciseValidator, nutritionFoodValidator, paginationValidator, idParamValidator } = require('../utils/validators');
const { logActivity } = require('../utils/logger');

const router = express.Router();

// ==================== EXERCISE ROUTES ====================

// Get all exercises (public)
router.get('/exercises', paginationValidator, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const category = req.query.category;
  const difficulty = req.query.difficulty;
  const search = req.query.search;

  let whereClause = 'WHERE is_active = TRUE';
  let params = [];

  if (category) {
    whereClause += ' AND category = ?';
    params.push(category);
  }

  if (difficulty) {
    whereClause += ' AND difficulty_level = ?';
    params.push(difficulty);
  }

  if (search) {
    whereClause += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const exercises = await query(
    `SELECT id, name, description, category, difficulty_level, muscle_groups,
            equipment_needed, duration_minutes, calories_burned_per_hour,
            instructions, video_url, image_url
     FROM exercises
     ${whereClause}
     ORDER BY category, name
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) as total FROM exercises ${whereClause}`,
    params
  );
  const total = countResult[0].total;

  res.json({
    success: true,
    data: {
      exercises: exercises.map(e => ({
        id: e.id,
        name: e.name,
        description: e.description,
        category: e.category,
        difficultyLevel: e.difficulty_level,
        muscleGroups: JSON.parse(e.muscle_groups || '[]'),
        equipmentNeeded: JSON.parse(e.equipment_needed || '[]'),
        durationMinutes: e.duration_minutes,
        caloriesBurnedPerHour: e.calories_burned_per_hour,
        instructions: e.instructions,
        videoUrl: e.video_url,
        imageUrl: e.image_url
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

// Get exercise categories
router.get('/exercises/categories', asyncHandler(async (req, res) => {
  const categories = await query(
    'SELECT DISTINCT category FROM exercises WHERE is_active = TRUE ORDER BY category'
  );

  res.json({
    success: true,
    data: categories.map(c => c.category)
  });
}));

// Get single exercise
router.get('/exercises/:id', idParamValidator, asyncHandler(async (req, res) => {
  const exerciseId = req.params.id;

  const exercises = await query(
    `SELECT id, name, description, category, difficulty_level, muscle_groups,
            equipment_needed, duration_minutes, calories_burned_per_hour,
            instructions, video_url, image_url
     FROM exercises
     WHERE id = ? AND is_active = TRUE`,
    [exerciseId]
  );

  if (exercises.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Exercise not found'
    });
  }

  const e = exercises[0];

  res.json({
    success: true,
    data: {
      id: e.id,
      name: e.name,
      description: e.description,
      category: e.category,
      difficultyLevel: e.difficulty_level,
      muscleGroups: JSON.parse(e.muscle_groups || '[]'),
      equipmentNeeded: JSON.parse(e.equipment_needed || '[]'),
      durationMinutes: e.duration_minutes,
      caloriesBurnedPerHour: e.calories_burned_per_hour,
      instructions: e.instructions,
      videoUrl: e.video_url,
      imageUrl: e.image_url
    }
  });
}));

// Create exercise (admin only)
router.post('/exercises', authenticateToken, authorize('admin'), exerciseValidator, asyncHandler(async (req, res) => {
  const {
    name,
    description,
    category,
    difficultyLevel,
    muscleGroups,
    equipmentNeeded,
    durationMinutes,
    caloriesBurnedPerHour,
    instructions,
    videoUrl,
    imageUrl
  } = req.body;

  const result = await query(
    `INSERT INTO exercises 
     (name, description, category, difficulty_level, muscle_groups, equipment_needed,
      duration_minutes, calories_burned_per_hour, instructions, video_url, image_url, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      description,
      category,
      difficultyLevel,
      JSON.stringify(muscleGroups || []),
      JSON.stringify(equipmentNeeded || []),
      durationMinutes,
      caloriesBurnedPerHour,
      instructions,
      videoUrl,
      imageUrl,
      req.user.userId
    ]
  );

  logActivity(req.user.userId, 'EXERCISE_CREATED', { exerciseId: result.insertId, name });

  res.status(201).json({
    success: true,
    message: 'Exercise created successfully',
    data: { id: result.insertId }
  });
}));

// Update exercise (admin only)
router.put('/exercises/:id', authenticateToken, authorize('admin'), idParamValidator, asyncHandler(async (req, res) => {
  const exerciseId = req.params.id;
  const {
    name,
    description,
    category,
    difficultyLevel,
    muscleGroups,
    equipmentNeeded,
    durationMinutes,
    caloriesBurnedPerHour,
    instructions,
    videoUrl,
    imageUrl,
    isActive
  } = req.body;

  // Check if exercise exists
  const exercises = await query('SELECT id FROM exercises WHERE id = ?', [exerciseId]);

  if (exercises.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Exercise not found'
    });
  }

  await query(
    `UPDATE exercises SET
     name = COALESCE(?, name),
     description = COALESCE(?, description),
     category = COALESCE(?, category),
     difficulty_level = COALESCE(?, difficulty_level),
     muscle_groups = COALESCE(?, muscle_groups),
     equipment_needed = COALESCE(?, equipment_needed),
     duration_minutes = COALESCE(?, duration_minutes),
     calories_burned_per_hour = COALESCE(?, calories_burned_per_hour),
     instructions = COALESCE(?, instructions),
     video_url = COALESCE(?, video_url),
     image_url = COALESCE(?, image_url),
     is_active = COALESCE(?, is_active)
     WHERE id = ?`,
    [
      name,
      description,
      category,
      difficultyLevel,
      muscleGroups ? JSON.stringify(muscleGroups) : null,
      equipmentNeeded ? JSON.stringify(equipmentNeeded) : null,
      durationMinutes,
      caloriesBurnedPerHour,
      instructions,
      videoUrl,
      imageUrl,
      isActive,
      exerciseId
    ]
  );

  logActivity(req.user.userId, 'EXERCISE_UPDATED', { exerciseId, name });

  res.json({
    success: true,
    message: 'Exercise updated successfully'
  });
}));

// Delete exercise (admin only)
router.delete('/exercises/:id', authenticateToken, authorize('admin'), idParamValidator, asyncHandler(async (req, res) => {
  const exerciseId = req.params.id;

  const exercises = await query('SELECT id FROM exercises WHERE id = ?', [exerciseId]);

  if (exercises.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Exercise not found'
    });
  }

  await query('DELETE FROM exercises WHERE id = ?', [exerciseId]);

  logActivity(req.user.userId, 'EXERCISE_DELETED', { exerciseId });

  res.json({
    success: true,
    message: 'Exercise deleted successfully'
  });
}));

// ==================== NUTRITION FOOD ROUTES ====================

// Get all nutrition foods (public)
router.get('/foods', paginationValidator, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const category = req.query.category;
  const mealType = req.query.mealType;
  const search = req.query.search;

  let whereClause = 'WHERE is_active = TRUE';
  let params = [];

  if (category) {
    whereClause += ' AND category = ?';
    params.push(category);
  }

  if (mealType) {
    whereClause += ' AND meal_type = ?';
    params.push(mealType);
  }

  if (search) {
    whereClause += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const foods = await query(
    `SELECT id, name, description, category, calories_per_100g, protein_per_100g,
            carbs_per_100g, fat_per_100g, fiber_per_100g, serving_size_g,
            dietary_tags, meal_type
     FROM nutrition_foods
     ${whereClause}
     ORDER BY category, name
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) as total FROM nutrition_foods ${whereClause}`,
    params
  );
  const total = countResult[0].total;

  res.json({
    success: true,
    data: {
      foods: foods.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        category: f.category,
        caloriesPer100g: f.calories_per_100g,
        proteinPer100g: f.protein_per_100g,
        carbsPer100g: f.carbs_per_100g,
        fatPer100g: f.fat_per_100g,
        fiberPer100g: f.fiber_per_100g,
        servingSizeG: f.serving_size_g,
        dietaryTags: JSON.parse(f.dietary_tags || '[]'),
        mealType: f.meal_type
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

// Get food categories
router.get('/foods/categories', asyncHandler(async (req, res) => {
  const categories = await query(
    'SELECT DISTINCT category FROM nutrition_foods WHERE is_active = TRUE ORDER BY category'
  );

  res.json({
    success: true,
    data: categories.map(c => c.category)
  });
}));

// Get single food
router.get('/foods/:id', idParamValidator, asyncHandler(async (req, res) => {
  const foodId = req.params.id;

  const foods = await query(
    `SELECT id, name, description, category, calories_per_100g, protein_per_100g,
            carbs_per_100g, fat_per_100g, fiber_per_100g, serving_size_g,
            dietary_tags, meal_type
     FROM nutrition_foods
     WHERE id = ? AND is_active = TRUE`,
    [foodId]
  );

  if (foods.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Food not found'
    });
  }

  const f = foods[0];

  res.json({
    success: true,
    data: {
      id: f.id,
      name: f.name,
      description: f.description,
      category: f.category,
      caloriesPer100g: f.calories_per_100g,
      proteinPer100g: f.protein_per_100g,
      carbsPer100g: f.carbs_per_100g,
      fatPer100g: f.fat_per_100g,
      fiberPer100g: f.fiber_per_100g,
      servingSizeG: f.serving_size_g,
      dietaryTags: JSON.parse(f.dietary_tags || '[]'),
      mealType: f.meal_type
    }
  });
}));

// Create food (admin only)
router.post('/foods', authenticateToken, authorize('admin'), nutritionFoodValidator, asyncHandler(async (req, res) => {
  const {
    name,
    description,
    category,
    caloriesPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g,
    fiberPer100g,
    servingSizeG,
    dietaryTags,
    mealType
  } = req.body;

  const result = await query(
    `INSERT INTO nutrition_foods 
     (name, description, category, calories_per_100g, protein_per_100g, carbs_per_100g,
      fat_per_100g, fiber_per_100g, serving_size_g, dietary_tags, meal_type, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      description,
      category,
      caloriesPer100g,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
      fiberPer100g,
      servingSizeG || 100,
      JSON.stringify(dietaryTags || []),
      mealType,
      req.user.userId
    ]
  );

  logActivity(req.user.userId, 'FOOD_CREATED', { foodId: result.insertId, name });

  res.status(201).json({
    success: true,
    message: 'Food created successfully',
    data: { id: result.insertId }
  });
}));

// Update food (admin only)
router.put('/foods/:id', authenticateToken, authorize('admin'), idParamValidator, asyncHandler(async (req, res) => {
  const foodId = req.params.id;
  const {
    name,
    description,
    category,
    caloriesPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g,
    fiberPer100g,
    servingSizeG,
    dietaryTags,
    mealType,
    isActive
  } = req.body;

  const foods = await query('SELECT id FROM nutrition_foods WHERE id = ?', [foodId]);

  if (foods.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Food not found'
    });
  }

  await query(
    `UPDATE nutrition_foods SET
     name = COALESCE(?, name),
     description = COALESCE(?, description),
     category = COALESCE(?, category),
     calories_per_100g = COALESCE(?, calories_per_100g),
     protein_per_100g = COALESCE(?, protein_per_100g),
     carbs_per_100g = COALESCE(?, carbs_per_100g),
     fat_per_100g = COALESCE(?, fat_per_100g),
     fiber_per_100g = COALESCE(?, fiber_per_100g),
     serving_size_g = COALESCE(?, serving_size_g),
     dietary_tags = COALESCE(?, dietary_tags),
     meal_type = COALESCE(?, meal_type),
     is_active = COALESCE(?, is_active)
     WHERE id = ?`,
    [
      name,
      description,
      category,
      caloriesPer100g,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
      fiberPer100g,
      servingSizeG,
      dietaryTags ? JSON.stringify(dietaryTags) : null,
      mealType,
      isActive,
      foodId
    ]
  );

  logActivity(req.user.userId, 'FOOD_UPDATED', { foodId, name });

  res.json({
    success: true,
    message: 'Food updated successfully'
  });
}));

// Delete food (admin only)
router.delete('/foods/:id', authenticateToken, authorize('admin'), idParamValidator, asyncHandler(async (req, res) => {
  const foodId = req.params.id;

  const foods = await query('SELECT id FROM nutrition_foods WHERE id = ?', [foodId]);

  if (foods.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Food not found'
    });
  }

  await query('DELETE FROM nutrition_foods WHERE id = ?', [foodId]);

  logActivity(req.user.userId, 'FOOD_DELETED', { foodId });

  res.json({
    success: true,
    message: 'Food deleted successfully'
  });
}));

module.exports = router;
