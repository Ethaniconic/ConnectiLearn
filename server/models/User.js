import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  avatar: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  documentsCount: {
    type: Number,
    default: 0
  },
  totalQueries: {
    type: Number,
    default: 0
  },
  questionnaireCompleted: {
    type: Boolean,
    default: false
  },
  learningStyle: {
    type: String,
    enum: ['Visual', 'Auditory', 'Kinesthetic', 'ReadWrite'],
    default: null
  },
  questionnaire: {
    type: [Number],
    default: [],
    validate: [v => v.length === 0 || v.length === 20, 'Questionnaire must have exactly 20 answers']
  }
}, { 
  timestamps: true 
})

userSchema.index({ email: 1 })
userSchema.index({ role: 1 })

export default mongoose.model('User', userSchema)
