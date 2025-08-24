// db.js
const mysql = require('mysql2');

// Use Render environment variables with your naming
const db = mysql.createConnection({
  host: process.env.DB_HOST,         // e.g., bo1ajjombryyob3pgecm-mysql.services.clever-cloud.com
  user: process.env.DB_USER,         // e.g., uvjszeaqytp22g2p
  password: process.env.DB_PASS,     // e.g., z2STmIrdkQABoFtYjcW8
  database: process.env.DB_NAME,     // e.g., bo1ajjombryyob3pgecm
  port: process.env.DB_PORT || 3306
});

db.connect((err) => {
  if (err) {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1); // Stop server if DB fails
  }
  console.log('✅ Connected to MySQL Database!');
});

module.exports = db;
