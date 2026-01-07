import express from 'express'
import User from '../models/User.js'
import Document from '../models/Document.js'
import Chat from '../models/Chat.js'
import { adminAuth } from '../middleware/auth.js'

const router = express.Router()

router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const totalDocuments = await Document.countDocuments()
    const totalChats = await Chat.countDocuments()
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('-password')
    
    res.json({ totalUsers, totalDocuments, totalChats, recentUsers })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 })
    res.json({ users })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id)
    await Document.deleteMany({ userId: req.params.id })
    await Chat.deleteMany({ userId: req.params.id })
    res.json({ message: 'User deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.patch('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const { role } = req.body
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password')
    res.json({ user })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/documents', adminAuth, async (req, res) => {
  try {
    const documents = await Document.find().populate('userId', 'name email').select('-content -chunks')
    res.json({ documents })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
