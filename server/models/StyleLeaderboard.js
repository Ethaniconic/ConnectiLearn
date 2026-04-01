import mongoose from 'mongoose'

const styleLeaderboardSchema = new mongoose.Schema({
  singletonId: {
    type: String,
    default: 'global',
    unique: true
  },
  visualPoints: {
    type: Number,
    default: 0
  },
  auditoryPoints: {
    type: Number,
    default: 0
  },
  readwritePoints: {
    type: Number,
    default: 0
  },
  kinestheticPoints: {
    type: Number,
    default: 0
  }
})

// Ensures only one leaderboard document exists
styleLeaderboardSchema.statics.getLeaderboard = async function() {
  let board = await this.findOne({ singletonId: 'global' })
  if (!board) {
    board = await this.create({ singletonId: 'global' })
  }
  return board
}

styleLeaderboardSchema.statics.incrementPoints = async function(style, amount = 1) {
  const fieldMapping = {
    'Visual': 'visualPoints',
    'Auditory': 'auditoryPoints',
    'ReadWrite': 'readwritePoints',
    'Kinesthetic': 'kinestheticPoints'
  }
  const field = fieldMapping[style]
  if (!field) return null
  
  return this.findOneAndUpdate(
    { singletonId: 'global' },
    { $inc: { [field]: amount } },
    { new: true, upsert: true }
  )
}

const StyleLeaderboard = mongoose.model('StyleLeaderboard', styleLeaderboardSchema)
export default StyleLeaderboard
