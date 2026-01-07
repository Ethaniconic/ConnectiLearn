import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import documentRoutes from './routes/documents.js'
import chatRoutes from './routes/chat.js'
import adminRoutes from './routes/admin.js'
import learnRoutes from './routes/learn.js'

dotenv.config()

const app = express()

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://connecti-learn.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean)

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))
app.use(express.json())
app.use('/uploads', express.static('uploads'))

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err))

app.use('/api/auth', authRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/learn', learnRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', message: 'Smart Learning AI is running' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
