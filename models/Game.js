const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const gameSchema = new mongoose.Schema(
  {
    gameID: Number,
    season: Number,
    seasonType: String,
    week: Number,
    gameId: String,
    gameKey: String,
    gameDate: String,
    gameTimeEastern: String,
    gameTimeLocal: String,
    isoTime: Date,
    homeTeamId: String,
    visitorTeamId: String,
    homeTeamAbbr: String,
    visitorTeamAbbr: String,
    homeDisplayName: String,
    visitorDisplayName: String,
    homeNickname: String,
    visitorNickname: String,
    gameType: String,
    weekNameAbbr: String,
    weekName: String
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

module.exports = mongoose.model('Game', gameSchema)
