const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const statlineSchema = new mongoose.Schema(
  {
    gsisId: { type: String, index: true },
    player: {
      type: mongoose.Schema.ObjectId,
      ref: 'Player'
    },
    name: String,
    gameId: String,
    week: Number,
    position: String,
    passingAttempts: Number,
    passingCompletions: Number,
    passingYards: Number,
    passingTDs: Number,
    passingInts: Number,
    passingTwoPts: Number,
    rushingAttempts: Number,
    rushingYards: Number,
    rushingTDs: Number,
    rushingTwoPts: Number,
    receivingReceptions: Number,
    receivingYards: Number,
    receivingTDs: Number,
    receivingTwoPts: Number,
    fumbles: Number,
    sacks: Number,
    ints: Number,
    safeties: Number,
    fumbles: Number,
    TDs: Number,
    pointsAllowed: Number,
    fantasyPoints: Number
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

statlineSchema.index({ week: 1, gsisId: 1 })

function autopopulate(next) {
  this.populate('player')
  next()
}

statlineSchema.pre('find', autopopulate)
statlineSchema.pre('findOne', autopopulate)

module.exports = mongoose.model('Statline', statlineSchema)
