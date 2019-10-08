const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const ownerSchema = new mongoose.Schema(
  {
    ownerId: String,
    displayName: String,
    wins: Number,
    losses: Number,
    pointsFor: Number,
    pointsAgainst: Number,
    streak: String,
    resultHistory: [String]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

module.exports = mongoose.model('Owner', ownerSchema)
