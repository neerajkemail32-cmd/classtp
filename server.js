// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./db'); // your db.js

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public')); // serve frontend files

// ===================== USER REGISTRATION =====================
app.post('/register', async (req, res) => {
  try {
    const { fullName, email, mobile, password } = req.body;
    const role = 'student';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = 'INSERT INTO users (fullName, email, mobile, password, role) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [fullName, email, mobile, hashedPassword, role], (err) => {
      if (err) {
        console.error('❌ Error inserting user:', err);
        return res.status(500).send('Error registering user');
      }
      res.send('✅ User registered successfully');
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// ===================== LOGIN =====================
app.post('/login', (req, res) => {
  const { email, password, role } = req.body;

  const sql = 'SELECT * FROM users WHERE email = ? AND role = ?';
  db.query(sql, [email, role], async (err, results) => {
    if (err) return res.status(500).send('Server error');

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    res.json({ success: true, role: user.role, email: user.email });
  });
});

// ===================== STUDENT ROUTES =====================
app.get('/students', (req, res) => {
  const sql = 'SELECT * FROM students';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send('Server error');
    res.json(results);
  });
});

app.get('/students/email/:email', (req, res) => {
  const sql = 'SELECT * FROM students WHERE email = ?';
  db.query(sql, [req.params.email], (err, results) => {
    if (err) return res.status(500).send('Server error');
    if (results.length === 0) return res.status(404).send('Student not found');
    res.json(results[0]);
  });
});

app.post('/students/email/:email', (req, res) => {
  const { fullName, mobile, batch } = req.body;
  const email = req.params.email;

  const checkSql = 'SELECT * FROM students WHERE email = ?';
  db.query(checkSql, [email], (err, results) => {
    if (err) return res.status(500).send('Server error');

    if (results.length > 0) {
      const updateSql = 'UPDATE students SET fullName = ?, mobile = ?, batch = ? WHERE email = ?';
      db.query(updateSql, [fullName, mobile, batch, email], (err2) => {
        if (err2) return res.status(500).send('Failed to update student');
        res.send('Student updated successfully');
      });
    } else {
      const insertSql = 'INSERT INTO students (fullName, email, mobile, batch) VALUES (?, ?, ?, ?)';
      db.query(insertSql, [fullName, email, mobile, batch], (err3) => {
        if (err3) return res.status(500).send('Failed to insert student');
        res.send('Student added successfully');
      });
    }
  });
});

app.put('/students/:id', (req, res) => {
  const { fullName, email, mobile, batch } = req.body;
  const sql = 'UPDATE students SET fullName = ?, email = ?, mobile = ?, batch = ? WHERE id = ?';
  db.query(sql, [fullName, email, mobile, batch, req.params.id], (err) => {
    if (err) return res.status(500).send('Error updating student');
    res.send('Student updated successfully');
  });
});

app.delete('/students/:id', (req, res) => {
  const sql = 'DELETE FROM students WHERE id = ?';
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).send('Error deleting student');
    res.send('Student deleted successfully');
  });
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
