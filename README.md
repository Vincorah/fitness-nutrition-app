# Fitness & Nutrition Recommendation System

A comprehensive full-stack web application for personalized fitness and nutrition recommendations based on user health metrics.

## Features

### User Features
- **User Authentication**: Secure registration, login, logout with JWT tokens
- **Profile Management**: Update personal information and health details
- **Health Data Tracking**: Record weight, height, age, activity level, and goals
- **Health Calculations**: Automatic BMI, BMR, and TDEE calculations
- **Personalized Recommendations**: Fitness and nutrition plans based on health data
- **Progress Tracking**: View health metrics history with charts
- **Content Library**: Browse exercises and nutrition foods

### Admin Features
- **User Management**: View, activate/deactivate, change roles, reset passwords
- **Content Management**: Add, edit, delete exercises and nutrition foods
- **System Statistics**: Dashboard with user stats, health metrics, and activity logs
- **Database Monitoring**: View table sizes and system health

## Tech Stack

### Backend
- **Node.js** + **Express.js** - Server framework
- **MySQL** - Database
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **Helmet** - Security headers
- **Winston** - Logging

### Frontend
- **HTML5** + **CSS3** + **JavaScript** (Vanilla)
- **Chart.js** - Data visualization
- **Font Awesome** - Icons
- **Responsive Design** - Mobile-friendly

## Project Structure

```
fitness-nutrition-app/
├── backend/
│   ├── config/
│   │   └── database.js          # MySQL connection pool
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication & role authorization
│   │   ├── errorHandler.js      # Global error handling
│   │   └── logger.js            # Request logging
│   ├── routes/
│   │   ├── auth.routes.js       # Authentication endpoints
│   │   ├── user.routes.js       # User profile management
│   │   ├── health.routes.js     # Health data & calculations
│   │   ├── recommendation.routes.js  # Recommendations
│   │   ├── content.routes.js    # Exercise & nutrition content
│   │   └── admin.routes.js      # Admin management
│   ├── utils/
│   │   ├── validators.js        # Input validation
│   │   ├── healthCalculations.js # BMI, BMR, TDEE calculations
│   │   └── logger.js            # Winston logger
│   ├── logs/                    # Log files
│   ├── server.js                # Main server file
│   ├── package.json
│   └── .env.example             # Environment variables template
├── frontend/
│   ├── css/
│   │   └── style.css            # Main stylesheet
│   ├── js/
│   │   ├── main.js              # Shared utilities
│   │   └── auth.js              # Authentication functions
│   ├── pages/
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── dashboard.html
│   │   ├── health.html
│   │   ├── recommendations.html
│   │   ├── content.html
│   │   ├── profile.html
│   │   └── admin.html
│   └── index.html               # Landing page
├── database/
│   └── schema.sql               # Database schema
└── README.md
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v5.7 or higher)

### Step 1: Database Setup

1. Create the database:
```bash
mysql -u root -p < database/schema.sql
```

2. Or manually run the SQL script in your MySQL client.

### Step 2: Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Edit `.env` with your configuration:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fitness_nutrition_db
DB_USER=root
DB_PASSWORD=your_password

JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=24h

PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5500
```

5. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### Step 3: Frontend Setup

The frontend consists of static HTML files. You can serve them using any static file server:

**Option 1: VS Code Live Server**
- Install the "Live Server" extension
- Right-click on `frontend/index.html` and select "Open with Live Server"

**Option 2: Python Simple HTTP Server**
```bash
cd frontend
python -m http.server 5500
```

