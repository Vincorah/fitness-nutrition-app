/**
 * Health Calculations Utility
 * BMI, BMR, TDEE calculations and recommendation engine
 */

// Activity level multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,      // Little or no exercise
  light: 1.375,        // Light exercise 1-3 days/week
  moderate: 1.55,      // Moderate exercise 3-5 days/week
  active: 1.725,       // Hard exercise 6-7 days/week
  very_active: 1.9     // Very hard exercise, physical job
};

// Goal-based calorie adjustments
const GOAL_CALORIE_ADJUSTMENTS = {
  lose_weight: -500,    // 500 calorie deficit for ~0.5kg/week loss
  maintain: 0,          // No adjustment
  gain_weight: 500,     // 500 calorie surplus for ~0.5kg/week gain
  build_muscle: 300     // Moderate surplus for muscle building
};

/**
 * Calculate BMI (Body Mass Index)
 * Formula: weight(kg) / height(m)²
 * @param {number} weightKg - Weight in kilograms
 * @param {number} heightCm - Height in centimeters
 * @returns {Object} BMI value and category
 */
const calculateBMI = (weightKg, heightCm) => {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const roundedBMI = Math.round(bmi * 100) / 100;

  let category;
  if (bmi < 18.5) category = 'underweight';
  else if (bmi < 25) category = 'normal';
  else if (bmi < 30) category = 'overweight';
  else category = 'obese';

  return {
    value: roundedBMI,
    category,
    interpretation: getBMIInterpretation(category)
  };
};

/**
 * Get BMI interpretation
 */
const getBMIInterpretation = (category) => {
  const interpretations = {
    underweight: 'You are underweight. Consider increasing caloric intake and strength training.',
    normal: 'Your BMI is in the healthy range. Maintain your current lifestyle.',
    overweight: 'You are slightly above the healthy range. Consider moderate caloric deficit.',
    obese: 'Your BMI indicates obesity. Consult a healthcare provider for personalized advice.'
  };
  return interpretations[category];
};

/**
 * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
 * Men: 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) + 5
 * Women: 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) - 161
 * @param {number} weightKg - Weight in kilograms
 * @param {number} heightCm - Height in centimeters
 * @param {number} age - Age in years
 * @param {string} sex - 'male', 'female', or 'other'
 * @returns {number} BMR in calories/day
 */
const calculateBMR = (weightKg, heightCm, age, sex) => {
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);

  if (sex === 'male') {
    bmr += 5;
  } else if (sex === 'female') {
    bmr -= 161;
  } else {
    // For 'other', use average of male and female formulas
    bmr -= 78;
  }

  return Math.round(bmr);
};

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * Formula: BMR × Activity Multiplier
 * @param {number} bmr - Basal Metabolic Rate
 * @param {string} activityLevel - Activity level key
 * @returns {number} TDEE in calories/day
 */
const calculateTDEE = (bmr, activityLevel) => {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.2;
  return Math.round(bmr * multiplier);
};

/**
 * Calculate all health metrics at once
 * @param {Object} data - Health data object
 * @returns {Object} All calculated metrics
 */
const calculateAllMetrics = (data) => {
  const { weightKg, heightCm, age, sex, activityLevel, goal } = data;

  const bmi = calculateBMI(weightKg, heightCm);
  const bmr = calculateBMR(weightKg, heightCm, age, sex);
  const tdee = calculateTDEE(bmr, activityLevel);
  const targetCalories = tdee + (GOAL_CALORIE_ADJUSTMENTS[goal] || 0);

  // Calculate ideal weight range (BMI 18.5-24.9)
  const heightM = heightCm / 100;
  const idealWeightMin = Math.round(18.5 * heightM * heightM * 10) / 10;
  const idealWeightMax = Math.round(24.9 * heightM * heightM * 10) / 10;

  return {
    bmi: bmi.value,
    bmiCategory: bmi.category,
    bmiInterpretation: bmi.interpretation,
    bmr,
    tdee,
    targetCalories,
    idealWeightRange: {
      min: idealWeightMin,
      max: idealWeightMax
    },
    weightDifference: {
      toIdealMin: Math.round((weightKg - idealWeightMin) * 10) / 10,
      toIdealMax: Math.round((weightKg - idealWeightMax) * 10) / 10
    }
  };
};

/**
 * Generate fitness recommendations based on user data
 * @param {Object} data - User health data and metrics
 * @returns {Array} Fitness recommendations
 */
