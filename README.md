# Sliding Puzzle Game with Levels and User Accounts

A modern sliding puzzle game built with Vue.js frontend and Node.js/Express backend with MongoDB for user accounts and progress tracking.

## Features

- **Multiple Difficulty Levels**: Easy (3×3), Medium (4×4), Hard (5×5)
- **Progressive Levels**: 5 levels per difficulty with increasing challenge
- **User Authentication**: Register and login to save progress
- **Progress Tracking**: Track completed levels and personal bests
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- Vue.js 3
- Vite
- Axios for API calls
- CSS with dark mode support

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcrypt for password hashing

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the server directory using `.env.example` as a template:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   ```
   # MongoDB Atlas Connection String
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/puzzle_game?retryWrites=true&w=majority
   
   # Generate a secure JWT secret (use: openssl rand -base64 32)
   JWT_SECRET=your_generated_secret_key_here
   
   PORT=5000
   ```

5. Start MongoDB service (if using local MongoDB) or ensure MongoDB Atlas is accessible

6. Start the backend server:
   ```bash
   npm start
   ```
   or for development:
   ```bash
   npm run dev
   ```

The backend will run on http://localhost:5000

### Environment Variables

- `MONGODB_URI`: MongoDB connection string (local or MongoDB Atlas)
- `JWT_SECRET`: Secret key for JWT token signing (keep this secure!)
- `PORT`: Server port (default: 5000)

**Security Note**: Never commit `.env` files to version control. Use `.env.example` as a template and document required variables.

### Frontend Setup

1. Navigate to the root directory:
   ```bash
   cd puzzle_game
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on http://localhost:5173

## Game Rules

- Slide tiles to arrange them in numerical order
- The empty space allows tiles to move
- Complete each level within the target number of moves
- Progress through 5 levels per difficulty
- Unlock higher levels by completing previous ones

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### User
- `GET /api/user/profile` - Get user profile (requires auth)
- `PUT /api/user/progress` - Update user progress (requires auth)

### Levels
- `GET /api/levels` - Get all levels

## Database Schema

### User
- username: String (unique)
- email: String (unique)
- password: String (hashed)
- progress: Object { easy: Number, medium: Number, hard: Number }
- completedLevels: Array of completed level records

### Level
- difficulty: String
- level: Number
- gridSize: Number
- targetMoves: Number
- description: String

## Development

### Running Tests
- Frontend: `npm run dev`
- Backend: `npm run dev` (with nodemon)

### Building for Production
- Frontend: `npm run build`
- Backend: `npm start`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.
