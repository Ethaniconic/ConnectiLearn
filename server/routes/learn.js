import express from 'express'
import Groq from 'groq-sdk'
import dotenv from 'dotenv'
import Document from '../models/Document.js'
import { auth } from '../middleware/auth.js'

import StyleLeaderboard from '../models/StyleLeaderboard.js'

dotenv.config()

const router = express.Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

router.get('/hype', auth, async (req, res) => {
  try {
    const style = req.user.learningStyle
    if (!style) return res.json({ message: "Welcome to ConnectiLearn!" })

    const board = await StyleLeaderboard.getLeaderboard()
    
    // Convert DB fields to readable
    const pointsText = `Visual: ${board.visualPoints}, Auditory: ${board.auditoryPoints}, ReadWrite: ${board.readwritePoints}, Kinesthetic: ${board.kinestheticPoints}`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an enthusiastic gamification announcer. The user is a "${style}" learner.
          The current global leaderboard points for platform usage are: ${pointsText}.
          Write a short, highly-hyped 2-sentence message welcoming the user to their learning dashboard, bragging about their specific learning style's points or encouraging them to boost their points to beat the others! Do NOT use hashtags or emojis in excess.`
        }
      ],
      temperature: 0.8,
      max_tokens: 150
    })

    const message = completion.choices[0].message.content
    res.json({ message, points: board })
  } catch (error) {
    res.json({ message: `Welcome to your learning dashboard! Your style is ${req.user.learningStyle}.` })
  }
})

