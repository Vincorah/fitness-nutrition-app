-- Fitness & Nutrition Recommendation System Database Schema

CREATE DATABASE IF NOT EXISTS fitness_nutrition_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fitness_nutrition_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    reset_token VARCHAR(255) NULL,
    reset_expires DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- User profiles table
CREATE TABLE user_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    date_of_birth DATE,
    sex ENUM('male', 'female', 'other'),
    height_cm DECIMAL(5,2),
    target_weight_kg DECIMAL(5,2),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Health metrics history table
CREATE TABLE health_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    weight_kg DECIMAL(5,2) NOT NULL,
    height_cm DECIMAL(5,2) NOT NULL,
    age INT NOT NULL,
    sex ENUM('male', 'female', 'other') NOT NULL,
    activity_level ENUM('sedentary', 'light', 'moderate', 'active', 'very_active') NOT NULL,
    goal ENUM('lose_weight', 'maintain', 'gain_weight', 'build_muscle') NOT NULL,
    bmi DECIMAL(5,2),
    bmr DECIMAL(7,2),
    tdee DECIMAL(7,2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Exercise content table
CREATE TABLE exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category ENUM('cardio', 'strength', 'flexibility', 'balance', 'hiit', 'sports') NOT NULL,
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
    muscle_groups JSON,
    equipment_needed JSON,
    duration_minutes INT,
    calories_burned_per_hour INT,
    instructions TEXT,
    video_url VARCHAR(500),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Nutrition content table
CREATE TABLE nutrition_foods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category ENUM('protein', 'carbohydrate', 'fat', 'vegetable', 'fruit', 'dairy', 'grain', 'snack', 'beverage') NOT NULL,
    calories_per_100g DECIMAL(6,2),
    protein_per_100g DECIMAL(5,2),
    carbs_per_100g DECIMAL(5,2),
    fat_per_100g DECIMAL(5,2),
    fiber_per_100g DECIMAL(5,2),
    serving_size_g INT DEFAULT 100,
    dietary_tags JSON,
    meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack', 'any') DEFAULT 'any',
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Fitness recommendations table
CREATE TABLE fitness_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    metric_id INT NOT NULL,
    recommendation_type ENUM('workout_plan', 'exercise', 'activity') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    exercises JSON,
    frequency VARCHAR(100),
    duration VARCHAR(100),
    intensity VARCHAR(50),
    calories_burn_target INT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (metric_id) REFERENCES health_metrics(id) ON DELETE CASCADE
);

-- Nutrition recommendations table
CREATE TABLE nutrition_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    metric_id INT NOT NULL,
    recommendation_type ENUM('meal_plan', 'diet', 'food_item') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    daily_calories INT,
    protein_g INT,
    carbs_g INT,
    fat_g INT,
    fiber_g INT,
    meal_suggestions JSON,
    dietary_restrictions JSON,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (metric_id) REFERENCES health_metrics(id) ON DELETE CASCADE
);

-- User activity logs table
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- System logs table
CREATE TABLE system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level ENUM('info', 'warn', 'error', 'debug') NOT NULL,
    message TEXT NOT NULL,
    context JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123 - should be changed)
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('admin@fitnessapp.com', '$2b$10$YourHashedPasswordHere', 'Admin', 'User', 'admin');

