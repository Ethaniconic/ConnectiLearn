import express from 'express'
import Groq from 'groq-sdk'
import dotenv from 'dotenv'
import Document from '../models/Document.js'
import { auth } from '../middleware/auth.js'

dotenv.config()

const router = express.Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

router.post('/flashcards', auth, async (req, res) => {
  try {
    const { documentId } = req.body
    const document = await Document.findOne({ _id: documentId, userId: req.user._id })
    if (!document) return res.status(404).json({ message: 'Document not found' })

    const content = document.chunks.map(c => c.text).join('\n').slice(0, 4000)
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an educational assistant. Generate exactly 5 flashcards from the given content. 
          Return ONLY a JSON array with this format, no other text:
          [{"front": "question", "back": "answer"}]
          Make questions clear and concise. Answers should be brief but complete.`
        },
        {
          role: 'user',
          content: `Create 5 flashcards from this content:\n\n${content}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1024
    })

    let flashcards = []
    try {
      const responseText = completion.choices[0].message.content
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        flashcards = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      flashcards = [
        { front: "What is the main topic?", back: "Review the document for details." }
      ]
    }

    res.json({ flashcards })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/quiz', auth, async (req, res) => {
  try {
    const { documentId } = req.body
    const document = await Document.findOne({ _id: documentId, userId: req.user._id })
    if (!document) return res.status(404).json({ message: 'Document not found' })

    const content = document.chunks.map(c => c.text).join('\n').slice(0, 4000)
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an educational assistant. Generate exactly 5 multiple choice questions from the given content.
          Return ONLY a JSON array with this format, no other text:
          [{"question": "question text", "options": ["A", "B", "C", "D"], "correct": 0}]
          The "correct" field is the index (0-3) of the correct answer.
          Make questions test understanding, not just memorization.`
        },
        {
          role: 'user',
          content: `Create 5 quiz questions from this content:\n\n${content}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })

    let questions = []
    try {
      const responseText = completion.choices[0].message.content
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      questions = [
        { 
          question: "What is the main topic of this document?", 
          options: ["Option A", "Option B", "Option C", "Option D"], 
          correct: 0 
        }
      ]
    }

    res.json({ questions })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/summary', auth, async (req, res) => {
  try {
    const { documentId } = req.body
    const document = await Document.findOne({ _id: documentId, userId: req.user._id })
    if (!document) return res.status(404).json({ message: 'Document not found' })

    const content = document.chunks.map(c => c.text).join('\n').slice(0, 4000)
    
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
      max_tokens: 800
    })

    const summary = completion.choices[0].message.content

    res.json({ summary })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/mindmap', auth, async (req, res) => {
  try {
    const { documentId } = req.body
    const document = await Document.findOne({ _id: documentId, userId: req.user._id })
    if (!document) return res.status(404).json({ message: 'Document not found' })

    const content = document.chunks.map(c => c.text).join('\n').slice(0, 4000)
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an educational assistant. Extract the main concepts and their relationships from the content.
          Return ONLY a JSON object with this format, no other text:
          {
            "central": "Main Topic",
            "branches": [
              {
                "name": "Subtopic 1",
                "children": ["Detail 1", "Detail 2"]
              }
            ]
          }
          Keep it to 3-5 main branches with 2-3 children each.`
        },
        {
          role: 'user',
          content: `Extract concepts for a mind map from this content:\n\n${content}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    let mindmap = { central: "Main Topic", branches: [] }
    try {
      const responseText = completion.choices[0].message.content
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        mindmap = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.error('Mind map parse error:', e)
    }

    res.json({ mindmap })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
