const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const gameTeamStatsSchema = new mongoose.Schema({
  teamId: String,
  teamAbbr: String,
  displayName: String,
  nickname: String,
  timeouts: Number,
  totalFirstDowns: Number,
  totalYards: Number,
  passingYards: Number,
  receivingYards: Number,
  penalties: Number,
  penaltyYards: Number,
  turnovers: Number,
  punt: Number,
  puntyds: Number,
  puntavg: Number,
  timeOfPossession: String,
  score: {
    quarter1: Number,
    quarter2: Number,
    quarter3: Number,
    quarter4: Number,
    overtime: Number,
    current: Number
  },
  passing: [
    {
      gsisId: String,
      nameAbbr: String,
      attempts: Number,
      completions: Number,
      yards: Number,
      touchdowns: Number,
      interceptions: Number,
      twoPointsAttempted: Number,
      twoPointsMade: Number
    }
  ],
  rushing: [
    {
      gsisId: String,
      nameAbbr: String,
      attempts: Number,
      yards: Number,
      touchdowns: Number,
      long: Number,
      longTouchdown: Number,
      twoPointsAttempted: Number,
      twoPointsMade: Number
    }
  ],
  receiving: [
    {
      gsisId: String,
      nameAbbr: String,
      receptions: Number,
      yards: Number,
      touchdowns: Number,
      long: Number,
      longTouchdown: Number,
      twoPointsAttempted: Number,
      twoPointsMade: Number
    }
  ],
  fumbles: [
    {
      gsisId: String,
      nameAbbr: String,
      total: Number,
      recovered: Number,
      teamRecovered: Number,
      yards: Number,
      lost: Number
    }
  ],
  kicking: [
    {
      gsisId: String,
      nameAbbr: String,
      fieldGoalsAttempted: Number,
      fieldGoalsMade: Number,
      fieldGoalYards: Number,
      totalPointsFromFieldGoals: Number,
      extraPointsAttempted: Number,
      extraPointsMade: Number,
      extraPointsMissed: Number,
      extraPointsBlocked: Number,
      extraPointsTotal: Number
    }
  ],
  punting: [
    {
      gsisId: String,
      nameAbbr: String,
      punts: Number,
      yards: Number,
      average: Number,
      recoveredWithinThe20: Number,
      long: Number
    }
  ],
  kickReturning: [
    {
      gsisId: String,
      nameAbbr: String,
      returns: Number,
      average: Number,
      touchdowns: Number,
      long: Number,
      longTouchdown: Number
    }
  ],
  puntReturning: [
    {
      gsisId: String,
      nameAbbr: String,
      returns: Number,
      average: Number,
      touchdowns: Number,
      long: Number,
      longTouchdown: Number
    }
  ],
  defense: [
    {
      gsisId: String,
      nameAbbr: String,
      tackles: Number,
      assists: Number,
      sacks: Number,
      interceptions: Number,
      forcedFumbles: Number
    }
  ],
  punting: [
    {
      gsisId: String,
      nameAbbr: String,
      punts: Number,
      yards: Number,
      average: Number,
      recoveredWithinThe20: Number,
      long: Number
    }
  ],
  scores: [
    {
      type: String,
      description: String,
      quarter: Number,
      yards: Number,
      teamAbbr: String
    }
  ],
  drives: [
    {
      possessingTeamAbbr: String,
      quarter: Number,
      redzone: Boolean,
      firstDowns: Number,
      result: String,
      penaltyYards: Number,
      yardsGained: Number,
      numberOfPlays: Number,
      possessionTime: String,
      start: {
        quarter: Number,
        time: String,
        yardline: String,
        teamAbbr: String
      },
      end: {
        quarter: Number,
        time: String,
        yardline: String,
        teamAbbr: String
      },
      plays: [
        {
          quarter: Number,
          down: Number,
          time: String,
          yardline: String,
          yardsToGo: Number,
          netYards: Number,
          possessingTeamAbbr: String,
          description: String,
          note: String
        }
      ]
    }
  ]
})

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
    gameType: String,
    weekNameAbbr: String,
    weekName: String,
    yardline: String,
    quarter: String,
    down: Number,
    yardsToGo: Number,
    clock: String,
    possessingTeamAbbr: String,
    redzone: Boolean,
    homeTeam: gameTeamStatsSchema,
    awayTeam: gameTeamStatsSchema
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

module.exports = mongoose.model('Game', gameSchema)
