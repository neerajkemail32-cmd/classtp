// db.js
const mysql = require('mysql2');

// ✅ Use createPool instead of createConnection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,  // queue queries if all connections are busy
  connectionLimit: 10,       // max 10 connections at once
  queueLimit: 0              // unlimited queued queries
});

console.log("✅ MySQL Pool initialized");

module.exports = pool;