const generateFitnessRecommendations = (data) => {
  const { bmiCategory, goal, activityLevel, age } = data;
  const recommendations = [];

  // Cardio recommendations
  const cardioRec = {
    type: 'exercise',
    title: 'Cardiovascular Exercise',
    description: getCardioDescription(goal, activityLevel),
    frequency: getCardioFrequency(goal),
    duration: getCardioDuration(activityLevel),
    intensity: getCardioIntensity(goal, activityLevel),
    exercises: getCardioExercises(goal, activityLevel)
  };
  recommendations.push(cardioRec);

  // Strength training recommendations
  const strengthRec = {
    type: 'exercise',
    title: 'Strength Training',
    description: getStrengthDescription(goal, bmiCategory),
    frequency: getStrengthFrequency(goal),
    duration: '45-60 minutes',
    intensity: getStrengthIntensity(goal),
    exercises: getStrengthExercises(goal, activityLevel)
  };
  recommendations.push(strengthRec);

  // Flexibility recommendations
  const flexibilityRec = {
    type: 'exercise',
    title: 'Flexibility & Recovery',
    description: 'Improve mobility and prevent injuries with regular stretching.',
    frequency: 'Daily',
    duration: '10-15 minutes',
    intensity: 'Low',
    exercises: ['Static stretching', 'Yoga poses', 'Foam rolling']
  };
  recommendations.push(flexibilityRec);

  // Goal-specific recommendations
  if (goal === 'build_muscle') {
    recommendations.push({
      type: 'workout_plan',
      title: 'Progressive Overload',
      description: 'Gradually increase weights or reps to stimulate muscle growth.',
      frequency: 'Every workout',
      duration: 'N/A',
      intensity: 'High',
      exercises: ['Compound lifts', 'Progressive resistance training']
    });
  }

  return recommendations;
};

/**
 * Generate nutrition recommendations based on user data
 * @param {Object} data - User health data and metrics
 * @returns {Object} Nutrition recommendations
 */
const generateNutritionRecommendations = (data) => {
  const { targetCalories, goal, weightKg, bmiCategory } = data;

  // Macronutrient distribution based on goal
  const macros = calculateMacros(targetCalories, goal, weightKg);

  // Meal distribution
  const meals = {
    breakfast: Math.round(targetCalories * 0.25),
    lunch: Math.round(targetCalories * 0.35),
    dinner: Math.round(targetCalories * 0.30),
    snacks: Math.round(targetCalories * 0.10)
  };

  // Food recommendations based on goal
  const recommendedFoods = getRecommendedFoods(goal, bmiCategory);
  const foodsToLimit = getFoodsToLimit(goal);

  // Hydration recommendation
  const waterIntake = Math.round(weightKg * 0.033 * 10) / 10; // ~33ml per kg

  return {
    dailyCalories: targetCalories,
    macros,
    meals,
    recommendedFoods,
    foodsToLimit,
    hydration: {
      dailyLiters: waterIntake,
      glasses: Math.round(waterIntake * 4) // Assuming 250ml glasses
    },
    tips: getNutritionTips(goal)
  };
};

/**
 * Calculate macronutrients based on goal
 */
const calculateMacros = (calories, goal, weightKg) => {
  let proteinRatio, carbRatio, fatRatio;

  switch (goal) {
    case 'lose_weight':
      proteinRatio = 0.40;
      carbRatio = 0.30;
      fatRatio = 0.30;
      break;
    case 'gain_weight':
      proteinRatio = 0.25;
      carbRatio = 0.50;
      fatRatio = 0.25;
      break;
    case 'build_muscle':
      proteinRatio = 0.35;
      carbRatio = 0.40;
      fatRatio = 0.25;
      break;
    default: // maintain
      proteinRatio = 0.30;
      carbRatio = 0.40;
      fatRatio = 0.30;
  }

  const proteinGrams = Math.round((calories * proteinRatio) / 4);
  const carbGrams = Math.round((calories * carbRatio) / 4);
  const fatGrams = Math.round((calories * fatRatio) / 9);

  // Ensure minimum protein (1.6-2.2g per kg for active individuals)
  const minProtein = Math.round(weightKg * 1.6);
  const finalProtein = Math.max(proteinGrams, minProtein);

  return {
    protein: {
      grams: finalProtein,
      calories: finalProtein * 4,
      percentage: Math.round((finalProtein * 4 / calories) * 100)
    },
    carbs: {
      grams: carbGrams,
      calories: carbGrams * 4,
      percentage: Math.round((carbGrams * 4 / calories) * 100)
    },
    fat: {
      grams: fatGrams,
      calories: fatGrams * 9,
      percentage: Math.round((fatGrams * 9 / calories) * 100)
    }
  };
};

// Helper functions for fitness recommendations
const getCardioDescription = (goal, activityLevel) => {
  if (goal === 'lose_weight') {
    return 'Focus on moderate-intensity cardio to maximize fat burning while preserving muscle.';
  } else if (goal === 'build_muscle') {
    return 'Include cardio for heart health but keep it moderate to support muscle growth.';
  }
  return 'Maintain cardiovascular fitness with regular aerobic exercise.';
};

const getCardioFrequency = (goal) => {
  if (goal === 'lose_weight') return '5-6 times per week';
  if (goal === 'build_muscle') return '2-3 times per week';
  return '3-4 times per week';
};

