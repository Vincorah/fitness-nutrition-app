/**
 * Input Validation Utilities
 * Validation functions for various inputs
 */

const { body, param, query, validationResult } = require('express-validator');

// Helper to check validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Auth validators
const registerValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  handleValidationErrors
];

const loginValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// User profile validators
const updateProfileValidator = [
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Valid date of birth is required'),
  body('sex')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Sex must be male, female, or other'),
  body('heightCm')
    .optional()
    .isFloat({ min: 50, max: 300 })
    .withMessage('Height must be between 50 and 300 cm'),
  body('targetWeightKg')
    .optional()
    .isFloat({ min: 20, max: 500 })
    .withMessage('Target weight must be between 20 and 500 kg'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s\-+()]+$/)
    .withMessage('Valid phone number is required'),
  handleValidationErrors
];

// Health metrics validators
const healthMetricsValidator = [
  body('weightKg')
    .isFloat({ min: 20, max: 500 })
    .withMessage('Weight must be between 20 and 500 kg'),
  body('heightCm')
    .isFloat({ min: 50, max: 300 })
    .withMessage('Height must be between 50 and 300 cm'),
  body('age')
    .isInt({ min: 10, max: 120 })
    .withMessage('Age must be between 10 and 120'),
  body('sex')
    .isIn(['male', 'female', 'other'])
    .withMessage('Sex must be male, female, or other'),
  body('activityLevel')
    .isIn(['sedentary', 'light', 'moderate', 'active', 'very_active'])
    .withMessage('Activity level must be one of: sedentary, light, moderate, active, very_active'),
  body('goal')
    .isIn(['lose_weight', 'maintain', 'gain_weight', 'build_muscle'])
    .withMessage('Goal must be one of: lose_weight, maintain, gain_weight, build_muscle'),
  handleValidationErrors
];

// Exercise validators
const exerciseValidator = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Exercise name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('category')
    .isIn(['cardio', 'strength', 'flexibility', 'balance', 'hiit', 'sports'])
    .withMessage('Invalid category'),
  body('difficultyLevel')
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty level must be beginner, intermediate, or advanced'),
  body('durationMinutes')
    .optional()
    .isInt({ min: 1, max: 300 })
    .withMessage('Duration must be between 1 and 300 minutes'),
  body('caloriesBurnedPerHour')
    .optional()
    .isInt({ min: 0, max: 2000 })
    .withMessage('Calories burned per hour must be between 0 and 2000'),
  handleValidationErrors
];

// Nutrition food validators
const nutritionFoodValidator = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Food name must be between 2 and 200 characters'),
  body('category')
    .isIn(['protein', 'carbohydrate', 'fat', 'vegetable', 'fruit', 'dairy', 'grain', 'snack', 'beverage'])
    .withMessage('Invalid category'),
  body('caloriesPer100g')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Calories per 100g must be between 0 and 1000'),
  body('proteinPer100g')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Protein per 100g must be between 0 and 100'),
  body('carbsPer100g')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Carbs per 100g must be between 0 and 100'),
  body('fatPer100g')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Fat per 100g must be between 0 and 100'),
  handleValidationErrors
];

// Pagination validators
const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// ID parameter validator
const idParamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors
];

// Date range validators
const dateRangeValidator = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  handleValidationErrors
];

module.exports = {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  healthMetricsValidator,
  exerciseValidator,
  nutritionFoodValidator,
  paginationValidator,
  idParamValidator,
  dateRangeValidator,
  handleValidationErrors,
};
