const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/puzzle_game', {
  // Removed deprecated options
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  progress: {
    easy: { type: Number, default: 1 },
    medium: { type: Number, default: 1 },
    hard: { type: Number, default: 1 }
  },
  completedLevels: [{
    difficulty: String,
    level: Number,
    moves: Number,
    time: Number,
    completedAt: { type: Date, default: Date.now }
  }]
});

const User = mongoose.model('User', userSchema);

// Level Schema
const levelSchema = new mongoose.Schema({
  difficulty: { type: String, required: true },
  level: { type: Number, required: true },
  gridSize: { type: Number, required: true },
  targetMoves: { type: Number, required: true },
  description: String
});

const Level = mongoose.model('Level', levelSchema);

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

// Routes

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    // Create token
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'your_jwt_secret');

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        progress: user.progress
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Create token
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'your_jwt_secret');

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        progress: user.progress
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user profile
app.get('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user progress
app.put('/api/user/progress', verifyToken, async (req, res) => {
  try {
    const { difficulty, level, moves, time } = req.body;

    const user = await User.findById(req.user._id);

    // Update progress if level is higher
    if (user.progress[difficulty] < level + 1) {
      user.progress[difficulty] = level + 1;
    }

    // Add completed level
    user.completedLevels.push({
      difficulty,
      level,
      moves,
      time
    });

    await user.save();

    res.json({
      message: 'Progress updated',
      progress: user.progress
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get levels
app.get('/api/levels', async (req, res) => {
  try {
    const levels = await Level.find();
    res.json(levels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get leaderboard for a specific difficulty
app.get('/api/leaderboard/:difficulty', async (req, res) => {
  try {
    const { difficulty } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const users = await User.aggregate([
      {
        $addFields: {
          bestTime: {
            $min: {
              $map: {
                input: {
                  $filter: {
                    input: '$completedLevels',
                    as: 'level',
                    cond: { $eq: ['$$level.difficulty', difficulty] }
                  }
                },
                as: 'level',
                in: '$$level.time'
              }
            }
          },
          totalLevelsCompleted: {
            $size: {
              $filter: {
                input: '$completedLevels',
                as: 'level',
                cond: { $eq: ['$$level.difficulty', difficulty] }
              }
            }
          }
        }
      },
      {
        $match: {
          totalLevelsCompleted: { $gt: 0 }
        }
      },
      {
        $sort: { totalLevelsCompleted: -1, bestTime: 1 }
      },
      {
        $limit: limit
      },
      {
        $project: {
          username: 1,
          totalLevelsCompleted: 1,
          bestTime: 1,
          'progress.easy': 1,
          'progress.medium': 1,
          'progress.hard': 1
        }
      }
    ]);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's level completion history
app.get('/api/user/completed-levels', verifyToken, async (req, res) => {
  try {
    const difficulty = req.query.difficulty;
    const user = await User.findById(req.user._id);

    let completedLevels = user.completedLevels;
    if (difficulty) {
      completedLevels = completedLevels.filter(l => l.difficulty === difficulty);
    }

    res.json(completedLevels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user statistics
app.get('/api/user/stats', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const stats = {
      username: user.username,
      createdAt: user.createdAt,
      progress: user.progress,
      totalLevelsCompleted: user.completedLevels.length,
      levelsByDifficulty: {
        easy: user.completedLevels.filter(l => l.difficulty === 'easy').length,
        medium: user.completedLevels.filter(l => l.difficulty === 'medium').length,
        hard: user.completedLevels.filter(l => l.difficulty === 'hard').length
      },
      bestTimes: {
        easy: Math.min(...user.completedLevels.filter(l => l.difficulty === 'easy').map(l => l.time), Infinity),
        medium: Math.min(...user.completedLevels.filter(l => l.difficulty === 'medium').map(l => l.time), Infinity),
        hard: Math.min(...user.completedLevels.filter(l => l.difficulty === 'hard').map(l => l.time), Infinity)
      },
      bestMoves: {
        easy: Math.min(...user.completedLevels.filter(l => l.difficulty === 'easy').map(l => l.moves), Infinity),
        medium: Math.min(...user.completedLevels.filter(l => l.difficulty === 'medium').map(l => l.moves), Infinity),
        hard: Math.min(...user.completedLevels.filter(l => l.difficulty === 'hard').map(l => l.moves), Infinity)
      }
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific level with completion data for current user
app.get('/api/levels/:difficulty/:level', async (req, res) => {
  try {
    const { difficulty, level } = req.params;
    const levelData = await Level.findOne({ difficulty, level: parseInt(level) });

    if (!levelData) {
      return res.status(404).json({ message: 'Level not found' });
    }

    let userAttempts = [];
    if (req.header('Authorization')) {
      try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        const user = await User.findById(verified._id);
        userAttempts = user.completedLevels.filter(l => l.difficulty === difficulty && l.level === parseInt(level));
      } catch (err) {
        // Continue without user data if token is invalid
      }
    }

    res.json({
      ...levelData.toObject(),
      userAttempts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Initialize default levels
const initializeLevels = async () => {
  const existingLevels = await Level.countDocuments();
  if (existingLevels === 0) {
    const defaultLevels = [
      // Easy levels (3x3)
      { difficulty: 'easy', level: 1, gridSize: 3, targetMoves: 50, description: 'Beginner Level 1' },
      { difficulty: 'easy', level: 2, gridSize: 3, targetMoves: 45, description: 'Beginner Level 2' },
      { difficulty: 'easy', level: 3, gridSize: 3, targetMoves: 40, description: 'Beginner Level 3' },
      { difficulty: 'easy', level: 4, gridSize: 3, targetMoves: 35, description: 'Beginner Level 4' },
      { difficulty: 'easy', level: 5, gridSize: 3, targetMoves: 30, description: 'Beginner Level 5' },

      // Medium levels (4x4)
      { difficulty: 'medium', level: 1, gridSize: 4, targetMoves: 100, description: 'Intermediate Level 1' },
      { difficulty: 'medium', level: 2, gridSize: 4, targetMoves: 90, description: 'Intermediate Level 2' },
      { difficulty: 'medium', level: 3, gridSize: 4, targetMoves: 80, description: 'Intermediate Level 3' },
      { difficulty: 'medium', level: 4, gridSize: 4, targetMoves: 70, description: 'Intermediate Level 4' },
      { difficulty: 'medium', level: 5, gridSize: 4, targetMoves: 60, description: 'Intermediate Level 5' },

      // Hard levels (5x5)
      { difficulty: 'hard', level: 1, gridSize: 5, targetMoves: 200, description: 'Expert Level 1' },
      { difficulty: 'hard', level: 2, gridSize: 5, targetMoves: 180, description: 'Expert Level 2' },
      { difficulty: 'hard', level: 3, gridSize: 5, targetMoves: 160, description: 'Expert Level 3' },
      { difficulty: 'hard', level: 4, gridSize: 5, targetMoves: 140, description: 'Expert Level 4' },
      { difficulty: 'hard', level: 5, gridSize: 5, targetMoves: 120, description: 'Expert Level 5' },
    ];

    await Level.insertMany(defaultLevels);
    console.log('Default levels initialized');
  }
};

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeLevels();
});