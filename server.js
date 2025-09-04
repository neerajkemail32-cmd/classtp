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

// Get student by email
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

// Add new student (used by dashboard "Add Student" form)
app.post('/students', (req, res) => {
    const { fullName, email, mobile, batch } = req.body;

    const sql = 'INSERT INTO students (fullName, email, mobile, batch) VALUES (?, ?, ?, ?)';
    db.query(sql, [fullName, email, mobile, batch], (err, result) => {
        if (err) {
            console.error('❌ Error inserting student:', err);
            return res.status(500).send('Failed to add student');
        }
        console.log('✅ Student added:', email);
        res.send('Student added successfully');
    });
});

// Insert or update student by email (optional, keep for flexibility)
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

// Get all students
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

// Update student by ID
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

// Delete student by ID
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
// ===================== FEES ROUTES =====================

// Get student by ID
app.get('/students/:id', (req, res) => {
  const studentId = req.params.id;
  const sql = 'SELECT * FROM students WHERE id = ?';
  db.query(sql, [studentId], (err, results) => {
    if (err) {
      console.error('❌ Error fetching student:', err);
      return res.status(500).send('Server error');
    }
    if (results.length === 0) return res.status(404).send('Student not found');
    res.json(results[0]);
  });
});

// Get all fees for a student
// Get fees for a student (with student details)
app.get('/fees/student/:id', (req, res) => {
  const studentId = req.params.id;
  const sql = `
    SELECT f.id, f.amount, f.status, s.fullName AS studentName, s.batch 
    FROM fees f
    JOIN students s ON f.studentId = s.id
    WHERE f.studentId = ?
  `;
  db.query(sql, [studentId], (err, results) => {
    if (err) {
      console.error('❌ Error fetching fees:', err);
      return res.status(500).send('Server error');
    }
    res.json(results);
  });
});

// Update fee status
app.put('/fees/:id', (req, res) => {
  const feeId = req.params.id;
  const { status } = req.body;
  const sql = 'UPDATE fees SET status = ? WHERE id = ?';
  db.query(sql, [status, feeId], (err) => {
    if (err) {
      console.error('❌ Error updating fee:', err);
      return res.status(500).send('Server error');
    }
    res.send('Fee status updated successfully');
  });
});

// Delete a fee record
app.delete('/fees/:id', (req, res) => {
  const feeId = req.params.id;
  const sql = 'DELETE FROM fees WHERE id = ?';
  db.query(sql, [feeId], (err) => {
    if (err) {
      console.error('❌ Error deleting fee:', err);
      return res.status(500).send('Server error');
    }
    res.send('Fee deleted successfully');
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
