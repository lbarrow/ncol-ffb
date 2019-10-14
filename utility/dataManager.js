const axios = require('axios')
const mongoose = require('mongoose')
const getCurrentWeek = require('../utility/getCurrentWeek')
const moment = require('moment')
const db = require('../db')

const Game = mongoose.model('Game')
const Player = mongoose.model('Player')
const Statline = mongoose.model('Statline')
const Matchup = mongoose.model('Matchup')

exports.getCurrentGameData = async () => {
  const week = getCurrentWeek.getCurrentWeek()
  const games = await Game.find({
    isoTime: {
      $lt: moment()
        .add(15, 'minutes')
        .toDate(),
      $gt: moment()
        .subtract(6, 'hours')
        .toDate()
    },
    $or: [
      {
        quarter: {
          $ne: 'Final'
        }
      },
      {
        quarter: {
          $ne: 'final overtime'
        }
      }
    ]
  })

  const parsingResult = await parseGames(games, week, week)
  return parsingResult
}

exports.updateFantasyPointsForMatchups = async (startWeek, endWeek) => {
  for (let week = startWeek; week <= endWeek; week++) {
    const matchups = await Matchup.find({ week })
    for (let i = 0; i < matchups.length; i++) {
      const homeResults = await totalPointsForTeamWeek(matchups[i].home, week)
      matchups[i].homeScore = homeResults.score
      matchups[i].homePlayersLeft = homeResults.playersLeft
      matchups[i].homePlayersPlaying = homeResults.playersPlaying
      matchups[i].homePlayersDone = homeResults.playersDone
      const awayResults = await totalPointsForTeamWeek(matchups[i].away, week)
      matchups[i].awayScore = awayResults.score
      matchups[i].awayPlayersLeft = awayResults.playersLeft
      matchups[i].awayPlayersPlaying = awayResults.playersPlaying
      matchups[i].awayPlayersDone = awayResults.playersDone
      await matchups[i].save()
    }
    console.log('completed updating matchups for week ' + week)
  }
}

markBestPlayers = (bestSpots, players) => {
  for (let i = 0; i < players.length; i++) {
    if (i < bestSpots) {
      players[i].best = true
    }
  }
}

