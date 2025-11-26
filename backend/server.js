const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;

// FIXED: Using environment variables instead of hardcoded secrets
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';
const STRIPE_API_KEY = process.env.STRIPE_API_KEY;

// VULNERABILITY 2: Insecure CORS configuration
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize SQLite database
const db = new sqlite3.Database(':memory:');

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT,
    role TEXT DEFAULT 'user'
  )`);

  db.run(`CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    description TEXT,
    completed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert sample data
  const hashedPassword = bcrypt.hashSync('password123', 10);
  db.run(`INSERT INTO users (username, password, email, role) VALUES
    ('admin', '${hashedPassword}', 'admin@example.com', 'admin'),
    ('user1', '${hashedPassword}', 'user1@example.com', 'user')`);
});

// VULNERABILITY 3: SQL Injection vulnerability in login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // SQL Injection vulnerability - user input directly in query
  const query = `SELECT * FROM users WHERE username = '${username}'`;

  db.get(query, [], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // VULNERABILITY 4: Timing attack - compare passwords without constant-time comparison
    if (bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // VULNERABILITY 5: Exposing sensitive data in response
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          password: user.password // Should never expose password hash!
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

// VULNERABILITY 6: No authentication middleware check
app.get('/api/users', (req, res) => {
  // Should require authentication, but doesn't!
  db.all('SELECT id, username, email, role FROM users', [], (err, users) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(users);
  });
});

// VULNERABILITY 7: SQL Injection in search
app.get('/api/tasks/search', (req, res) => {
  const { query } = req.query;

  // SQL Injection vulnerability
  const sqlQuery = `SELECT * FROM tasks WHERE title LIKE '%${query}%' OR description LIKE '%${query}%'`;

  db.all(sqlQuery, [], (err, tasks) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(tasks);
  });
});

// VULNERABILITY 8: Insecure Direct Object Reference (IDOR)
app.get('/api/tasks/:id', (req, res) => {
  const { id } = req.params;

  // No check if user owns this task!
  db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, task) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  });
});

// VULNERABILITY 9: Mass assignment vulnerability
app.post('/api/tasks', (req, res) => {
  // Accepts any field from request body
  const { user_id, title, description, completed } = req.body;

  db.run(
    'INSERT INTO tasks (user_id, title, description, completed) VALUES (?, ?, ?, ?)',
    [user_id, title, description, completed || 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: 'Task created' });
    }
  );
});

// VULNERABILITY 10: Command Injection
app.post('/api/export', (req, res) => {
  const { filename } = req.body;
  const { exec } = require('child_process');

  // Command injection vulnerability
  exec(`echo "Export complete" > ${filename}`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ message: 'Export completed', filename });
  });
});

// VULNERABILITY 11: XML External Entity (XXE) vulnerability potential
app.post('/api/upload-xml', (req, res) => {
  // In a real implementation, this would parse XML without disabling external entities
  res.json({ message: 'XML processing endpoint (vulnerable to XXE)' });
});

// VULNERABILITY 12: Insufficient logging and monitoring
app.get('/api/admin/delete-user/:id', (req, res) => {
  const { id } = req.params;

  // No logging of this critical action!
  db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'User deleted' });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// VULNERABILITY 13: Error messages expose stack traces
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: err.message,
    stack: err.stack // Never expose stack traces in production!
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
