import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import pdfParse from 'pdf-parse'
import Document from '../models/Document.js'
import User from '../models/User.js'
import { auth } from '../middleware/auth.js'

const router = express.Router()

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads'
    if (!fs.existsSync(dir)) fs.mkdirSync(dir)
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.txt', '.png', '.jpg', '.jpeg']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('Invalid file type'))
  }
})

const chunkText = (text, chunkSize = 500) => {
  const words = text.split(/\s+/)
  const chunks = []
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunkWords = words.slice(i, i + chunkSize)
    chunks.push({
      text: chunkWords.join(' '),
      index: chunks.length,
      wordCount: chunkWords.length
    })
  }
  return chunks
}

const extractText = async (filepath, ext) => {
  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filepath)
    const data = await pdfParse(buffer)
    return data.text
  }
  if (ext === '.txt') {
    return fs.readFileSync(filepath, 'utf-8')
  }
  return ''
}

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
    
    const ext = path.extname(req.file.originalname).toLowerCase()
    const content = await extractText(req.file.path, ext)
    const chunks = chunkText(content)
    const wordCount = content.split(/\s+/).length
    
    const doc = new Document({
      filename: req.file.filename,
      originalName: req.file.originalname,
      filepath: req.file.path,
      content,
      chunks,
      userId: req.user._id,
      fileType: ext,
      size: req.file.size,
      wordCount,
      status: 'ready'
    })
    await doc.save()
    
    await User.findByIdAndUpdate(req.user._id, { $inc: { documentsCount: 1 } })
    
    res.json({ message: 'Document uploaded successfully', document: doc })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/', auth, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id }).select('-content -chunks')
    res.json({ documents })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    if (!doc) return res.status(404).json({ message: 'Document not found' })
    if (fs.existsSync(doc.filepath)) fs.unlinkSync(doc.filepath)
    await User.findByIdAndUpdate(req.user._id, { $inc: { documentsCount: -1 } })
    res.json({ message: 'Document deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
