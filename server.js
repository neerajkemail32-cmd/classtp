const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files (html/css/js)

// MySQL Connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'tuition_db'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('✅ Connected to MySQL');
});


// ===================== USER REGISTRATION =====================
app.post('/register', (req, res) => {
  const { fullName, email, mobile, password } = req.body;
  const role = 'student';

  const sql = 'INSERT INTO users (fullName, email, mobile, password, role) VALUES (?, ?, ?, ?, ?)';
  connection.query(sql, [fullName, email, mobile, password, role], (err) => {
    if (err) {
      console.error('❌ Error inserting user:', err);
      return res.status(500).send('Error registering user');
    }
    res.send('✅ User registered successfully');
  });
});


// ===================== LOGIN =====================
app.post('/login', (req, res) => {
  const { email, password, role } = req.body;

  const sql = 'SELECT * FROM users WHERE email = ? AND password = ? AND role = ?';
  connection.query(sql, [email, password, role], (err, results) => {
    if (err) return res.status(500).send('Server error');

    if (results.length > 0) {
      // Send login success with role so frontend can redirect
      res.json({ success: true, role: results[0].role, email: results[0].email });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });
});


// ===================== STUDENT DETAILS =====================

// Get student details by email
app.get('/students/email/:email', (req, res) => {
  const email = req.params.email;
  const sql = 'SELECT * FROM students WHERE email = ?';
  connection.query(sql, [email], (err, results) => {
    if (err) return res.status(500).send('Server error');
    if (results.length === 0) return res.status(404).send('Student not found');
    res.json(results[0]);
  });
});

// Insert or update student details
app.post('/students/email/:email', (req, res) => {
  const email = req.params.email;
  const { fullName, mobile, batch } = req.body;

  const checkSql = 'SELECT * FROM students WHERE email = ?';
  connection.query(checkSql, [email], (err, results) => {
    if (err) return res.status(500).send('Server error');

    if (results.length > 0) {
      // Update existing record
      const updateSql = 'UPDATE students SET fullName = ?, mobile = ?, batch = ? WHERE email = ?';
      connection.query(updateSql, [fullName, mobile, batch, email], (err2) => {
        if (err2) return res.status(500).send('Failed to update student');
        res.send('Student updated successfully');
      });
    } else {
      // Insert new record
      const insertSql = 'INSERT INTO students (fullName, email, mobile, batch) VALUES (?, ?, ?, ?)';
      connection.query(insertSql, [fullName, email, mobile, batch], (err3) => {
        if (err3) return res.status(500).send('Failed to insert student');
        res.send('Student added successfully');
      });
    }
  });
});


// ===================== ADMIN USE ONLY =====================

// Get all students
app.get('/students', (req, res) => {
  const sql = 'SELECT * FROM students';
  connection.query(sql, (err, results) => {
    if (err) return res.status(500).send('Server error');
    res.json(results);
  });
});

// Update student by ID
app.put('/students/:id', (req, res) => {
  const studentId = req.params.id;
  const { fullName, email, mobile, batch } = req.body;
  const sql = 'UPDATE students SET fullName = ?, email = ?, mobile = ?, batch = ? WHERE id = ?';
  connection.query(sql, [fullName, email, mobile, batch, studentId], (err) => {
    if (err) return res.status(500).send('Error updating student');
    res.send('Student updated successfully');
  });
});

// Delete student by ID
app.delete('/students/:id', (req, res) => {
  const studentId = req.params.id;
  const sql = 'DELETE FROM students WHERE id = ?';
  connection.query(sql, [studentId], (err) => {
    if (err) return res.status(500).send('Error deleting student');
    res.send('Student deleted successfully');
  });
});


// ===================== START SERVER =====================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
