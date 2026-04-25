import mongoose from 'mongoose'

const behaviorMetricSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
    index: true
  },
  pagePath: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  totalTimeMs: {
    type: Number,
    default: 0,
    min: 0
  },
  tabSwitchCount: {
    type: Number,
    default: 0,
    min: 0
  },
  visitCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastReason: {
    type: String,
    default: 'heartbeat',
    trim: true,
    maxlength: 50
  },
  lastUserAgent: {
    type: String,
    default: '',
    maxlength: 300
  },
  firstSeenAt: {
    type: Date,
    default: Date.now
  },
  lastSeenAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

behaviorMetricSchema.index({ userId: 1, sessionId: 1, pagePath: 1 }, { unique: true })
behaviorMetricSchema.index({ userId: 1, pagePath: 1 })

export default mongoose.model('BehaviorMetric', behaviorMetricSchema)