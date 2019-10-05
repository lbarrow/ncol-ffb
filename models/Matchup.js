const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const matchupSchema = new mongoose.Schema(
  {
    week: Number,
    home: String,
    homeScore: Number,
    homePlayersLeft: Number,
    homePlayersPlaying: Number,
    homePlayersDone: Number,
    away: String,
    awayScore: Number,
    awayPlayersLeft: Number,
    awayPlayersPlaying: Number,
    awayPlayersDone: Number
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

module.exports = mongoose.model('Matchup', matchupSchema)
