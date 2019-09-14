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
  // const games = await Game.find().sort({ gameId: 'asc' })
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

  const homeTeam = await calculateFantasyPoints(matchup.week, matchup.home)
  const awayTeam = await calculateFantasyPoints(matchup.week, matchup.away)

  const teams = [
    {
      ownerId: matchup.home,
      ...homeTeam
    },
    {
      ownerId: matchup.away,
      ...awayTeam
    }
  ]

  res.render('matchup', { matchup, teams })
}

exports.fantasyTeam = async (req, res) => {
  const week = parseInt(req.params.week)
  const fantasyTeamId = req.params.id

  const positionsAndPoints = await calculateFantasyPoints(week, fantasyTeamId)
  res.render('fantasyTeam', { ...positionsAndPoints, week, fantasyTeamId })
}

calculateFantasyPoints = async (week, fantasyTeamId) => {
  let positions = await Statline.aggregate([
    { $match: { position: { $in: ['QB', 'RB', 'TE', 'WR', 'DST'] }, week } },
    {
      $lookup: {
        from: 'players',
        localField: 'player',
        foreignField: '_id',
        as: 'player'
      }
    },
    { $unwind: '$player' },
    { $match: { 'player.fantasyOwner': fantasyTeamId } },
    {
      $group: {
        _id: '$position',
        players: {
          $push: {
            name: '$name',
            player: '$player',
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
            receivingYards: '$receivingYards',
            fumbles: '$fumbles',
            sacks: '$sacks',
            ints: '$ints',
            safeties: '$safeties',
            TDs: '$TDs',
            pointsAllowed: '$pointsAllowed'
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
      if (player.player.position === 'DST') {
        fantasyPoints += player.sacks
        fantasyPoints += player.fumbles * 2
        fantasyPoints += player.ints * 2
        fantasyPoints += player.safeties * 2
        fantasyPoints += player.TDs * 6
        if (player.pointsAllowed == 0) {
          fantasyPoints += 10
        }
        if (player.pointsAllowed > 0 && player.pointsAllowed <= 6) {
          fantasyPoints += 7
        }
        if (player.pointsAllowed > 6 && player.pointsAllowed <= 20) {
          fantasyPoints += 4
        }
        if (player.pointsAllowed > 20 && player.pointsAllowed <= 29) {
          fantasyPoints += 1
        }
        if (player.pointsAllowed > 29) {
          fantasyPoints -= 3
        }
      } else {
        if (player.passingAttempts) {
          fantasyPoints += player.passingYards / 25
          fantasyPoints += player.passingInts * -2
          fantasyPoints += player.passingTDs * 6
          fantasyPoints += player.passingTwoPts * 2
          if (player.passingYards > 300) {
            fantasyPoints += 1
          }
          if (player.passingYards > 400) {
            fantasyPoints += 2
          }
          if (player.passingYards > 500) {
            fantasyPoints += 3
          }
        }
        if (player.rushingAttempts) {
          fantasyPoints += player.rushingYards / 10
          fantasyPoints += player.rushingTDs * 6
          fantasyPoints += player.rushingTwoPts * 2
          if (player.rushingYards > 100) {
            fantasyPoints += 2
          }
          if (player.rushingYards > 150) {
            fantasyPoints += 3
          }
          if (player.rushingYards > 200) {
            fantasyPoints += 4
          }
        }
        if (player.receivingReceptions) {
          fantasyPoints += player.receivingReceptions
          fantasyPoints += player.receivingYards / 10
          fantasyPoints += player.receivingTDs * 6
          fantasyPoints += player.receivingTwoPts * 2
          if (player.receivingYards > 100) {
            fantasyPoints += 2
          }
          if (player.receivingYards > 150) {
            fantasyPoints += 3
          }
          if (player.receivingYards > 200) {
            fantasyPoints += 4
          }
        }
        if (player.fumbles) {
          fantasyPoints += player.fumbles * -2
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
