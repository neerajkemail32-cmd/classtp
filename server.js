require('dotenv').config(); // Load env variables

const express = require('express');
const db = require('./db'); // Your db.js connection
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// ===================== MIDDLEWARE =====================
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files

// ===================== USER REGISTRATION =====================
app.post('/register', (req, res) => {
    const { fullName, email, mobile, password } = req.body;
    const role = 'student';

    const sql = 'INSERT INTO users (fullName, email, mobile, password, role) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [fullName, email, mobile, password, role], (err) => {
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
    db.query(sql, [email, password, role], (err, results) => {
        if (err) {
            console.error('❌ Login error:', err);
            return res.status(500).send('Server error');
        }

        if (results.length > 0) {
            res.json({ success: true, role: results[0].role, email: results[0].email });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    });
});

// ===================== STUDENT ROUTES =====================
app.get('/students/email/:email', (req, res) => {
    const email = req.params.email;
    const sql = 'SELECT * FROM students WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) return res.status(500).send('Server error');
        if (results.length === 0) return res.status(404).send('Student not found');
        res.json(results[0]);
    });
});

app.post('/students/email/:email', (req, res) => {
    const email = req.params.email;
    const { fullName, mobile, batch } = req.body;

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

// ===================== ADMIN ROUTES =====================
app.get('/students', (req, res) => {
    const sql = 'SELECT * FROM students';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send('Server error');
        res.json(results);
    });
});

app.put('/students/:id', (req, res) => {
    const studentId = req.params.id;
    const { fullName, email, mobile, batch } = req.body;
    const sql = 'UPDATE students SET fullName = ?, email = ?, mobile = ?, batch = ? WHERE id = ?';
    db.query(sql, [fullName, email, mobile, batch, studentId], (err) => {
        if (err) return res.status(500).send('Error updating student');
        res.send('Student updated successfully');
    });
});

app.delete('/students/:id', (req, res) => {
    const studentId = req.params.id;
    const sql = 'DELETE FROM students WHERE id = ?';
    db.query(sql, [studentId], (err) => {
        if (err) return res.status(500).send('Error deleting student');
        res.send('Student deleted successfully');
    });
});

// ===================== GLOBAL ERROR HANDLING =====================
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