-- Insert sample exercises
INSERT INTO exercises (name, description, category, difficulty_level, muscle_groups, equipment_needed, duration_minutes, calories_burned_per_hour, instructions) VALUES
('Running', 'Cardiovascular exercise for overall fitness', 'cardio', 'beginner', '["legs", "core"]', '["none"]', 30, 600, 'Start with a warm-up walk, then jog at a comfortable pace. Gradually increase speed and duration.'),
('Push-ups', 'Upper body strength exercise', 'strength', 'beginner', '["chest", "shoulders", "triceps"]', '["none"]', 15, 300, 'Start in plank position, lower body until chest nearly touches floor, push back up.'),
('Squats', 'Lower body strength exercise', 'strength', 'beginner', '["quadriceps", "glutes", "hamstrings"]', '["none"]', 20, 400, 'Stand with feet shoulder-width apart, lower hips back and down as if sitting in a chair.'),
('Yoga Flow', 'Flexibility and mindfulness practice', 'flexibility', 'intermediate', '["full_body"]', '["yoga_mat"]', 45, 200, 'Follow a sequence of yoga poses focusing on breath and movement.'),
('HIIT Circuit', 'High-intensity interval training', 'hiit', 'advanced', '["full_body"]', '["none"]', 30, 800, 'Alternate between 30 seconds high-intensity exercise and 15 seconds rest.'),
('Plank', 'Core strengthening exercise', 'strength', 'beginner', '["core"]', '["none"]', 5, 150, 'Hold plank position with body in straight line from head to heels.'),
('Jumping Jacks', 'Full body cardio exercise', 'cardio', 'beginner', '["full_body"]', '["none"]', 10, 500, 'Jump while spreading legs and raising arms overhead, then return to starting position.'),
('Deadlifts', 'Compound strength exercise', 'strength', 'intermediate', '["back", "legs", "core"]', '["barbell"]', 30, 450, 'Lift barbell from ground to hip level while keeping back straight.'),
('Cycling', 'Low-impact cardio exercise', 'cardio', 'beginner', '["legs"]', '["bicycle"]', 45, 500, 'Pedal at moderate to high intensity for cardiovascular benefit.'),
('Meditation', 'Mental wellness practice', 'balance', 'beginner', '["mind"]', '["none"]', 20, 50, 'Sit comfortably, focus on breath, let thoughts pass without judgment.');

-- Insert sample nutrition foods
INSERT INTO nutrition_foods (name, description, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, dietary_tags, meal_type) VALUES
('Chicken Breast', 'Lean protein source', 'protein', 165, 31, 0, 3.6, 0, '["high_protein", "low_carb"]', 'any'),
('Brown Rice', 'Whole grain carbohydrate', 'grain', 112, 2.6, 23, 0.9, 1.8, '["whole_grain", "vegan"]', 'any'),
('Salmon', 'Fatty fish rich in omega-3', 'protein', 208, 20, 0, 13, 0, '["high_protein", "omega3"]', 'any'),
('Broccoli', 'Nutrient-dense vegetable', 'vegetable', 34, 2.8, 7, 0.4, 2.6, '["low_calorie", "vegan", "high_fiber"]', 'any'),
('Greek Yogurt', 'Protein-rich dairy', 'dairy', 59, 10, 3.6, 0.4, 0, '["high_protein", "probiotic"]', 'breakfast'),
('Oats', 'Heart-healthy grain', 'grain', 389, 16.9, 66, 6.9, 10.6, '["whole_grain", "vegan", "high_fiber"]', 'breakfast'),
('Avocado', 'Healthy fat source', 'fat', 160, 2, 8.5, 14.7, 6.7, '["healthy_fat", "vegan"]', 'any'),
('Eggs', 'Complete protein source', 'protein', 155, 13, 1.1, 11, 0, '["high_protein", "keto_friendly"]', 'breakfast'),
('Spinach', 'Iron-rich leafy green', 'vegetable', 23, 2.9, 3.6, 0.4, 2.2, '["low_calorie", "vegan", "iron_rich"]', 'any'),
('Almonds', 'Nutrient-dense nuts', 'snack', 579, 21, 22, 50, 12.5, '["healthy_fat", "vegan", "snack"]', 'snack'),
('Banana', 'Energy-boosting fruit', 'fruit', 89, 1.1, 22.8, 0.3, 2.6, '["quick_energy", "vegan"]', 'snack'),
('Sweet Potato', 'Complex carbohydrate', 'vegetable', 86, 1.6, 20, 0.1, 3, '["complex_carb", "vegan"]', 'any'),
('Quinoa', 'Complete protein grain', 'grain', 120, 4.4, 21.3, 1.9, 2.8, '["complete_protein", "vegan"]', 'any'),
('Olive Oil', 'Healthy cooking fat', 'fat', 884, 0, 0, 100, 0, '["healthy_fat", "vegan"]', 'any'),
('Blueberries', 'Antioxidant-rich fruit', 'fruit', 57, 0.7, 14.5, 0.3, 2.4, '["antioxidants", "low_calorie"]', 'breakfast');

-- Create indexes for better performance
CREATE INDEX idx_health_metrics_user_id ON health_metrics(user_id);
CREATE INDEX idx_health_metrics_recorded_at ON health_metrics(recorded_at);
CREATE INDEX idx_fitness_recommendations_user_id ON fitness_recommendations(user_id);
CREATE INDEX idx_nutrition_recommendations_user_id ON nutrition_recommendations(user_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_difficulty ON exercises(difficulty_level);
CREATE INDEX idx_nutrition_foods_category ON nutrition_foods(category);
