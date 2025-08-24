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

// ===================== LOGGER =====================
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url} - Body:`, req.body);
    next();
});

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
        console.log('✅ User registered:', email);
        res.send('✅ User registered successfully');
    });
});

// ===================== LOGIN =====================
app.post('/login', (req, res) => {
    const { email, password, role } = req.body;

    console.log(`[LOGIN ATTEMPT] Email: ${email}, Role: ${role}`);

    const sql = 'SELECT * FROM users WHERE email = ? AND password = ? AND role = ?';
    db.query(sql, [email, password, role], (err, results) => {
        if (err) {
            console.error('❌ Login query error:', err);
            return res.status(500).send('Server error');
        }

        console.log('Login query results:', results);

        if (results.length > 0) {
            console.log('✅ Login successful for:', email);
            res.json({ success: true, role: results[0].role, email: results[0].email });
        } else {
            console.log('❌ Login failed for:', email);
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    });
});

// ===================== STUDENT ROUTES =====================
app.get('/students/email/:email', (req, res) => {
    const email = req.params.email;
    const sql = 'SELECT * FROM students WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) {
            console.error('❌ Error fetching student:', err);
            return res.status(500).send('Server error');
        }
        if (results.length === 0) {
            console.log('❌ Student not found:', email);
            return res.status(404).send('Student not found');
        }
        console.log('✅ Student fetched:', email);
        res.json(results[0]);
    });
});

app.post('/students/email/:email', (req, res) => {
    const email = req.params.email;
    const { fullName, mobile, batch } = req.body;

    console.log(`[STUDENT POST] Email: ${email}, Data:`, req.body);

    const checkSql = 'SELECT * FROM students WHERE email = ?';
    db.query(checkSql, [email], (err, results) => {
        if (err) {
            console.error('❌ Error checking student:', err);
            return res.status(500).send('Server error');
        }

        if (results.length > 0) {
            const updateSql = 'UPDATE students SET fullName = ?, mobile = ?, batch = ? WHERE email = ?';
            db.query(updateSql, [fullName, mobile, batch, email], (err2) => {
                if (err2) {
                    console.error('❌ Failed to update student:', err2);
                    return res.status(500).send('Failed to update student');
                }
                console.log('✅ Student updated:', email);
                res.send('Student updated successfully');
            });
        } else {
            const insertSql = 'INSERT INTO students (fullName, email, mobile, batch) VALUES (?, ?, ?, ?)';
            db.query(insertSql, [fullName, email, mobile, batch], (err3) => {
                if (err3) {
                    console.error('❌ Failed to insert student:', err3);
                    return res.status(500).send('Failed to insert student');
                }
                console.log('✅ Student added:', email);
                res.send('Student added successfully');
            });
        }
    });
});

// ===================== ADMIN ROUTES =====================
app.get('/students', (req, res) => {
    const sql = 'SELECT * FROM students';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching all students:', err);
            return res.status(500).send('Server error');
        }
        console.log('✅ Fetched all students');
        res.json(results);
    });
});

app.put('/students/:id', (req, res) => {
    const studentId = req.params.id;
    const { fullName, email, mobile, batch } = req.body;

    const sql = 'UPDATE students SET fullName = ?, email = ?, mobile = ?, batch = ? WHERE id = ?';
    db.query(sql, [fullName, email, mobile, batch, studentId], (err) => {
        if (err) {
            console.error('❌ Error updating student:', err);
            return res.status(500).send('Error updating student');
        }
        console.log('✅ Student updated with ID:', studentId);
        res.send('Student updated successfully');
    });
});

app.delete('/students/:id', (req, res) => {
    const studentId = req.params.id;

    const sql = 'DELETE FROM students WHERE id = ?';
    db.query(sql, [studentId], (err) => {
        if (err) {
            console.error('❌ Error deleting student:', err);
            return res.status(500).send('Error deleting student');
        }
        console.log('✅ Student deleted with ID:', studentId);
        res.send('Student deleted successfully');
    });
});

// ===================== GLOBAL ERROR HANDLING =====================
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
