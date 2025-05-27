const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const port = 3000;

// Ensure data directory exists
// const dataDir = path.join(__dirname, 'data');
// if (!fs.existsSync(dataDir)) {
//     fs.mkdirSync(dataDir);
// }

// Database path in the mounted volume
// const dbPath = path.join(dataDir, 'hostel_mess.db');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// // Connect to SQLite database
// const db = new sqlite3.Database(dbPath, (err) => {
//     if (err) {
//         console.error('Error connecting to database:', err.message);
//     } else {
//         console.log('Connected to the SQLite database at ' + dbPath);
//         initializeDatabase();
//     }
// });
const path = require('path');
const fs = require('fs');

// Use /tmp directory in Render for writable ephemeral storage
const dataDir = path.join('/tmp'); // No need to create, it's always present

// Define database path inside /tmp
const dbPath = path.join(dataDir, 'hostel_mess.db');

// (Optional) Copy pre-filled DB from source directory to /tmp if needed
const sourceDbPath = path.join(__dirname, 'data', 'hostel_mess.db');
if (!fs.existsSync(dbPath) && fs.existsSync(sourceDbPath)) {
    fs.copyFileSync(sourceDbPath, dbPath);
    console.log('SQLite DB copied to /tmp directory');
} else {
    console.log('Using DB in /tmp directory');
}

// Now use dbPath to initialize SQLite

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
    }
});

// Initialize database if it doesn't exist
function initializeDatabase() {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (err) {
            console.error('Error checking database:', err.message);
            return;
        }
        
        if (!row) {
            console.log('Initializing database tables...');
            const initSql = `
                -- Create Users table
                CREATE TABLE users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- Create Transactions table
                CREATE TABLE transactions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    meal TEXT NOT NULL,
                    amount INTEGER NOT NULL,
                    payment_method TEXT NOT NULL,
                    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );

                -- Create Coupons table
                CREATE TABLE coupons (
                    meal TEXT PRIMARY KEY,
                    available INTEGER NOT NULL
                );

                -- Create Feedback table
                CREATE TABLE feedback (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    user_name TEXT NOT NULL,
                    date TEXT NOT NULL,
                    meal TEXT NOT NULL,
                    rating INTEGER NOT NULL,
                    comments TEXT,
                    suggestions TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
                CREATE TABLE IF NOT EXISTS last_reset (
    id INTEGER PRIMARY KEY,
    last_date TEXT
);
CREATE TABLE IF NOT EXISTS mess_menu (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL,        -- 'Monday', 'Tuesday', etc.
    meal TEXT NOT NULL,       -- 'breakfast', 'lunch', etc.
    items TEXT NOT NULL       -- JSON string of menu items
);
INSERT OR IGNORE INTO last_reset (id, last_date) VALUES (1, '');

                -- Insert initial coupon counts
                INSERT INTO coupons (meal, available) VALUES
                    ('breakfast', 50),
                    ('lunch', 50),
                    ('snacks', 50),
                    ('dinner', 50);
            `;
            
            db.exec(initSql, (err) => {
                if (err) {
                    console.error('Error initializing database:', err.message);
                } else {
                    console.log('Database initialized successfully');
                }
            });
        }
        
    });
}

// Routes

// Get all users
app.get('/api/users', (req, res) => {
    db.all('SELECT id, name, email, created_at FROM users', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Register a new user
app.post('/api/users/register', (req, res) => {
    const { name, email, password } = req.body;
    
    // Check if email already exists
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (row) {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }
        
        // Insert new user
        const id = uuidv4();
        db.run('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
            [id, name, email, password], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                // Return the new user (without password)
                db.get('SELECT id, name, email, created_at FROM users WHERE id = ?', [id], (err, row) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.status(201).json(row);
                });
            }
        );
    });
});

// Login
app.post('/api/users/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get('SELECT id, name, email, created_at FROM users WHERE email = ? AND password = ?',
        [email, password], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (!row) {
                res.status(401).json({ error: 'Invalid email or password' });
                return;
            }
            
            res.json(row);
        }
    );
});

// Get coupon counts
// app.get('/api/coupons', (req, res) => {
//     const today = new Date().toISOString().slice(0, 10);

//     db.get('SELECT last_date FROM last_reset WHERE id = 1', (err, row) => {
//         if (err) {
//             return res.status(500).json({ error: err.message });
//         }

