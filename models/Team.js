const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const teamSchema = new mongoose.Schema(
  {
    season: Number,
    teamId: String,
    abbr: String,
    cityState: String,
    fullName: String,
    nick: String,
    teamType: String,
    conferenceAbbr: String,
    divisionAbbr: String,
    conferenceId: String,
    conferenceAbbr: String,
    conferenceFullName: String,
    divisionId: String,
    divisionAbbr: String,
    divisionFullName: String,
    yearFound: String,
    stadiumName: String,
    ticketPhoneNumber: String,
    teamSiteUrl: String,
    teamSiteTicketUrl: String
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

module.exports = mongoose.model('Team', teamSchema)
