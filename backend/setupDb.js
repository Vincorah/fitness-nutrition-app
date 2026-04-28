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
    
    console.log("Updating users table with reset_token columns...");
    
    try {
      await connection.query('ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) NULL');
      console.log("Added reset_token column.");
    } catch (e) {
      console.log("reset_token column might already exist:", e.message);
    }

    try {
      await connection.query('ALTER TABLE users ADD COLUMN reset_expires DATETIME NULL');
      console.log("Added reset_expires column.");
    } catch (e) {
      console.log("reset_expires column might already exist:", e.message);
    }
    
    console.log("✅ Database schema successfully updated!");
    await connection.end();
    return true;
  } catch (error) {
    console.error("❌ Error setting up database:", error);
    throw error;
  }
}

module.exports = setupDatabase;
