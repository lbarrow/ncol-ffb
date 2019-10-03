const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const ownerSchema = new mongoose.Schema(
  {
    ownerId: String,
    displayName: String,
    wins: Number,
    losses: Number,
    streak: String
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

module.exports = mongoose.model('Owner', ownerSchema)
