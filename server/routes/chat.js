import express from 'express'
import Groq from 'groq-sdk'
import dotenv from 'dotenv'
import Document from '../models/Document.js'
import Chat from '../models/Chat.js'
import User from '../models/User.js'
import { auth } from '../middleware/auth.js'

dotenv.config()

const router = express.Router()

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const searchDocuments = (query, documents) => {
  const queryWords = query.toLowerCase().split(/\s+/)
  const results = []
  
  documents.forEach(doc => {
    doc.chunks.forEach(chunk => {
      const chunkLower = chunk.text.toLowerCase()
      const score = queryWords.filter(word => chunkLower.includes(word)).length
      if (score > 0) results.push({ text: chunk.text, filename: doc.originalName, score })
    })
  })
  
  return results.sort((a, b) => b.score - a.score).slice(0, 5)
}

router.get('/list', auth, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user._id })
      .select('_id title isPinned isActive updatedAt createdAt')
      .sort({ isPinned: -1, updatedAt: -1 })
    res.json({ chats })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/new', auth, async (req, res) => {
  try {
    await Chat.updateMany({ userId: req.user._id }, { isActive: false })
    const chat = new Chat({ userId: req.user._id, messages: [], title: 'New Chat', isActive: true })
    await chat.save()
    res.json({ chat })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/switch/:chatId', auth, async (req, res) => {
  try {
    await Chat.updateMany({ userId: req.user._id }, { isActive: false })
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.chatId, userId: req.user._id },
      { isActive: true },
      { new: true }
    )
    if (!chat) return res.status(404).json({ message: 'Chat not found' })
    res.json({ chat })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/pin/:chatId', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.user._id })
    if (!chat) return res.status(404).json({ message: 'Chat not found' })
    chat.isPinned = !chat.isPinned
    await chat.save()
    res.json({ chat })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.put('/rename/:chatId', auth, async (req, res) => {
  try {
    const { title } = req.body
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.chatId, userId: req.user._id },
      { title },
      { new: true }
    )
    if (!chat) return res.status(404).json({ message: 'Chat not found' })
    res.json({ chat })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.delete('/:chatId', auth, async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({ _id: req.params.chatId, userId: req.user._id })
    if (!chat) return res.status(404).json({ message: 'Chat not found' })
    if (chat.isActive) {
      const nextChat = await Chat.findOne({ userId: req.user._id }).sort({ updatedAt: -1 })
      if (nextChat) {
        nextChat.isActive = true
        await nextChat.save()
      }
    }
    res.json({ message: 'Chat deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/query', auth, async (req, res) => {
  try {
    const { query } = req.body
    if (!query) return res.status(400).json({ message: 'Query is required' })
    
    const documents = await Document.find({ userId: req.user._id, status: 'ready' })
    const contexts = searchDocuments(query, documents)
    
    let chat = await Chat.findOne({ userId: req.user._id, isActive: true })
    if (!chat) {
      chat = new Chat({ userId: req.user._id, messages: [], title: query.slice(0, 50), isActive: true })
    }
    
    if (chat.title === 'New Chat') chat.title = query.slice(0, 50)
    
    const contextText = contexts.map(c => `Document: ${c.filename}\n${c.text}`).join('\n\n')
    
    const systemPrompt = `You are a helpful AI learning assistant. Answer questions based on the provided context from the user's documents. If the answer is not in the context, say so politely and provide general guidance if possible. Be concise but thorough.`
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chat.messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: `Context from documents:\n${contextText}\n\nQuestion: ${query}` }
    ]
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages,
      temperature: 0.7,
      max_tokens: 1024
    })
    
    const answer = completion.choices[0].message.content
    
    chat.messages.push({ role: 'user', content: query, contexts })
    chat.messages.push({ role: 'assistant', content: answer })
    await chat.save()
    
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalQueries: 1 } })
    
    res.json({ answer, contexts, query, chatId: chat._id })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/history', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ userId: req.user._id, isActive: true })
    res.json({ history: chat?.messages || [], chatId: chat?._id })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.delete('/history', auth, async (req, res) => {
  try {
    await Chat.findOneAndUpdate({ userId: req.user._id, isActive: true }, { messages: [], title: 'New Chat' })
    res.json({ message: 'Chat history cleared' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
