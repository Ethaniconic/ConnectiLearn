import express from 'express'
import Groq from 'groq-sdk'
import dotenv from 'dotenv'
import Document from '../models/Document.js'
import { auth } from '../middleware/auth.js'

import StyleLeaderboard from '../models/StyleLeaderboard.js'

dotenv.config()

const router = express.Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

/**
 * Robustly parses JSON from LLM responses, handling markdown blocks, 
 * trailing commas, and unescaped newlines.
 */
const safeParseJSON = (str) => {
  try {
    // 1. Strip Markdown code blocks (e.g. ```json ... ```)
    const jsonBlock = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    let cleanStr = jsonBlock ? jsonBlock[1] : str
    
    // 2. Find the first [ or { and the last ] or }
    const startIdx = cleanStr.indexOf('[') !== -1 ? cleanStr.indexOf('[') : cleanStr.indexOf('{')
    const endIdx = cleanStr.lastIndexOf(']') !== -1 ? cleanStr.lastIndexOf(']') : cleanStr.lastIndexOf('}')
    
    if (startIdx === -1 || endIdx === -1) throw new Error("No JSON markers found")
    cleanStr = cleanStr.slice(startIdx, endIdx + 1)
    
    // 3. Remove trailing commas in objects/arrays (very common LLM mistake)
    cleanStr = cleanStr.replace(/,\s*([\]}])/g, '$1')
    
    return JSON.parse(cleanStr)
  } catch (error) {
    console.error("Manual Parse Failed:", error.message)
    // One last ditch: search for an array pattern specifically if it's flashcards/quiz
    return null 
  }
}

/**
 * Cleans content of characters that often break JSON formatting in LLM responses.
 */
const sanitizeContent = (text) => {
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // remove control chars
    .replace(/\\/g, '\\\\')                      // escape backslashes
    .replace(/"/g, '\"')                         // escape quotes
    .slice(0, 5000)
}

const isGroqInvalidKeyError = (error) => {
  const normalizedMessage = (error?.message || '').toLowerCase()
  const normalizedCode = (error?.code || error?.error?.code || '').toLowerCase()
  const normalizedType = (error?.type || error?.error?.type || '').toLowerCase()
  const statusCode = error?.status || error?.response?.status

  return (
    statusCode === 401 ||
    normalizedCode === 'invalid_api_key' ||
    normalizedType === 'invalid_request_error' ||
    normalizedMessage.includes('invalid api key')
  )
}

const buildPodcastFallbackSummary = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return 'This topic has been loaded, but we could not generate an AI summary at the moment. Please try again in a few minutes.'
  }

  const normalizedText = rawText
    .replace(/\s+/g, ' ')
    .replace(/\uFFFD/g, ' ')
    .trim()

  const sentences = normalizedText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40)

  if (sentences.length === 0) {
    const shortText = normalizedText.slice(0, 1200)
    return `Here is a quick learning brief from your document. ${shortText}`
  }

  const selected = sentences.slice(0, 10)
  const chunks = []
  for (let i = 0; i < selected.length; i += 3) {
    chunks.push(selected.slice(i, i + 3).join(' '))
  }

  return [
    'This is your podcast-style study recap from the selected document.',
    ...chunks.slice(0, 4),
    'End of recap. You can replay this and then move to quiz mode to test retention.'
  ].join('\n\n')
}

router.get('/hype', auth, async (req, res) => {
  try {
    const style = req.user.learningStyle
    if (!style) return res.json({ message: "Welcome to ConnectiLearn!" })

    const board = await StyleLeaderboard.getLeaderboard()
    
    // Convert DB fields to readable
    const pointsText = `Visual: ${board.visualPoints}, Auditory: ${board.auditoryPoints}, ReadWrite: ${board.readwritePoints}, Kinesthetic: ${board.kinestheticPoints}`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
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

    const content = sanitizeContent(document.chunks.map(c => c.text).join('\n'))
    if (!content || content.trim().length < 50) {
      return res.status(400).json({ message: 'Document content is too short to generate meaningful flashcards.' })
    }
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
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

    const responseText = completion.choices[0].message.content
    const flashcards = safeParseJSON(responseText)

    if (!flashcards) {
      console.error('Flashcard Parsing Error:', responseText)
      return res.status(500).json({ message: 'AI model failed with the current document formatting. Please try a different section or a simpler file.' })
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

    const content = sanitizeContent(document.chunks.map(c => c.text).join('\n'))
    if (!content || content.trim().length < 50) {
      return res.status(400).json({ message: 'Document content is too short for a quiz.' })
    }
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
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

    const responseText = completion.choices[0].message.content
    const questions = safeParseJSON(responseText)

    if (!questions) {
      console.error('Quiz Parsing Error:', responseText)
      return res.status(500).json({ message: 'AI failed to construct a valid quiz from this text format. Please try a different document.' })
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

    const content = sanitizeContent(document.chunks.map(c => c.text).join('\n'))
    if (!content || content.trim().length < 50) {
      return res.status(400).json({ message: 'Document content is too short to generate a summary.' })
    }
    
    const apiKey = (process.env.GROQ_API_KEY || '').trim()

    if (!apiKey) {
      const fallbackSummary = buildPodcastFallbackSummary(content)
      return res.json({
        summary: fallbackSummary,
        source: 'fallback',
        note: 'Audio summary generated in fallback mode because AI provider key is missing.'
      })
    }

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
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
      return res.json({ summary, source: 'groq' })
    } catch (error) {
      const fallbackSummary = buildPodcastFallbackSummary(content)

      if (isGroqInvalidKeyError(error)) {
        return res.json({
          summary: fallbackSummary,
          source: 'fallback',
          note: 'Audio summary generated in fallback mode because the AI API key is invalid.'
        })
      }

      return res.json({
        summary: fallbackSummary,
        source: 'fallback',
        note: 'Audio summary generated in fallback mode because the AI provider is currently unavailable.'
      })
    }
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

    const content = sanitizeContent(document.chunks.map(c => c.text).join('\n'))
    if (!content || content.trim().length < 50) {
      return res.status(400).json({ message: 'Document content is too short for a mind map.' })
    }
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
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

    const responseText = completion.choices[0].message.content
    const mindmap = safeParseJSON(responseText)

    if (!mindmap) {
      console.error('Mindmap Parsing Error:', responseText)
      return res.status(500).json({ message: 'Failed to generate a valid mind map from this content. Please try a different section or a simpler file.' })
    }

    res.json({ mindmap })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
