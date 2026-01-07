import mongoose from 'mongoose'

const contextSchema = new mongoose.Schema({
  text: { type: String },
  filename: { type: String },
  score: { type: Number }
}, { _id: false })

const messageSchema = new mongoose.Schema({
  role: { 
    type: String, 
    enum: ['user', 'assistant'], 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  contexts: [contextSchema],
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
})

const chatSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'New Chat'
  },
  messages: [messageSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true 
})

chatSchema.index({ userId: 1, isPinned: -1, updatedAt: -1 })

export default mongoose.model('Chat', chatSchema)
