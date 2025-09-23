// server.js
const express = require('express');
const db = require('./db'); // Your db.js connection
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');


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
app.post('/register', async (req, res) => {
  try {
    const { fullName, email, mobile, password } = req.body;
    const role = 'student';

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertUser = 'INSERT INTO users (fullName, email, mobile, password, role) VALUES (?, ?, ?, ?, ?)';
    db.query(insertUser, [fullName, email, mobile, hashedPassword, role], (err, result) => {
      if (err) {
        console.error('❌ Error inserting user:', err);
        return res.status(500).send('Error registering user');
      }

      const userId = result.insertId;

      const insertStudent = `
        INSERT INTO students (user_id, fullName, email, mobile)
        VALUES (?, ?, ?, ?)
      `;
      db.query(insertStudent, [userId, fullName, email, mobile], (err2) => {
        if (err2) {
          console.error('❌ Error inserting student:', err2);
          return res.status(500).send('Error creating student profile');
        }
        res.send('User registered successfully');
      });
    });
  } catch (err) {
    console.error('❌ Error in /register:', err);
    res.status(500).send('Server error');
  }
});

// ===================== LOGIN =====================
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ?';

  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).send('Server error');
    if (results.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (user.role === 'student') {
      const studentSql = 'SELECT * FROM students WHERE user_id = ?';
      db.query(studentSql, [user.id], (err2, studentResults) => {
        if (err2) return res.status(500).send('Server error');
        return res.json({
          success: true,
          role: user.role,
          email: user.email,
          profile: studentResults[0] || null
        });
      });
    } else {
      res.json({ success: true, role: user.role, email: user.email });
    }
  });
});

// ===================== STUDENT ROUTES =====================

// Get student by email
app.get('/students/email/:email', (req, res) => {
  const email = req.params.email;
  const sql = 'SELECT * FROM students WHERE email = ?';
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).send('Server error');
    if (results.length === 0) return res.status(404).send('Student not found');
    res.json(results[0]);
  });
});

