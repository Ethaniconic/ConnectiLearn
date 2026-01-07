import mongoose from 'mongoose'

const chunkSchema = new mongoose.Schema({
  text: { type: String, required: true },
  index: { type: Number, required: true },
  wordCount: { type: Number }
}, { _id: false })

const documentSchema = new mongoose.Schema({
  filename: { 
    type: String, 
    required: true 
  },
  originalName: { 
    type: String, 
    required: true 
  },
  filepath: { 
    type: String, 
    required: true 
  },
  content: { 
    type: String,
    default: ''
  },
  chunks: [chunkSchema],
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  fileType: { 
    type: String,
    enum: ['.pdf', '.txt', '.png', '.jpg', '.jpeg', '.bmp', '.tiff']
  },
  size: { 
    type: Number,
    default: 0
  },
  wordCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['processing', 'ready', 'error'],
    default: 'processing'
  },
  errorMessage: {
    type: String
  }
}, { 
  timestamps: true 
})

documentSchema.index({ userId: 1, createdAt: -1 })

documentSchema.methods.searchChunks = function(query, limit = 5) {
  const queryWords = query.toLowerCase().split(/\s+/)
  const results = []
  
  this.chunks.forEach(chunk => {
    const chunkLower = chunk.text.toLowerCase()
    const score = queryWords.filter(word => chunkLower.includes(word)).length
    if (score > 0) {
      results.push({ text: chunk.text, score, index: chunk.index })
    }
  })
  
  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}

export default mongoose.model('Document', documentSchema)
