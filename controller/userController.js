const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const multer = require('multer');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage }).single('photo');

// User registration handler
const registerUser = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ message: 'File upload failed', error: err });
    }

    const { fullname, email, mobile, password } = req.body;

    // Check if user already exists
    const sqlCheck = 'SELECT * FROM users WHERE email = ?';
    db.query(sqlCheck, [email], async (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (result.length > 0) return res.status(400).json({ message: 'User already exists' });

      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const photo = req.file ? req.file.path : '';

        // Insert user into the database
        const sql = 'INSERT INTO users (fullname, email, mobile, password, photo) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [fullname, email, mobile, hashedPassword, photo], (err, result) => {
          if (err) return res.status(500).json({ message: 'Registration failed', error: err });
          res.status(201).json({ message: 'User registered successfully' });
        });
      } catch (error) {
        res.status(500).json({ message: 'Server error', error });
      }
    });
  });
};

// User login handler
const loginUser = (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], async (err, result) => {
    if (err) return res.status(500).json({ message: 'Login failed', error: err });

    if (result.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, 'your_jwt_secret', { expiresIn: '1h' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        mobile: user.mobile,
        photo: user.photo
      }
    });
  });
};

module.exports = { registerUser, loginUser };