router.post('/flashcards', auth, async (req, res) => {
  try {
    const { documentId, mode } = req.body
    
    // Increment specific learning style if provided
    if (mode) {
      const modeMap = { visual: 'Visual', auditory: 'Auditory', readwrite: 'ReadWrite', kinesthetic: 'Kinesthetic' }
      if (modeMap[mode]) await StyleLeaderboard.incrementPoints(modeMap[mode])
    }

    const document = await Document.findOne({ _id: documentId, userId: req.user._id })
    if (!document) return res.status(404).json({ message: 'Document not found' })

    const content = document.chunks.map(c => c.text).join('\n').slice(0, 5000)
    if (!content || content.trim().length < 50) {
      return res.status(400).json({ message: 'Document content is too short to generate meaningful flashcards. Please upload a more detailed file.' })
    }
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an educational AI. Output ONLY a valid JSON array of flashcards from the provided text.
          NO markdown, NO code blocks, NO preamble. 
          The JSON must be an array of objects with "front" and "back" keys.
          Example: [{"front": "Q", "back": "A"}]`
        },
        {
          role: 'user',
          content: `Generate 5 flashcards from this content:\n\n${content}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })

    let flashcards = []
    const responseText = completion.choices[0].message.content
    try {
      // Find index of first [ and last ]
      const start = responseText.indexOf('[')
      const end = responseText.lastIndexOf(']')
      if (start !== -1 && end !== -1) {
        const jsonStr = responseText.substring(start, end + 1)
        flashcards = JSON.parse(jsonStr)
      } else {
        throw new Error("Missing array markers")
      }
    } catch (e) {
      console.error('Flashcard Parsing Error:', responseText)
      return res.status(500).json({ message: 'AI model produced malformed JSON. Please refresh and try again.' })
    }

    res.json({ flashcards })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/quiz', auth, async (req, res) => {
  try {
    const { documentId, mode } = req.body
    
    // Increment specific learning style if provided
    if (mode) {
      const modeMap = { visual: 'Visual', auditory: 'Auditory', readwrite: 'ReadWrite', kinesthetic: 'Kinesthetic' }
      if (modeMap[mode]) await StyleLeaderboard.incrementPoints(modeMap[mode])
    }
    const document = await Document.findOne({ _id: documentId, userId: req.user._id })
    if (!document) return res.status(404).json({ message: 'Document not found' })

    const content = document.chunks.map(c => c.text).join('\n').slice(0, 5000)
    if (!content || content.trim().length < 50) {
      return res.status(400).json({ message: 'Document content is too short for a quiz.' })
    }
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an educational AI. Output ONLY a valid JSON array of quiz questions.
          NO markdown, NO code blocks, NO preamble.
          Format: [{"question": "text", "options": ["A", "B", "C", "D"], "correct": index}]`
        },
        {
          role: 'user',
          content: `Create 5 quiz questions from this content:\n\n${content}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })

    let questions = []
    const responseText = completion.choices[0].message.content
    try {
      const start = responseText.indexOf('[')
      const end = responseText.lastIndexOf(']')
      if (start !== -1 && end !== -1) {
        const jsonStr = responseText.substring(start, end + 1)
        questions = JSON.parse(jsonStr)
      } else {
        throw new Error("Missing array markers")
      }
    } catch (e) {
      console.error('Quiz Parsing Error:', responseText)
      return res.status(500).json({ message: 'AI model produced malformed JSON for the quiz.' })
    }

    res.json({ questions })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/summary', auth, async (req, res) => {
  try {
    const { documentId, mode } = req.body
    
    // Increment specific learning style if provided
    if (mode) {
      const modeMap = { visual: 'Visual', auditory: 'Auditory', readwrite: 'ReadWrite', kinesthetic: 'Kinesthetic' }
      if (modeMap[mode]) await StyleLeaderboard.incrementPoints(modeMap[mode])
    }

    const document = await Document.findOne({ _id: documentId, userId: req.user._id })
    if (!document) return res.status(404).json({ message: 'Document not found' })

    const content = document.chunks.map(c => c.text).join('\n').slice(0, 5000)
    if (!content || content.trim().length < 50) {
      return res.status(400).json({ message: 'Document content is too short to generate a summary.' })
    }
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an educational assistant. Create a clear, spoken-style summary of the content.
          The summary should:
          - Be conversational and easy to understand when read aloud
          - Cover the key points in 3-5 paragraphs
          - Use simple language and short sentences
          - Be suitable for audio learning`
        },
        {
          role: 'user',
          content: `Create an audio-friendly summary of this content:\n\n${content}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1200
    })

    const summary = completion.choices[0].message.content
    res.json({ summary })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/mindmap', auth, async (req, res) => {
  try {
    const { documentId, mode } = req.body
    
    // Increment specific learning style if provided
    if (mode) {
      const modeMap = { visual: 'Visual', auditory: 'Auditory', readwrite: 'ReadWrite', kinesthetic: 'Kinesthetic' }
      if (modeMap[mode]) await StyleLeaderboard.incrementPoints(modeMap[mode])
    }
    const document = await Document.findOne({ _id: documentId, userId: req.user._id })
    if (!document) return res.status(404).json({ message: 'Document not found' })

    const content = document.chunks.map(c => c.text).join('\n').slice(0, 5000)
    if (!content || content.trim().length < 50) {
      return res.status(400).json({ message: 'Document content is too short for a mind map.' })
    }
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an educational designer. Summarize the user's content into a JSON mind-map structure.
          Return ONLY a JSON object. NO markdown, NO code blocks, NO preamble.
          Format:
          {
            "central": "The main topic",
            "branches": [
              {
                "name": "A main concept",
                "children": ["detail 1", "detail 2"]
              }
            ]
          }`
        },
        {
          role: 'user',
          content: `Analyze this content and extract a mind map:\n\n${content}`
        }
      ],
      temperature: 0.1,
      max_tokens: 1500
    })

    let mindmap = { central: "Main Topic", branches: [] }
    const responseText = completion.choices[0].message.content
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        mindmap = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON object found")
      }
    } catch (e) {
      console.error('Mindmap Parsing Error:', responseText)
      return res.status(500).json({ message: 'Failed to generate a valid mind map. The content might be too complex or unstructured.' })
    }

    res.json({ mindmap })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