//         const lastDate = row ? row.last_date : null;

//         if (lastDate !== today) {
//             // Reset coupon counts
//             db.serialize(() => {
//                 db.run('UPDATE coupons SET available = 50');
//                 if (lastDate === null) {
//                     db.run('INSERT INTO last_reset (id, last_date) VALUES (1, ?)', [today]);
//                 } else {
//                     db.run('UPDATE last_reset SET last_date = ? WHERE id = 1', [today]);
//                 }
//             });
//         }

//         db.all('SELECT * FROM coupons', [], (err, rows) => {
//             if (err) return res.status(500).json({ error: err.message });

//             const coupons = {};
//             rows.forEach(row => {
//                 coupons[row.meal] = row.available;
//             });

//             res.json(coupons);
//         });
//     });
// });
// Get coupon counts and reset daily if needed
app.get('/api/coupons', (req, res) => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    db.get('SELECT last_date FROM last_reset WHERE id = 1', (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const lastDate = row ? row.last_date : null;

        // Only reset if last_date !== today
        if (lastDate !== today) {
            db.serialize(() => {
                db.run('UPDATE coupons SET available = 50', (err) => {
                    if (err) return res.status(500).json({ error: err.message });

                    const updateQuery = lastDate === null
                        ? 'INSERT INTO last_reset (id, last_date) VALUES (1, ?)'
                        : 'UPDATE last_reset SET last_date = ? WHERE id = 1';

                    db.run(updateQuery, [today], (err) => {
                        if (err) return res.status(500).json({ error: err.message });

                        // Return updated coupon values
                        db.all('SELECT * FROM coupons', [], (err, rows) => {
                            if (err) return res.status(500).json({ error: err.message });

                            const coupons = {};
                            rows.forEach(row => coupons[row.meal] = row.available);
                            res.json(coupons);
                        });
                    });
                });
            });
        } else {
            // Already reset today, just return current counts
            db.all('SELECT * FROM coupons', [], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });

                const coupons = {};
                rows.forEach(row => coupons[row.meal] = row.available);
                res.json(coupons);
            });
        }
    });
});



// Buy a coupon
app.post('/api/transactions', (req, res) => {
    const { userId, meal, amount, paymentMethod } = req.body;
    
    // Check if coupons are available
    db.get('SELECT available FROM coupons WHERE meal = ?', [meal], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!row || row.available <= 0) {
            res.status(400).json({ error: `No more ${meal} coupons available` });
            return;
        }
        
        // Begin transaction
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // Update coupon count
            db.run('UPDATE coupons SET available = available - 1 WHERE meal = ?', [meal], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                // Create transaction
                const id = uuidv4();
                db.run('INSERT INTO transactions (id, user_id, meal, amount, payment_method) VALUES (?, ?, ?, ?, ?)',
                    [id, userId, meal, amount, paymentMethod], function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        
                        db.run('COMMIT');
                        
                        // Return the new transaction
                        db.get('SELECT * FROM transactions WHERE id = ?', [id], (err, row) => {
                            if (err) {
                                res.status(500).json({ error: err.message });
                                return;
                            }
                            res.status(201).json(row);
                        });
                    }
                );
            });
        });
    });
});

// Get user transactions
app.get('/api/users/:userId/transactions', (req, res) => {
    const { userId } = req.params;
    
    db.all('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC', [userId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Submit feedback
app.post('/api/feedback', (req, res) => {
    const { userId, userName, date, meal, rating, comments, suggestions } = req.body;
    
    const id = uuidv4();
    db.run('INSERT INTO feedback (id, user_id, user_name, date, meal, rating, comments, suggestions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, userId, userName, date, meal, rating, comments, suggestions], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Return the new feedback
            db.get('SELECT * FROM feedback WHERE id = ?', [id], (err, row) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.status(201).json(row);
            });
        }
    );
});

// Get recent feedback
app.get('/api/feedback', (req, res) => {
    db.all('SELECT * FROM feedback ORDER BY created_at DESC LIMIT 5', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});
app.get('/api/menu', (req, res) => {
    const day = req.query.day; // Expecting 'Monday', 'Tuesday', etc.
    
    db.all('SELECT meal, items FROM mess_menu WHERE day = ?', [day], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const menu = {};
        rows.forEach(row => {
            menu[row.meal] = JSON.parse(row.items);
        });

        res.json(menu);
    });
});


// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
});