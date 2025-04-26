const mysql = require('mysql')
require('dotenv').config();

// Log database configuration (without password)
console.log("Attempting DB connection with:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  // Don't log the actual password
  hasPassword: !!process.env.DB_PASSWORD
});

// Create a connection pool instead of a single connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Add some resilience options
  connectionLimit: 10,
  connectTimeout: 60000, // 60 seconds
  acquireTimeout: 60000, // 60 seconds
  waitForConnections: true,
  queueLimit: 0
});

// Create a wrapper for the pool to handle errors better
const db = {
  query: function(sql, args) {
    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          console.error("Database connection error:", err);
          return reject(err);
        }
        
        // Use the connection
        connection.query(sql, args, (err, rows) => {
          // Release the connection back to the pool
          connection.release();
          
          if (err) {
            console.error("Query error:", err);
            return reject(err);
          }
          
          resolve(rows);
        });
      });
    });
  }
};

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Initial database connection failed:', err);
    // Don't throw here, just log the error
  } else {
    console.log('Connected to database successfully!');
    connection.release();
  }
});

module.exports = db;