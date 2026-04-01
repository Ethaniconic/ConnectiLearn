import express from 'express'
import { auth } from '../middleware/auth.js'
import Document from '../models/Document.js'
import { recommendContent } from '../services/recommendationModel.js'

const router = express.Router()

router.get('/stats', auth, async (req, res) => {
  try {
    const totalDocs = await Document.countDocuments({ userId: req.user._id })
    const completedDocs = await Document.countDocuments({ userId: req.user._id, isCompleted: true })
    const documents = await Document.find({ userId: req.user._id }).sort({ createdAt: -1 }).select('-content -chunks')
    
    // Calculate simple stats
    const completionRate = totalDocs > 0 ? (completedDocs / totalDocs) * 100 : 0
    
    // Get style-specific recommendations
    const recommendations = recommendContent({ 
      learningStyle: req.user.learningStyle, 
      questionnaire: req.user.questionnaire 
    })
    
    res.json({
      stats: {
        totalDocs,
        completedDocs,
        completionRate: Math.round(completionRate),
        learningStyle: req.user.learningStyle || 'Analysis Pending'
      },
      documents,
      recommendations
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