const getCardioDuration = (activityLevel) => {
  if (activityLevel === 'sedentary') return '20-30 minutes';
  if (activityLevel === 'light') return '30-45 minutes';
  return '45-60 minutes';
};

const getCardioIntensity = (goal, activityLevel) => {
  if (goal === 'lose_weight') return 'Moderate (60-70% max heart rate)';
  if (goal === 'build_muscle') return 'Low-Moderate (50-65% max heart rate)';
  return 'Moderate (60-75% max heart rate)';
};

const getCardioExercises = (goal, activityLevel) => {
  const exercises = ['Walking', 'Jogging', 'Cycling'];
  if (activityLevel !== 'sedentary') {
    exercises.push('Swimming', 'Elliptical');
  }
  if (goal === 'lose_weight' || activityLevel === 'active' || activityLevel === 'very_active') {
    exercises.push('Running', 'HIIT');
  }
  return exercises;
};

const getStrengthDescription = (goal, bmiCategory) => {
  if (goal === 'build_muscle') {
    return 'Focus on compound movements with progressive overload for maximum muscle growth.';
  } else if (goal === 'lose_weight') {
    return 'Strength training helps preserve muscle mass during weight loss and boosts metabolism.';
  }
  return 'Maintain muscle mass and bone density with regular resistance training.';
};

const getStrengthFrequency = (goal) => {
  if (goal === 'build_muscle') return '4-5 times per week';
  if (goal === 'lose_weight') return '3-4 times per week';
  return '2-3 times per week';
};

const getStrengthIntensity = (goal) => {
  if (goal === 'build_muscle') return 'High (70-85% 1RM)';
  return 'Moderate (60-75% 1RM)';
};

const getStrengthExercises = (goal, activityLevel) => {
  const beginner = ['Push-ups', 'Bodyweight squats', 'Planks', 'Lunges'];
  const intermediate = ['Bench press', 'Deadlifts', 'Overhead press', 'Rows', 'Pull-ups'];
  const advanced = ['Barbell squats', 'Romanian deadlifts', 'Incline press', 'Weighted dips'];

  if (activityLevel === 'sedentary' || activityLevel === 'light') return beginner;
  if (activityLevel === 'moderate' || activityLevel === 'active') return [...beginner, ...intermediate];
  return [...beginner, ...intermediate, ...advanced];
};

// Helper functions for nutrition
const getRecommendedFoods = (goal, bmiCategory) => {
  const baseFoods = {
    proteins: ['Chicken breast', 'Fish', 'Eggs', 'Greek yogurt', 'Legumes'],
    vegetables: ['Broccoli', 'Spinach', 'Kale', 'Bell peppers', 'Carrots'],
    fruits: ['Berries', 'Apples', 'Oranges', 'Bananas'],
    grains: ['Brown rice', 'Quinoa', 'Oats', 'Whole wheat bread']
  };

  if (goal === 'build_muscle') {
    baseFoods.proteins.push('Lean beef', 'Whey protein', 'Turkey');
    baseFoods.grains.push('Sweet potatoes', 'Pasta');
  }

  if (goal === 'lose_weight') {
    baseFoods.vegetables.push('Cucumber', 'Celery', 'Zucchini');
  }

  return baseFoods;
};

const getFoodsToLimit = (goal) => {
  const common = ['Sugary drinks', 'Processed snacks', 'Fast food', 'Alcohol'];
  
  if (goal === 'lose_weight') {
    return [...common, 'High-calorie desserts', 'Fried foods', 'Refined grains'];
  }
  
  return common;
};

const getNutritionTips = (goal) => {
  const tips = {
    lose_weight: [
      'Eat protein with every meal to stay full longer',
      'Focus on volume eating with low-calorie, high-fiber foods',
      'Drink water before meals to reduce hunger',
      'Plan meals ahead to avoid impulsive eating'
    ],
    maintain: [
      'Maintain consistent meal timing',
      'Listen to hunger and fullness cues',
      'Balance indulgences with nutritious meals',
      'Stay hydrated throughout the day'
    ],
    gain_weight: [
      'Eat calorie-dense foods like nuts, avocados, and dried fruits',
      'Have healthy snacks between meals',
      'Drink calories through smoothies and shakes',
      'Focus on nutrient-rich foods, not just calories'
    ],
    build_muscle: [
      'Consume protein within 30 minutes post-workout',
      'Eat carbohydrates to fuel intense training',
      'Stay in a slight caloric surplus',
      'Prioritize sleep for recovery and growth'
    ]
  };

  return tips[goal] || tips.maintain;
};

module.exports = {
  calculateBMI,
  calculateBMR,
  calculateTDEE,
  calculateAllMetrics,
  generateFitnessRecommendations,
  generateNutritionRecommendations,
  ACTIVITY_MULTIPLIERS,
  GOAL_CALORIE_ADJUSTMENTS
};