// Admin adds new student (creates user + student)
app.post('/students', async (req, res) => {
  try {
    const { fullName, email, mobile, batch, dob, gender, address, parentsContact, password } = req.body;

    const hashedPassword = await bcrypt.hash(password || '123456', 10);
    const role = 'student';

    const insertUser = 'INSERT INTO users (fullName, email, mobile, password, role) VALUES (?, ?, ?, ?, ?)';
    db.query(insertUser, [fullName, email, mobile, hashedPassword, role], (err, result) => {
      if (err) {
        console.error('❌ Failed to add user:', err);
        return res.status(500).send('Failed to add student');
      }

      const userId = result.insertId;
      const insertStudent = `
        INSERT INTO students (user_id, fullName, email, mobile, batch, dob, gender, address, parentsContact)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(insertStudent, [userId, fullName, email, mobile, batch, dob, gender, address, parentsContact], (err2) => {
        if (err2) {
          console.error('❌ Failed to add student:', err2);
          return res.status(500).send('Failed to add student');
        }
        res.send('Student added successfully');
      });
    });
  } catch (err) {
    console.error('❌ Error in /students:', err);
    res.status(500).send('Server error');
  }
});

// Get all students
app.get('/students', (req, res) => {
  const sql = 'SELECT * FROM students';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send('Server error');
    res.json(results);
  });
});

// Update student + sync with users
app.put('/students/:id', (req, res) => {
  const studentId = req.params.id;
  const { fullName, email, mobile, batch, dob, gender, address, parentsContact } = req.body;

  const updateStudent = `
    UPDATE students 
    SET fullName = ?, email = ?, mobile = ?, batch = ?, dob = ?, gender = ?, address = ?, parentsContact = ?
    WHERE id = ?
  `;

  db.query(updateStudent, [fullName, email, mobile, batch, dob, gender, address, parentsContact, studentId], (err) => {
    if (err) {
      console.error('❌ Error updating student:', err);
      return res.status(500).send('Error updating student');
    }

    // Sync users table
    const updateUser = 'UPDATE users SET fullName = ?, email = ?, mobile = ? WHERE id = (SELECT user_id FROM students WHERE id = ?)';
    db.query(updateUser, [fullName, email, mobile, studentId], (err2) => {
      if (err2) {
        console.error('❌ Error syncing user:', err2);
        return res.status(500).send('Error syncing user data');
      }
      res.send('Student updated successfully');
    });
  });
});

// Delete student + linked user
app.delete('/students/:id', (req, res) => {
  const studentId = req.params.id;

  const getUser = 'SELECT user_id FROM students WHERE id = ?';
  db.query(getUser, [studentId], (err, results) => {
    if (err) return res.status(500).send('Error fetching user_id');
    if (results.length === 0) return res.status(404).send('Student not found');

    const userId = results[0].user_id;

    const deleteStudent = 'DELETE FROM students WHERE id = ?';
    db.query(deleteStudent, [studentId], (err2) => {
      if (err2) return res.status(500).send('Error deleting student');

      const deleteUser = 'DELETE FROM users WHERE id = ?';
      db.query(deleteUser, [userId], (err3) => {
        if (err3) return res.status(500).send('Error deleting user');
        res.send('Student and linked user deleted successfully');
      });
    });
  });
});

// ===================== FEES ROUTES =====================
app.get('/fees/student/:id', (req, res) => {
  const studentId = req.params.id;
  const sql = `
    SELECT f.id, f.amount, f.status, f.dueDate, s.fullName AS studentName, s.batch 
    FROM fees f
    JOIN students s ON f.studentId = s.id
    WHERE f.studentId = ?
  `;
  db.query(sql, [studentId], (err, results) => {
    if (err) return res.status(500).send('Server error');
    res.json(results);
  });
});

app.put('/fees/:id', (req, res) => {
  const feeId = req.params.id;
  const { status } = req.body;
  const sql = 'UPDATE fees SET status = ? WHERE id = ?';
  db.query(sql, [status, feeId], (err) => {
    if (err) return res.status(500).send('Server error');
    res.send('Fee status updated successfully');
  });
});

app.post('/fees/batch', (req, res) => {
  const { batch, amount, dueDate } = req.body;

  const getStudents = "SELECT id FROM students WHERE batch = ?";
  db.query(getStudents, [batch], (err, students) => {
    if (err) return res.status(500).send("Server error");
    if (students.length === 0) return res.status(404).send("No students found in this batch");

    const insertFee = `
      INSERT INTO fees (studentId, amount, status, dueDate) 
      VALUES (?, ?, 'Pending', ?)
      ON DUPLICATE KEY UPDATE amount = VALUES(amount), dueDate = VALUES(dueDate)
    `;

    students.forEach(stu => {
      db.query(insertFee, [stu.id, amount, dueDate], (err2) => {
        if (err2) console.error("Error inserting/updating fee:", err2);
      });
    });

    res.send("Fees applied to batch successfully");
  });
});

// ===================== ANNOUNCEMENTS =====================
app.post('/announcements', (req, res) => {
  const { title, message, date } = req.body;
  const sql = "INSERT INTO announcements (title, message, date) VALUES (?, ?, ?)";
  db.query(sql, [title, message, date], (err) => {
    if (err) return res.status(500).send("Error posting announcement");
    res.send("Announcement posted successfully");
  });
});

app.get('/announcements', (req, res) => {
  const sql = "SELECT id, title, message, date FROM announcements ORDER BY id DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send("Error fetching announcements");
    res.json(results);
  });
});

app.delete('/announcements/:id', (req, res) => {
  const sql = "DELETE FROM announcements WHERE id = ?";
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).send("Server error");
    res.send("Announcement deleted");
  });
});

// ===================== STUDENT FEES VIEW =====================
app.get('/fees/email/:email', (req, res) => {
  const email = req.params.email;
  const sql = `
    SELECT f.id, f.amount, f.status, f.dueDate, s.fullName AS studentName, s.batch
    FROM fees f
    JOIN students s ON f.studentId = s.id
    WHERE s.email = ?
  `;
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).send('Server error');
    res.json(results);
  });
});

// ===================== BATCH ROUTE =====================
app.get('/batches', (req, res) => {
  const sql = "SELECT DISTINCT batch FROM students";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send("Server error");
    const batches = results.map(r => r.batch);
    res.json(batches);
  });
});

// ===================== ATTENDANCE ROUTES =====================
app.get('/students/batch/:batch', (req, res) => {
  const { batch } = req.params;
  const sql = "SELECT id, fullName FROM students WHERE batch = ?";
  db.query(sql, [batch], (err, results) => {
    if (err) return res.status(500).send("Server error");
    res.json(results);
  });
});

app.post('/attendance', (req, res) => {
  const { batch, date, statuses } = req.body;
  if (!batch || !date || !statuses) return res.status(400).send("Missing data");

  const sql = `
    INSERT INTO attendance (student_id, batch, date, status)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE status = VALUES(status)
  `;

  const promises = Object.entries(statuses).map(([studentId, status]) => {
    return new Promise((resolve, reject) => {
      db.query(sql, [studentId, batch, date, status], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  Promise.all(promises)
    .then(() => res.send("Attendance saved successfully"))
    .catch(() => res.status(500).send("Error saving attendance"));
});

app.get('/attendance/student/:id', (req, res) => {
  const studentId = req.params.id;
  const sql = "SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC";
  db.query(sql, [studentId], (err, results) => {
    if (err) return res.status(500).send("Server error");
    res.json(results);
  });
});

app.get('/attendance/batch/:batch/:date', (req, res) => {
  const { batch, date } = req.params;
  const sql = `
    SELECT s.fullName, a.status 
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE a.batch = ? AND a.date = ?
  `;
  db.query(sql, [batch, date], (err, results) => {
    if (err) return res.status(500).send("Server error");
    res.json(results);
  });
});

// ===================== GLOBAL ERROR HANDLING =====================
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));

// ===================== START SERVER =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