**Option 3: Node.js http-server**
```bash
npm install -g http-server
cd frontend
http-server -p 5500
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/change-password` - Change password

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/info` - Update basic info
- `GET /api/users/metrics-history` - Get health metrics history
- `GET /api/users/activity-logs` - Get activity logs
- `DELETE /api/users/account` - Delete account

### Health
- `POST /api/health/metrics` - Submit health data
- `GET /api/health/metrics` - Get metrics history
- `GET /api/health/metrics/latest` - Get latest metrics
- `GET /api/health/metrics/:id` - Get specific metric
- `DELETE /api/health/metrics/:id` - Delete metric
- `GET /api/health/summary` - Get dashboard summary
- `POST /api/health/calculate` - Calculate without saving

### Recommendations
- `GET /api/recommendations/fitness` - Get fitness recommendations
- `GET /api/recommendations/nutrition` - Get nutrition recommendations
- `GET /api/recommendations/latest` - Get latest recommendations
- `PATCH /api/recommendations/fitness/:id/complete` - Mark fitness as complete
- `PATCH /api/recommendations/nutrition/:id/complete` - Mark nutrition as complete
- `GET /api/recommendations/stats` - Get recommendation stats

### Content
- `GET /api/content/exercises` - List exercises
- `GET /api/content/exercises/:id` - Get exercise details
- `POST /api/content/exercises` - Create exercise (admin)
- `PUT /api/content/exercises/:id` - Update exercise (admin)
- `DELETE /api/content/exercises/:id` - Delete exercise (admin)
- `GET /api/content/foods` - List foods
- `GET /api/content/foods/:id` - Get food details
- `POST /api/content/foods` - Create food (admin)
- `PUT /api/content/foods/:id` - Update food (admin)
- `DELETE /api/content/foods/:id` - Delete food (admin)

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - Get user details
- `PATCH /api/admin/users/:id/role` - Change user role
- `PATCH /api/admin/users/:id/status` - Toggle user status
- `POST /api/admin/users/:id/reset-password` - Reset password
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/dashboard-stats` - Get dashboard statistics
- `GET /api/admin/logs` - Get system logs
- `DELETE /api/admin/logs` - Clear old logs
- `GET /api/admin/db-stats` - Get database statistics

## Health Calculations

### BMI (Body Mass Index)
```
BMI = weight(kg) / height(m)²
```
Categories:
- Underweight: < 18.5
- Normal: 18.5 - 24.9
- Overweight: 25 - 29.9
- Obese: ≥ 30

### BMR (Basal Metabolic Rate)
Using Mifflin-St Jeor Equation:
```
Men: BMR = 10 × weight + 6.25 × height - 5 × age + 5
Women: BMR = 10 × weight + 6.25 × height - 5 × age - 161
```

### TDEE (Total Daily Energy Expenditure)
```
TDEE = BMR × Activity Multiplier
```
Activity Multipliers:
- Sedentary: 1.2
- Light: 1.375
- Moderate: 1.55
- Active: 1.725
- Very Active: 1.9

### Target Calories
```
Target = TDEE + Goal Adjustment
```
Goal Adjustments:
- Lose Weight: -500 calories
- Maintain: 0 calories
- Gain Weight: +500 calories
- Build Muscle: +300 calories

## Security Features

- **Password Hashing**: bcryptjs with salt rounds 12
- **JWT Authentication**: Secure tokens with expiration
- **Input Validation**: express-validator for all inputs
- **Rate Limiting**: Prevent brute force attacks
- **Helmet**: Security headers
- **CORS**: Configured for specific origins
- **SQL Injection Protection**: Parameterized queries

## Default Admin Account

After database setup, a default admin account is created:
- Email: `admin@fitnessapp.com`
- Password: `admin123`

**Important**: Change the default password immediately after first login!

## Screenshots

### Landing Page
- Hero section with call-to-action
- Features overview
- Statistics display

### Dashboard
- Health metrics summary
- Latest recommendations
- Quick actions
- Weight history chart

### Health Data
- Form for entering health metrics
- History table with pagination
- Quick calculator

### Recommendations
- Fitness plans with exercises
- Nutrition plans with macros
- Completion tracking

### Admin Panel
- User management
- Content management
- System statistics

## Development

### Running Tests
```bash
npm test
```

### Code Style
- ESLint for JavaScript linting
- Consistent indentation (2 spaces)
- Meaningful variable names
- JSDoc comments for functions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions, please create an issue in the repository or contact support@fitnutrition.com.

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Social features (friends, challenges)
- [ ] Integration with fitness devices
- [ ] AI-powered recommendations
- [ ] Meal planning with recipes
- [ ] Workout videos
- [ ] Push notifications
- [ ] Email reports
