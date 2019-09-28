const mongoose = require('mongoose')
const getCurrentWeek = require('../utility/getCurrentWeek')
const Team = mongoose.model('Team')
const Player = mongoose.model('Player')
const Game = mongoose.model('Game')
const Statline = mongoose.model('Statline')
const Matchup = mongoose.model('Matchup')

exports.index = async (req, res) => {
  const week = getCurrentWeek.getCurrentWeek()
  const matchups = await Matchup.find({ week: { $lte: week } })
  res.render('index', { week, matchups })
}

exports.nflSchedule = async (req, res) => {
  const weeks = await Game.aggregate([
    {
      $group: {
        _id: '$week',
        games: {
          $push: {
            week: '$week',
            home: '$home',
            gameId: '$gameId',
            visitorDisplayName: '$visitorDisplayName',
            homeDisplayName: '$homeDisplayName',
            gameDate: '$gameDate',
            isoTime: '$isoTime'
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ])

  res.render('nflSchedule', { weeks })
}

exports.stats = async (req, res) => {
  let positions = await Statline.aggregate([
    { $match: { position: { $in: ['QB', 'RB', 'TE', 'WR'] } } },
    {
      $lookup: {
        from: 'players',
        localField: 'player',
        foreignField: '_id',
        as: 'player'
      }
    },
    {
      $group: {
        _id: '$position',
        players: {
          $push: {
            name: '$name',
            player: { $arrayElemAt: ['$player', 0] },
            passingAttempts: '$passingAttempts',
            passingCompletions: '$passingCompletions',
            passingInts: '$passingInts',
            passingTDs: '$passingTDs',
            passingTwoPts: '$passingTwoPts',
            passingYards: '$passingYards',
            rushingAttempts: '$rushingAttempts',
            rushingTDs: '$rushingTDs',
            rushingTwoPts: '$rushingTwoPts',
            rushingYards: '$rushingYards',
            receivingReceptions: '$receivingReceptions',
            receivingTDs: '$receivingTDs',
            receivingTwoPts: '$receivingTwoPts',
            receivingYards: '$receivingYards'
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ])

  res.render('stats', { positions })
}

exports.teams = async (req, res) => {
  const teams = await Team.find().sort({ fullName: 'asc' })
  res.render('teams', { teams })
}

exports.teamDetail = async (req, res) => {
  const team = await Team.findOne({ abbr: req.params.abbr })
  if (!team) return next()
  const roster = await Player.find({
    teamId: team.teamId,
    positionGroup: { $in: ['WR', 'TE', 'QB', 'RB'] }
  }).sort({
    positionGroup: -1
  })
  res.render('team', { team, roster })
}

exports.playerDetail = async (req, res) => {
  const player = await Player.findOne({ nflId: req.params.id })
  if (!player) return next()
  res.render('player', { player })
}

exports.matchup = async (req, res) => {
  const matchupId = req.params.id
  const matchup = await Matchup.findById(matchupId)

  const homeStatlines = await calculateFantasyPoints(matchup.week, matchup.home)
  const awayStatlines = await calculateFantasyPoints(matchup.week, matchup.away)

  const teams = [
    {
      ownerId: matchup.home,
      ...homeStatlines
    },
    {
      ownerId: matchup.away,
      ...awayStatlines
    }
  ]

  // res.header('Content-Type', 'application/json')
  // res.send(JSON.stringify(teams, null, 4))
  res.render('matchup', { matchup, teams })
}

exports.fantasyTeam = async (req, res) => {
  const week = parseInt(req.params.week)
  const fantasyTeamId = req.params.id

  const positionsAndPoints = await calculateFantasyPoints(week, fantasyTeamId)
  res.render('fantasyTeam', { ...positionsAndPoints, week, fantasyTeamId })
}

const calculateFantasyPoints = async (week, fantasyTeamId) => {
  let positions = await Player.aggregate([
    {
      $match: {
        position: { $in: ['QB', 'RB', 'TE', 'WR', 'DST'] },
        fantasyOwner: fantasyTeamId
      }
    },
    {
      $lookup: {
        from: 'statlines',
        let: { id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$player', '$$id'] },
              week: week
            }
          },
          {
            $lookup: {
              from: 'games',
              let: { gameId: '$gameId' },
              pipeline: [
                { $match: { $expr: { $eq: ['$gameId', '$$gameId'] } } }
              ],
              as: 'game'
            }
          },
          { $unwind: '$game' }
        ],
        as: 'statline'
      }
    },
    { $unwind: '$statline' },
    {
      $group: {
        _id: '$position',
        players: {
          $push: {
            name: '$name',
            statline: '$statline',
            game: '$game',
            displayName: '$displayName',
            firstName: '$firstName',
            lastName: '$lastName',
            esbId: '$esbId',
            gsisId: '$gsisId',
            positionGroup: '$positionGroup',
            position: '$position',
            teamAbbr: '$teamAbbr',
            teamId: '$teamId',
            teamFullName: '$teamFullName',
            fantasyOwner: '$fantasyOwner'
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ])

  // set fantasy points for each player
  positions = positions.map(position => {
    position.players.map(player => {
      let fantasyPoints = 0.0
      if (player.statline) {
        const statline = player.statline
        if (player.position === 'DST') {
          fantasyPoints += statline.sacks
          fantasyPoints += statline.fumbles * 2
          fantasyPoints += statline.ints * 2
          fantasyPoints += statline.safeties * 2
          fantasyPoints += statline.TDs * 6
          if (statline.pointsAllowed == 0) {
            fantasyPoints += 10
          }
          if (statline.pointsAllowed > 0 && statline.pointsAllowed <= 6) {
            fantasyPoints += 7
          }
          if (statline.pointsAllowed > 6 && statline.pointsAllowed <= 20) {
            fantasyPoints += 4
          }
          if (statline.pointsAllowed > 20 && statline.pointsAllowed <= 29) {
            fantasyPoints += 1
          }
          if (statline.pointsAllowed > 29) {
            fantasyPoints -= 3
          }
        } else {
          if (statline.passingAttempts) {
            fantasyPoints += statline.passingYards / 25
            fantasyPoints += statline.passingInts * -2
            fantasyPoints += statline.passingTDs * 6
            fantasyPoints += statline.passingTwoPts * 2
            if (statline.passingYards > 300) {
              fantasyPoints += 1
            }
            if (statline.passingYards > 400) {
              fantasyPoints += 2
            }
            if (statline.passingYards > 500) {
              fantasyPoints += 3
            }
          }
          if (statline.rushingAttempts) {
            fantasyPoints += statline.rushingYards / 10
            fantasyPoints += statline.rushingTDs * 6
            fantasyPoints += statline.rushingTwoPts * 2
            if (statline.rushingYards > 100) {
              fantasyPoints += 2
            }
            if (statline.rushingYards > 150) {
              fantasyPoints += 3
            }
            if (statline.rushingYards > 200) {
              fantasyPoints += 4
            }
          }
          if (statline.receivingReceptions) {
            fantasyPoints += statline.receivingReceptions
            fantasyPoints += statline.receivingYards / 10
            fantasyPoints += statline.receivingTDs * 6
            fantasyPoints += statline.receivingTwoPts * 2
            if (statline.receivingYards > 100) {
              fantasyPoints += 2
            }
            if (statline.receivingYards > 150) {
              fantasyPoints += 3
            }
            if (statline.receivingYards > 200) {
              fantasyPoints += 4
            }
          }
          if (statline.fumbles) {
            fantasyPoints += statline.fumbles * -2
          }
        }
      }
      player.fantasyPoints = Math.round(fantasyPoints * 100) / 100
      return player
    })

    return position
  })

  // mark best x positions
  positions = positions.map(position => {
    position.players.sort(function(a, b) {
      return b.fantasyPoints - a.fantasyPoints
    })

    let bestSpots
    if (position._id === 'QB') {
      bestSpots = 2
    }
    if (position._id === 'RB') {
      bestSpots = 4
    }
    if (position._id === 'WR') {
      bestSpots = 6
    }
    if (position._id === 'TE') {
      bestSpots = 2
    }
    if (position._id === 'DST') {
      bestSpots = 2
    }
    markBestPlayers(bestSpots, position.players)

    return position
  })

  // figure out total points
  let teamTotal = 0.0
  for (let i = 0; i < positions.length; i++) {
    for (let j = 0; j < positions[i].players.length; j++) {
      if (positions[i].players[j].best) {
        teamTotal += positions[i].players[j].fantasyPoints
      }
    }
  }
  teamTotal = Math.round(teamTotal * 100) / 100

  return {
    positions,
    teamTotal
  }
}

function markBestPlayers(bestSpots, players) {
  for (let i = 0; i < players.length; i++) {
    if (i < bestSpots) {
      players[i].best = true
    }
  }
}
