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
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
