import express from 'express'
import { auth } from '../middleware/auth.js'
import User from '../models/User.js'
import {
  normalizeQuestionnaire,
  predictLearningStyle,
  recommendContent
} from '../services/recommendationModel.js'

const router = express.Router()

const hasAllFields = (payload) => Array.isArray(payload) && payload.length === 20 && payload.every((val) => val !== undefined && val !== null)

router.get('/questionnaire', auth, async (req, res) => {
  res.json({
    questionnaireCompleted: req.user.questionnaireCompleted,
    learningStyle: req.user.learningStyle,
    questionnaire: req.user.questionnaire
  })
})

router.post('/questionnaire', auth, async (req, res) => {
  try {
    if (req.user.questionnaireCompleted) {
      return res.status(403).json({ message: 'Questionnaire has already been completed.' })
    }

    const rawAnswers = req.body.answers || req.body // Support { answers: [...] } or just [...]
    if (!hasAllFields(rawAnswers)) {
      return res.status(400).json({ message: 'All 20 VARK questionnaire fields are required.' })
    }

    const questionnaire = normalizeQuestionnaire(rawAnswers)
    const invalid = questionnaire.some((value) => Number.isNaN(value))
    if (invalid) {
      return res.status(400).json({ message: 'Questionnaire values must be numeric.' })
    }

    const learningStyle = await predictLearningStyle(questionnaire)
    const recommendations = recommendContent({ learningStyle, questionnaire })

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          questionnaire,
          learningStyle,
          questionnaireCompleted: true
        }
      },
      { new: true }
    )

    res.json({
      learningStyle,
      recommendations,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        questionnaireCompleted: user.questionnaireCompleted,
        learningStyle: user.learningStyle,
        questionnaire: user.questionnaire
      }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/recommendations', auth, async (req, res) => {
  if (!req.user.questionnaireCompleted || !req.user.learningStyle) {
    return res.status(400).json({ message: 'Complete questionnaire first.' })
  }

  const recommendations = recommendContent({
    learningStyle: req.user.learningStyle,
    questionnaire: req.user.questionnaire
  })

  res.json({
    learningStyle: req.user.learningStyle,
    recommendations
  })
})

router.post('/reset', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          questionnaire: [],
          learningStyle: null,
          questionnaireCompleted: false
        }
      },
      { new: true }
    )

    res.json({
      message: 'Questionnaire reset successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        questionnaireCompleted: user.questionnaireCompleted,
        learningStyle: user.learningStyle,
        questionnaire: user.questionnaire
      }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
