require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function setupDatabase() {
  console.log("Connecting to database...");
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: {
        rejectUnauthorized: false
      },
      multipleStatements: true // Required to run multiple queries at once
    });

    console.log("Successfully connected. Reading schema.sql...");
    
    // Read the schema.sql file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    let sql = fs.readFileSync(schemaPath, 'utf8');

    // Remove the CREATE DATABASE and USE statements as Aiven handles DB creation
    sql = sql.replace(/CREATE DATABASE IF NOT EXISTS fitness_nutrition_db[^;]+;/g, '');
    sql = sql.replace(/USE fitness_nutrition_db;/g, '');

    console.log("Executing schema. This might take a few seconds...");
    
    await connection.query(sql);
    
    console.log("✅ Database schema and sample data successfully imported!");
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up database:", error);
    process.exit(1);
  }
}

setupDatabase();
