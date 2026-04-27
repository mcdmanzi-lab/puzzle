<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

// Auth state
const isLoggedIn = ref(false)
const currentUser = ref(null)
const showAuth = ref(false)
const authMode = ref('login') // 'login' or 'register'
const authForm = ref({
  username: '',
  email: '',
  password: ''
})
const authError = ref('')

// Game state
const difficulty = ref('easy')
const currentLevel = ref(1)
const gameStarted = ref(false)
const gameWon = ref(false)
const moves = ref(0)
const startTime = ref(null)
const tiles = ref([])
const levels = ref([])
const userProgress = ref({
  easy: 1,
  medium: 1,
  hard: 1
})

// Computed properties
const gridSize = computed(() => {
  const level = levels.value.find(l => l.difficulty === difficulty.value && l.level === currentLevel.value)
  return level ? level.gridSize : 3
})

const totalTiles = computed(() => gridSize.value * gridSize.value)

const currentLevelData = computed(() => {
  return levels.value.find(l => l.difficulty === difficulty.value && l.level === currentLevel.value)
})

const maxLevel = computed(() => {
  return userProgress.value[difficulty.value] || 1
})

// API functions
const login = async () => {
  try {
    const response = await axios.post('/auth/login', {
      email: authForm.value.email,
      password: authForm.value.password
    })
    localStorage.setItem('token', response.data.token)
    currentUser.value = response.data.user
    userProgress.value = response.data.user.progress
    isLoggedIn.value = true
    showAuth.value = false
    authError.value = ''
    authForm.value = { username: '', email: '', password: '' }
  } catch (error) {
    authError.value = error.response?.data?.message || 'Login failed'
  }
}

const register = async () => {
  try {
    const response = await axios.post('/auth/register', {
      username: authForm.value.username,
      email: authForm.value.email,
      password: authForm.value.password
    })
    localStorage.setItem('token', response.data.token)
    currentUser.value = response.data.user
    userProgress.value = response.data.user.progress
    isLoggedIn.value = true
    showAuth.value = false
    authError.value = ''
    authForm.value = { username: '', email: '', password: '' }
  } catch (error) {
    authError.value = error.response?.data?.message || 'Registration failed'
  }
}

const logout = () => {
  localStorage.removeItem('token')
  currentUser.value = null
  isLoggedIn.value = false
  userProgress.value = { easy: 1, medium: 1, hard: 1 }
  resetGame()
}

const loadLevels = async () => {
  try {
    const response = await axios.get('/levels')
    levels.value = response.data
  } catch (error) {
    console.error('Failed to load levels:', error)
  }
}

const updateProgress = async (level, moves, time) => {
  if (!isLoggedIn.value) return

  try {
    const response = await axios.put('/user/progress', {
      difficulty: difficulty.value,
      level,
      moves,
      time
    })
    userProgress.value = response.data.progress
  } catch (error) {
    console.error('Failed to update progress:', error)
  }
}

// Game functions
const initializeGame = () => {
  gameWon.value = false
  moves.value = 0
  startTime.value = Date.now()
  tiles.value = Array.from({ length: totalTiles.value }, (_, i) => i + 1)
  tiles.value[totalTiles.value - 1] = null // Last position is empty
  scramblePuzzle()
  gameStarted.value = true
}

const scramblePuzzle = () => {
  // Perform random moves to ensure solvable puzzle
  const emptyIndex = tiles.value.indexOf(null)
  const shuffleCount = totalTiles.value * 10

  for (let i = 0; i < shuffleCount; i++) {
    const neighbors = getNeighbors(emptyIndex)
    const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)]
    swapTiles(emptyIndex, randomNeighbor)
  }
}

const getNeighbors = (index) => {
  const neighbors = []
  const row = Math.floor(index / gridSize.value)
  const col = index % gridSize.value

  if (row > 0) neighbors.push(index - gridSize.value)
  if (row < gridSize.value - 1) neighbors.push(index + gridSize.value)
  if (col > 0) neighbors.push(index - 1)
  if (col < gridSize.value - 1) neighbors.push(index + 1)

  return neighbors
}

const swapTiles = (index1, index2) => {
  [tiles.value[index1], tiles.value[index2]] = [tiles.value[index2], tiles.value[index1]]
}

const moveTile = (index) => {
  const emptyIndex = tiles.value.indexOf(null)
  const neighbors = getNeighbors(emptyIndex)

  if (neighbors.includes(index)) {
    swapTiles(index, emptyIndex)
    moves.value++
    checkWin()
  }
}

const checkWin = () => {
  let isWon = true
  for (let i = 0; i < totalTiles.value - 1; i++) {
    if (tiles.value[i] !== i + 1) {
      isWon = false
      break
    }
  }
  if (isWon && tiles.value[totalTiles.value - 1] === null) {
    gameWon.value = true
    const time = Math.floor((Date.now() - startTime.value) / 1000)
    updateProgress(currentLevel.value, moves.value, time)
  }
}

const resetGame = () => {
  gameStarted.value = false
  gameWon.value = false
  moves.value = 0
  startTime.value = null
  tiles.value = []
}

const selectDifficulty = (diff) => {
  difficulty.value = diff
  currentLevel.value = 1
}

