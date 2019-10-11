const mongoose = require('mongoose')
const getCurrentWeek = require('../utility/getCurrentWeek')
const Player = mongoose.model('Player')
const Game = mongoose.model('Game')
const Statline = mongoose.model('Statline')
const Matchup = mongoose.model('Matchup')
const Owner = mongoose.model('Owner')

exports.index = async (req, res) => {
  const week = getCurrentWeek.getCurrentWeek()
  const matchups = await Matchup.aggregate([
    {
      $match: { week }
    },
    {
      $lookup: {
        from: 'owners',
        localField: 'home',
        foreignField: 'ownerId',
        as: 'homeOwner'
      }
    },
    { $unwind: { path: '$homeOwner' } },
    {
      $lookup: {
        from: 'owners',
        localField: 'away',
        foreignField: 'ownerId',
        as: 'awayOwner'
      }
    },
    { $unwind: { path: '$awayOwner' } }
  ])
  const teams = await Owner.find().sort({ wins: 'desc' })
  const data = {
    teams,
    week,
    matchups
  }
  res.header('Content-Type', 'application/json')
  res.send(JSON.stringify(data, null, 4))
}

exports.standings = async (req, res) => {
  const teams = await Owner.find().sort({ wins: 'desc' })

  res.header('Content-Type', 'application/json')
  res.send(JSON.stringify(teams, null, 4))
}

exports.matchups = async (req, res) => {
  const week = getCurrentWeek.getCurrentWeek()
  const matchups = await Matchup.aggregate([
    {
      $match: { week: { $lte: week } }
    },
    {
      $lookup: {
        from: 'owners',
        localField: 'home',
        foreignField: 'ownerId',
        as: 'homeOwner'
      }
    },
    { $unwind: { path: '$homeOwner' } },
    {
      $lookup: {
        from: 'owners',
        localField: 'away',
        foreignField: 'ownerId',
        as: 'awayOwner'
      }
    },
    { $unwind: { path: '$awayOwner' } },
    {
      $group: {
        _id: '$week',
        matchups: {
          $push: {
            _id: '$_id',
            week: '$week',
            home: '$home',
            homeOwner: '$homeOwner',
            homeScore: '$homeScore',
            away: '$away',
            awayOwner: '$awayOwner',
            awayScore: '$awayScore'
          }
        }
      }
    },
    { $sort: { _id: -1 } }
  ])
  res.header('Content-Type', 'application/json')
  res.send(JSON.stringify(matchups, null, 4))
}

exports.matchupDetail = async (req, res) => {
  const matchupId = req.params.id
  const matchupArray = await Matchup.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(matchupId) }
    },
    {
      $lookup: {
        from: 'owners',
        localField: 'home',
        foreignField: 'ownerId',
        as: 'homeOwner'
      }
    },
    { $unwind: { path: '$homeOwner' } },
    {
      $lookup: {
        from: 'owners',
        localField: 'away',
        foreignField: 'ownerId',
        as: 'awayOwner'
      }
    },
    { $unwind: { path: '$awayOwner' } }
  ])
  const matchup = matchupArray[0]

  // get teams with points setup
  const homeStatlines = await calculateFantasyPoints(matchup.week, matchup.home)
  const awayStatlines = await calculateFantasyPoints(matchup.week, matchup.away)

  // add a field that will let us know if need to add spacers
  // to keep the number of players in a position balanced between the two teams
  const countUpOtherTeamsPlayersPerPosition = (
    positionsToAddCounts,
    positionsToCount
  ) => {
    positionsToAddCounts = positionsToAddCounts.map(position => {
      const positionToCount = positionsToCount.find(p => p._id === position._id)
      position.playerRowsToRender = position.players.length
      if (position.players.length < positionToCount.players.length) {
        position.playerRowsToRender = positionToCount.players.length
      }
      return position
    })
  }
  countUpOtherTeamsPlayersPerPosition(
    homeStatlines.positions,
    awayStatlines.positions
  )
  countUpOtherTeamsPlayersPerPosition(
    awayStatlines.positions,
    homeStatlines.positions
  )

  const data = {
    matchup,
    teams: [
      {
        owner: matchup.homeOwner,
        ...homeStatlines
      },
      {
        owner: matchup.awayOwner,
        ...awayStatlines
      }
    ]
  }

  res.header('Content-Type', 'application/json')
  res.send(JSON.stringify(data, null, 4))
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
          }
        ],
        as: 'statline'
      }
    },
    { $unwind: { path: '$statline', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'games',
        let: { teamId: '$teamId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ['$homeTeam.teamId', '$$teamId'] },
                  { $eq: ['$awayTeam.teamId', '$$teamId'] }
                ]
              },
              week: week
            }
          }
        ],
        as: 'game'
      }
    },
    { $unwind: { path: '$game', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$position',
        players: {
          $push: {
            statline: '$statline',
            game: {
              quarter: '$game.quarter',
              isoTime: '$game.isoTime',
              clock: '$game.clock',
              homeTeam: {
                teamAbbr: '$game.homeTeam.teamAbbr',
                score: {
                  current: '$game.homeTeam.score.current'
                }
              },
              awayTeam: {
                teamAbbr: '$game.awayTeam.teamAbbr',
                score: {
                  current: '$game.awayTeam.score.current'
                }
              }
            },
            firstName: '$firstName',
            lastName: '$lastName',
            teamFullName: '$teamFullName',
            esbId: '$esbId',
            position: '$position',
            teamAbbr: '$teamAbbr'
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ])

  // sort the positions in specific order
  const sortOrder = ['QB', 'RB', 'WR', 'TE', 'DST']
  positions = positions.sort(function(a, b) {
    return sortOrder.indexOf(a._id) > sortOrder.indexOf(b._id)
  })

  // move fantasy points to player level
  positions = positions.map(position => {
    position.players.map(player => {
      let fantasyPoints = 0.0
      if (player.statline) {
        fantasyPoints = player.statline.fantasyPoints
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
    // position.players = position.players.map(player => {
    //   delete player.statline
    //   return player
    // })
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

exports.teamDetail = async (req, res) => {
  const ownerId = req.params.id
  const owner = await Owner.findOne({ ownerId })
  const data = {
    owner
  }
  res.header('Content-Type', 'application/json')
  res.send(JSON.stringify(data, null, 4))
}
