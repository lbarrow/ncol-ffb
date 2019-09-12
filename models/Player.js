const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const playerSchema = new mongoose.Schema(
  {
    season: Number,
    nflId: Number,
    status: String,
    displayName: String,
    firstName: String,
    lastName: String,
    esbId: String,
    gsisId: String,
    middleName: String,
    birthDate: String,
    homeTown: String,
    collegeId: Number,
    collegeName: String,
    positionGroup: String,
    position: String,
    jerseyNumber: Number,
    height: String,
    weight: Number,
    yearsOfExperience: Number,
    teamAbbr: String,
    teamSeq: Number,
    teamId: String,
    teamFullName: String
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

module.exports = mongoose.model('Player', playerSchema)