const selectLevel = (level) => {
  if (level <= maxLevel.value) {
    currentLevel.value = level
  }
}

const nextLevel = () => {
  if (currentLevel.value < 5) {
    currentLevel.value++
    resetGame()
  }
}

const getTileStyle = (index) => {
  const row = Math.floor(index / gridSize.value)
  const col = index % gridSize.value
  return {
    gridColumn: col + 1,
    gridRow: row + 1
  }
}

// Initialize
onMounted(async () => {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const response = await axios.get('/user/profile')
      currentUser.value = response.data
      userProgress.value = response.data.progress
      isLoggedIn.value = true
    } catch (error) {
      localStorage.removeItem('token')
    }
  }

  await loadLevels()
})
</script>

<template>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <h1>🧩 Sliding Puzzle Game</h1>
      <div class="auth-section">
        <div v-if="!isLoggedIn" class="auth-buttons">
          <button @click="showAuth = true; authMode = 'login'" class="auth-btn">Login</button>
          <button @click="showAuth = true; authMode = 'register'" class="auth-btn register">Register</button>
        </div>
        <div v-else class="user-info">
          <span>Welcome, {{ currentUser.username }}!</span>
          <button @click="logout" class="auth-btn logout">Logout</button>
        </div>
      </div>
    </header>

    <!-- Auth Modal -->
    <div v-if="showAuth" class="modal-overlay" @click="showAuth = false">
      <div class="modal" @click.stop>
        <h2>{{ authMode === 'login' ? 'Login' : 'Register' }}</h2>
        <form @submit.prevent="authMode === 'login' ? login() : register()">
          <div v-if="authMode === 'register'" class="form-group">
            <input
              v-model="authForm.username"
              type="text"
              placeholder="Username"
              required
            />
          </div>
          <div class="form-group">
            <input
              v-model="authForm.email"
              type="email"
              placeholder="Email"
              required
            />
          </div>
          <div class="form-group">
            <input
              v-model="authForm.password"
              type="password"
              placeholder="Password"
              required
            />
          </div>
          <div v-if="authError" class="error">{{ authError }}</div>
          <button type="submit" class="submit-btn">
            {{ authMode === 'login' ? 'Login' : 'Register' }}
          </button>
        </form>
        <button @click="showAuth = false" class="close-btn">×</button>
      </div>
    </div>

    <!-- Main Menu -->
    <div v-if="!gameStarted" class="menu">
      <div class="difficulty-selection">
        <h2>Select Difficulty</h2>
        <div class="difficulty-buttons">
          <button
            v-for="diff in ['easy', 'medium', 'hard']"
            :key="diff"
            @click="selectDifficulty(diff)"
            :class="['difficulty-btn', { active: difficulty === diff }]"
          >
            <span class="level-name">{{ diff.toUpperCase() }}</span>
            <span class="level-size">{{ diff === 'easy' ? '3×3' : diff === 'medium' ? '4×4' : '5×5' }}</span>
            <span class="progress">Level {{ userProgress[diff] }}/5</span>
          </button>
        </div>
      </div>

      <div class="level-selection">
        <h3>{{ difficulty.toUpperCase() }} Levels</h3>
        <div class="level-buttons">
          <button
            v-for="level in 5"
            :key="level"
            @click="selectLevel(level)"
            :class="['level-btn', {
              locked: level > maxLevel,
              active: currentLevel === level
            }]"
            :disabled="level > maxLevel"
          >
            {{ level }}
          </button>
        </div>
        <button @click="initializeGame()" class="start-btn" :disabled="currentLevel > maxLevel">
          Start Level {{ currentLevel }}
        </button>
      </div>
    </div>

    <!-- Game Area -->
    <div v-else class="game-area">
      <div class="info">
        <div class="level-info">
          <div class="level-badge">{{ difficulty.toUpperCase() }} - Level {{ currentLevel }}</div>
          <div class="level-desc">{{ currentLevelData?.description }}</div>
        </div>
        <div class="stats">
          <div class="moves">Moves: {{ moves }}</div>
          <div class="target">Target: {{ currentLevelData?.targetMoves }}</div>
        </div>
      </div>

      <div
        class="puzzle-grid"
        :style="{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`
        }"
      >
        <button
          v-for="(tile, index) in tiles"
          :key="index"
          :class="['tile', { empty: tile === null }]"
          :style="getTileStyle(index)"
          @click="moveTile(index)"
          :disabled="gameWon"
        >
          {{ tile }}
        </button>
      </div>

      <div class="game-controls">
        <button @click="resetGame" class="reset-btn">Back to Menu</button>
      </div>
    </div>

    <!-- Win Modal -->
    <div v-if="gameWon" class="win-overlay" @click="resetGame">
      <div class="win-message" @click.stop>
        <h2>🎉 Level Complete! 🎉</h2>
        <div class="win-stats">
          <p>Moves: {{ moves }} / {{ currentLevelData?.targetMoves }}</p>
          <p>Time: {{ Math.floor((Date.now() - startTime) / 1000) }}s</p>
        </div>
        <div class="win-actions">
          <button v-if="currentLevel < 5" @click="nextLevel()" class="next-btn">Next Level</button>
          <button @click="resetGame" class="menu-btn">Back to Menu</button>
        </div>
      </div>
    </div>
  </div>
</template>
