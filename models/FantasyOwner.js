const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const fantasyOwnerSchema = new mongoose.Schema(
  {
    id: Number,
    name: String,
    teamName: String
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

module.exports = mongoose.model('FantasyOwner', fantasyOwnerSchema)