totalPointsForTeamWeek = async (fantasyTeamId, week) => {
  let playersLeft = 0
  let playersPlaying = 0
  let playersDone = 0
  const beforeQuery4 = moment()
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
  console.log(
    'grabbing players for team took ' + moment().diff(beforeQuery4) + 'ms'
  ) /// 6431 original result

  // sort the positions in specific order
  const sortOrder = ['QB', 'RB', 'WR', 'TE', 'DST']
  positions = positions.sort(function(a, b) {
    return sortOrder.indexOf(a._id) > sortOrder.indexOf(b._id)
  })

  // move fantasy points to player level
  positions = positions.map(position => {
    position.players.map(player => {
      // setup players fantasy points
      let fantasyPoints = 0.0
      if (player.statline) {
        fantasyPoints = player.statline.fantasyPoints
      }
      player.fantasyPoints = Math.round(fantasyPoints * 100) / 100

      // determine if player yet to play, played or playing now
      // if no game, player on bye
      if (player.game) {
        if (!player.game.quarter) {
          ++playersLeft // if no quarter, game hasn't started
        } else {
          if (
            player.game.quarter === 'Final' ||
            player.game.quarter === 'final overtime'
          ) {
            ++playersDone
          } else {
            ++playersPlaying
          }
        }
      }
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
    score: Math.round(teamTotal * 100) / 100,
    playersLeft,
    playersPlaying,
    playersDone
  }
}

exports.updateStatsForGameFromNFL = async game => {
  // const gameId = game.gameId
  // const teamResponse = await axios.get(
  //   `http://www.nfl.com/liveupdate/game-center/${gameId}/${gameId}_gtd.json`
  // )
  const gameId = '2019090801'
  const teamResponse = await axios.get('http://localhost:4445/game2.json')
  const gameStatsData = teamResponse.data[gameId]

  // update game first
  await db.query(
    `UPDATE game
    SET
      yardline = $1,
      quarter = $2,
      down = $3,
      yardstogo = $4,
      clock = $5,
      possessingteamabbr = $6,
      redzone = $7,
      home_timeouts = $8,
      home_totalfirstdowns = $9,
      home_totalyards = $10,
      home_passingyards = $11,
      home_rushingyards = $12,
      home_penalties = $13,
      home_penaltyyards = $14,
      home_turnovers = $15,
      home_punt = $16,
      home_puntyds = $17,
      home_puntavg = $18,
      home_timeofpossession = $19,
      home_scorequarter1 = $20,
      home_scorequarter2 = $21,
      home_scorequarter3 = $22,
      home_scorequarter4 = $23,
      home_scoreovertime = $24,
      home_scorecurrent = $25,
      away_timeouts = $26,
      away_totalfirstdowns = $27,
      away_totalyards = $28,
      away_passingyards = $29,
      away_rushingyards = $30,
      away_penalties = $31,
      away_penaltyyards = $32,
      away_turnovers = $33,
      away_punt = $34,
      away_puntyds = $35,
      away_puntavg = $36,
      away_timeofpossession = $37,
      away_scorequarter1 = $38,
      away_scorequarter2 = $39,
      away_scorequarter3 = $40,
      away_scorequarter4 = $41,
      away_scoreovertime = $42,
      away_scorecurrent = $43
    WHERE gameid = $44`,
    [
      gameStatsData.yl,
      gameStatsData.qtr,
      gameStatsData.down,
      gameStatsData.togo,
      gameStatsData.clock,
      gameStatsData.posteam,
      gameStatsData.redzone,
      gameStatsData.home.to,
      gameStatsData.home.stats.team.totfd,
      gameStatsData.home.stats.team.totyds,
      gameStatsData.home.stats.team.pyrds,
      gameStatsData.home.stats.team.ryrds,
      gameStatsData.home.stats.team.pen,
      gameStatsData.home.stats.team.penyds,
      gameStatsData.home.stats.team.trnovr,
      gameStatsData.home.stats.team.pt,
      gameStatsData.home.stats.team.ptyds,
      gameStatsData.home.stats.team.ptavg,
      gameStatsData.home.stats.team.top,
      gameStatsData.home.score['1'],
      gameStatsData.home.score['2'],
      gameStatsData.home.score['3'],
      gameStatsData.home.score['4'],
      gameStatsData.home.score['5'],
      gameStatsData.home.score['T'],
      gameStatsData.away.to,
      gameStatsData.away.stats.team.totfd,
      gameStatsData.away.stats.team.totyds,
      gameStatsData.away.stats.team.pyrds,
      gameStatsData.away.stats.team.ryrds,
      gameStatsData.away.stats.team.pen,
      gameStatsData.away.stats.team.penyds,
      gameStatsData.away.stats.team.trnovr,
      gameStatsData.away.stats.team.pt,
      gameStatsData.away.stats.team.ptyds,
      gameStatsData.away.stats.team.ptavg,
      gameStatsData.away.stats.team.top,
      gameStatsData.away.score['1'],
      gameStatsData.away.score['2'],
      gameStatsData.away.score['3'],
      gameStatsData.away.score['4'],
      gameStatsData.away.score['5'],
      gameStatsData.away.score['T'],
      gameId
    ]
  )
}

exports.statlinesFromGame = async game => {
  const homeStatsNode = game.homeTeam
  const awayStatsNode = game.awayTeam
  const week = game.week
  const gameId = game.gameId
  let homeTeamDef = setupTeamDefense(game, 'home')
  let awayTeamDef = setupTeamDefense(game, 'away')
  const cleanedStats = [
    ...cleanupStatType(homeStatsNode.passing, 'passing', week, gameId),
    ...cleanupStatType(awayStatsNode.passing, 'passing', week, gameId),
    ...cleanupStatType(homeStatsNode.rushing, 'rushing', week, gameId),
    ...cleanupStatType(awayStatsNode.rushing, 'rushing', week, gameId),
    ...cleanupStatType(homeStatsNode.fumbles, 'fumbles', week, gameId),
    ...cleanupStatType(awayStatsNode.fumbles, 'fumbles', week, gameId),
    ...cleanupStatType(homeStatsNode.receiving, 'receiving', week, gameId),
    ...cleanupStatType(awayStatsNode.receiving, 'receiving', week, gameId)
  ]

  // combine dupes
  const playerStats = [
    ...cleanedStats
      .reduce(
        (a, b) => a.set(b.gsisId, Object.assign(a.get(b.gsisId) || {}, b)),
        new Map()
      )
      .values(),
    homeTeamDef,
    awayTeamDef
  ]

  // insert or update stats
  var statlinesUpserted = 0
  for (let index = 0; index < playerStats.length; index++) {
    // console.log('find player for id: ' + playerStats[index].gsisId)
    const player = await Player.findOne({ gsisId: playerStats[index].gsisId })
    if (player != undefined) {
      let fantasyPoints = 0.0
      let stats = playerStats[index]
      if (player.position === 'DST') {
        fantasyPoints += stats.sacks
        fantasyPoints += stats.fumbles * 2
        fantasyPoints += stats.ints * 2
        fantasyPoints += stats.safeties * 2
        fantasyPoints += stats.TDs * 6
        if (stats.pointsAllowed == 0) {
          fantasyPoints += 10
        }
        if (stats.pointsAllowed > 0 && stats.pointsAllowed <= 6) {
          fantasyPoints += 7
        }
        if (stats.pointsAllowed > 6 && stats.pointsAllowed <= 20) {
          fantasyPoints += 4
        }
        if (stats.pointsAllowed > 20 && stats.pointsAllowed <= 29) {
          fantasyPoints += 1
        }
        if (stats.pointsAllowed > 29) {
          fantasyPoints -= 3
        }
      } else {
        if (stats.passingAttempts) {
          fantasyPoints += stats.passingYards / 25
          fantasyPoints += stats.passingInts * -2
          fantasyPoints += stats.passingTDs * 6
          fantasyPoints += stats.passingTwoPts * 2
          if (stats.passingYards >= 300) {
            fantasyPoints += 1
          }
          if (stats.passingYards >= 400) {
            fantasyPoints += 2
          }
          if (stats.passingYards >= 500) {
            fantasyPoints += 3
          }
        }
        if (stats.rushingAttempts) {
          fantasyPoints += stats.rushingYards / 10
          fantasyPoints += stats.rushingTDs * 6
          fantasyPoints += stats.rushingTwoPts * 2
          if (stats.rushingYards >= 100) {
            fantasyPoints += 2
          }
          if (stats.rushingYards >= 150) {
            fantasyPoints += 3
          }
          if (stats.rushingYards >= 200) {
            fantasyPoints += 4
          }
        }
        if (stats.receivingReceptions) {
          fantasyPoints += stats.receivingReceptions
          fantasyPoints += stats.receivingYards / 10
          fantasyPoints += stats.receivingTDs * 6
          fantasyPoints += stats.receivingTwoPts * 2
          if (stats.receivingYards >= 100) {
            fantasyPoints += 2
          }
          if (stats.receivingYards >= 150) {
            fantasyPoints += 3
          }
          if (stats.receivingYards >= 200) {
            fantasyPoints += 4
          }
        }
        if (stats.fumbles) {
          fantasyPoints += stats.fumbles * -2
        }
      }
      stats.fantasyPoints = Math.round(fantasyPoints * 100) / 100

      // console.log('run update for: ' + player.displayName)
      await Statline.findOneAndUpdate(
        {
          week: playerStats[index].week,
          player: player._id
        },
        stats,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      ++statlinesUpserted
    }
  }

  return statlinesUpserted
}

setupTeamDefense = (game, thisSideString) => {
  const otherSideString = thisSideString === 'home' ? 'away' : 'home'
  const scoreSummaries = game.scoreSummaries
  const thisSideTeam = game[thisSideString + 'Team']
  const otherSideTeam = game[otherSideString + 'Team']

  // look through defensive players to figure out total sacks and interceptions
  let sacksFloat = 0.0
  let ints = 0
  for (let i = 0; i < thisSideTeam.defense.length; i++) {
    const player = thisSideTeam.defense[i]
    sacksFloat += player.sacks
    ints += player.interceptions
  }
  const sacks = Math.round(sacksFloat) // sacks can be split between players

  // look through fumble node to figure out which ones were lost by the other team
  let fumbles = 0
  if (otherSideTeam.fumbles) {
    const fumbleList = otherSideTeam.fumbles
    for (let i = 0; i < fumbleList.length; i++) {
      const player = fumbleList[i]
      fumbles += player.lost
    }
  }

  let safeties = 0
  for (let i = 0; i < scoreSummaries.length; i++) {
    const scoreSummary = scoreSummaries[i]
    // make sure it's a TD and it's our team
    if (
      scoreSummary.scoringType === 'SAF' &&
      scoreSummary.teamAbbr === thisSideTeam.teamAbbr
    ) {
      safeties += 1
    }
  }

  // total up return and defensive TDs
  let TDs = 0
  for (let i = 0; i < thisSideTeam.puntReturning.length; i++) {
    TDs += thisSideTeam.puntReturning[i].touchdowns
  }
  for (let i = 0; i < thisSideTeam.kickReturning.length; i++) {
    TDs += thisSideTeam.kickReturning[i].touchdowns
  }
  for (let i = 0; i < scoreSummaries.length; i++) {
    const scoreSummary = scoreSummaries[i]
    // make sure it's a TD and it's our team
    if (
      scoreSummary.scoringType === 'TD' &&
      scoreSummary.teamAbbr === thisSideTeam.teamAbbr
    ) {
      // see if it was an interception or fumble return
      if (
        scoreSummary.description.includes('blocked') ||
        scoreSummary.description.includes('interception return') ||
        scoreSummary.description.includes('fumble return')
      ) {
        TDs += 1
      }
    }
  }

  let pointsAllowed = otherSideTeam.score.current

  return {
    id: 'DST_' + thisSideTeam.teamAbbr,
    gsisId: 'DST_' + thisSideTeam.teamAbbr,
    position: 'DST',
    week: game.week,
    gameId: game.gameId,
    name: 'DST_' + thisSideTeam.teamAbbr,
    sacks,
    ints,
    safeties,
    fumbles,
    TDs,
    pointsAllowed
  }
}

cleanupStatType = (positionNode, statType, week, gameId) => {
  let players = []

  for (let i = 0; i < positionNode.length; i++) {
    const playerStats = positionNode[i]
    let player = {
      gameId,
      gsisId: positionNode[i].gsisId,
      name: positionNode[i].nameAbbr,
      week
    }
    if (statType == 'passing') {
      player.passingYards = playerStats.yards
      player.passingAttempts = playerStats.attempts
      player.passingCompletions = playerStats.completions
      player.passingInts = playerStats.interceptions
      player.passingTDs = playerStats.touchdowns
      player.passingTwoPts = playerStats.twoPointsMade
    }
    if (statType == 'rushing') {
      player.rushingAttempts = playerStats.attempts
      player.rushingYards = playerStats.yards
      player.rushingTDs = playerStats.touchdowns
      player.rushingTwoPts = playerStats.twoPointsMade
    }
    if (statType == 'receiving') {
      player.receivingReceptions = playerStats.receptions
      player.receivingYards = playerStats.yards
      player.receivingTDs = playerStats.touchdowns
      player.receivingTwoPts = playerStats.twoPointsMade
    }
    if (statType == 'fumbles') {
      player.fumbles = playerStats.lost
    }
    players.push(player)
  }
  return players
}
