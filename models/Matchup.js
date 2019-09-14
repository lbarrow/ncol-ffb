const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const matchupSchema = new mongoose.Schema(
  {
    week: Number,
    home: String,
    away: String
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

module.exports = mongoose.model('Matchup', matchupSchema)
