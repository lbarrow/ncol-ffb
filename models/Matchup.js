const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const matchupSchema = new mongoose.Schema(
  {
    week: Number,
    home: String,
    homeScore: Number,
    away: String,
    awayScore: Number
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

module.exports = mongoose.model('Matchup', matchupSchema)
