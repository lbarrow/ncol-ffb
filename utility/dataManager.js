const axios = require('axios')
const mongoose = require('mongoose')
const getCurrentWeek = require('../utility/getCurrentWeek')
const moment = require('moment')

const Game = mongoose.model('Game')
const Player = mongoose.model('Player')
const Statline = mongoose.model('Statline')
const Matchup = mongoose.model('Matchup')

exports.getCurrentGameData = async () => {
  console.log('getCurrentGameData called')
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

  const parsingResult = await exports.parseGames(games, week, week)
  return parsingResult
}

exports.parseGames = async (games, startWeek, endWeek) => {
  const gamesCount = games.length

  // parse them all
  let statlinesCount = 0
  for (let i = 0; i < games.length; i++) {
    const beforeQuery1 = moment()
    await updateStatsForGameFromNFL(games[i])
    // console.log(
    //   `done: updateStatesForGameFromNFL ${games[i].awayTeam.teamAbbr} @ ${games[i].homeTeam.teamAbbr}`
    // )
    console.log(
      'updating games with json results took ' +
        moment().diff(beforeQuery1) +
        'ms'
    ) /// 6431 original result

    const beforeQuery2 = moment()
    const statlinesParsed = await statlinesFromGame(games[i])
    statlinesCount += statlinesParsed
    console.log(
      statlinesParsed +
        ' statlines by statlinesFromGame took ' +
        moment().diff(beforeQuery2) +
        'ms'
    ) /// 6431 original result
    // console.log(`${statlinesParsed} statlines for ${games[i].awayTeam.teamAbbr} @ ${games[i].homeTeam.teamAbbr} parsed`)
  }

  // update fantasy point totals in matchup collection
  const beforeQuery3 = moment()
  await exports.updateFantasyPointsForMatchups(startWeek, endWeek)
  console.log(
    'updateFantasyPointsForMatchups took ' + moment().diff(beforeQuery3) + 'ms'
  ) /// 6431 original result

  return {
    statlinesCount,
    gamesCount
  }
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

updateStatsForGameFromNFL = async game => {
  const gameId = game.gameId
  const teamResponse = await axios.get(
    `http://www.nfl.com/liveupdate/game-center/${gameId}/${gameId}_gtd.json`
  )
  // const gameId = '2019090801'
  // const teamResponse = await axios.get('http://localhost:4444/game2.json')
  const gameStatsData = teamResponse.data[gameId]

  // update game first
  game.yardline = gameStatsData.yl
  game.quarter = gameStatsData.qtr
  game.down = gameStatsData.down
  game.yardsToGo = gameStatsData.togo
  game.clock = gameStatsData.clock
  game.possessingTeamAbbr = gameStatsData.posteam
  game.redzone = gameStatsData.redzone
  game.homeTeam.timeouts = gameStatsData.home.to
  game.homeTeam.score.quarter1 = gameStatsData.home.score['1']
  game.homeTeam.score.quarter2 = gameStatsData.home.score['2']
  game.homeTeam.score.quarter3 = gameStatsData.home.score['3']
  game.homeTeam.score.quarter4 = gameStatsData.home.score['4']
  game.homeTeam.score.overtime = gameStatsData.home.score['5']
  game.homeTeam.score.current = gameStatsData.home.score['T']
  game.homeTeam.totalFirstDowns = gameStatsData.home.stats.team.totfd
  game.homeTeam.totalYards = gameStatsData.home.stats.team.totyds
  game.homeTeam.passingYards = gameStatsData.home.stats.team.pyrds
  game.homeTeam.receivingYards = gameStatsData.home.stats.team.ryrds
  game.homeTeam.penalties = gameStatsData.home.stats.team.pen
  game.homeTeam.penaltyYards = gameStatsData.home.stats.team.penyds
  game.homeTeam.turnovers = gameStatsData.home.stats.team.trnovr
  game.homeTeam.punt = gameStatsData.home.stats.team.pt
  game.homeTeam.puntyds = gameStatsData.home.stats.team.ptyds
  game.homeTeam.puntavg = gameStatsData.home.stats.team.ptavg
  game.homeTeam.timeOfPossession = gameStatsData.home.stats.team.top
  game.awayTeam.timeouts = gameStatsData.away.to
  game.awayTeam.score.quarter1 = gameStatsData.away.score['1']
  game.awayTeam.score.quarter2 = gameStatsData.away.score['2']
  game.awayTeam.score.quarter3 = gameStatsData.away.score['3']
  game.awayTeam.score.quarter4 = gameStatsData.away.score['4']
  game.awayTeam.score.overtime = gameStatsData.away.score['5']
  game.awayTeam.score.current = gameStatsData.away.score['T']
  game.awayTeam.totalFirstDowns = gameStatsData.away.stats.team.totfd
  game.awayTeam.totalYards = gameStatsData.away.stats.team.totyds
  game.awayTeam.passingYards = gameStatsData.away.stats.team.pyrds
  game.awayTeam.receivingYards = gameStatsData.away.stats.team.ryrds
  game.awayTeam.penalties = gameStatsData.away.stats.team.pen
  game.awayTeam.penaltyYards = gameStatsData.away.stats.team.penyds
  game.awayTeam.turnovers = gameStatsData.away.stats.team.trnovr
  game.awayTeam.punt = gameStatsData.away.stats.team.pt
  game.awayTeam.puntyds = gameStatsData.away.stats.team.ptyds
  game.awayTeam.puntavg = gameStatsData.away.stats.team.ptavg
  game.awayTeam.timeOfPossession = gameStatsData.away.stats.team.top

  const teamTypes = ['home', 'away']
  for (let i = 0; i < teamTypes.length; i++) {
    const passingPlayers = gameStatsData[teamTypes[i]].stats.passing
    if (passingPlayers) {
      game[teamTypes[i] + 'Team'].passing = []
      for (const gsisId in passingPlayers) {
        if (passingPlayers.hasOwnProperty(gsisId)) {
          let player = passingPlayers[gsisId]
          game[teamTypes[i] + 'Team'].passing.push({
            gsisId,
            nameAbbr: player.name,
            attempts: player.att,
            completions: player.cmp,
            yards: player.yds,
            touchdowns: player.tds,
            interceptions: player.ints,
            twoPointsAttempted: player.twopta,
            twoPointsMade: player.twoptm
          })
        }
      }
    }
    const rushingPlayers = gameStatsData[teamTypes[i]].stats.rushing
    if (rushingPlayers) {
      game[teamTypes[i] + 'Team'].rushing = []
      for (const gsisId in rushingPlayers) {
        if (rushingPlayers.hasOwnProperty(gsisId)) {
          let player = rushingPlayers[gsisId]
          game[teamTypes[i] + 'Team'].rushing.push({
            gsisId,
            nameAbbr: player.name,
            attempts: player.att,
            yards: player.yds,
            touchdowns: player.tds,
            long: player.lng,
            longTouchdown: player.lngtd,
            twoPointsAttempted: player.twopta,
            twoPointsMade: player.twoptm
          })
        }
      }
    }
    const receivingPlayers = gameStatsData[teamTypes[i]].stats.receiving
    if (receivingPlayers) {
      game[teamTypes[i] + 'Team'].receiving = []
      for (const gsisId in receivingPlayers) {
        if (receivingPlayers.hasOwnProperty(gsisId)) {
          let player = receivingPlayers[gsisId]
          game[teamTypes[i] + 'Team'].receiving.push({
            gsisId,
            nameAbbr: player.name,
            receptions: player.rec,
            yards: player.yds,
            touchdowns: player.tds,
            long: player.lng,
            longTouchdown: player.lngtd,
            twoPointsAttempted: player.twopta,
            twoPointsMade: player.twoptm
          })
        }
      }
    }
    const fumblesPlayers = gameStatsData[teamTypes[i]].stats.fumbles
    if (fumblesPlayers) {
      game[teamTypes[i] + 'Team'].fumbles = []
      for (const gsisId in fumblesPlayers) {
        if (fumblesPlayers.hasOwnProperty(gsisId)) {
          let player = fumblesPlayers[gsisId]
          game[teamTypes[i] + 'Team'].fumbles.push({
            gsisId,
            nameAbbr: player.name,
            total: player.tot,
            recovered: player.rcv,
            teamRecovered: player.trcv,
            yards: player.yds,
            lost: player.lost
          })
        }
      }
    }
    const kickingPlayers = gameStatsData[teamTypes[i]].stats.kicking
    if (kickingPlayers) {
      game[teamTypes[i] + 'Team'].kicking = []
      for (const gsisId in kickingPlayers) {
        if (kickingPlayers.hasOwnProperty(gsisId)) {
          let player = kickingPlayers[gsisId]
          game[teamTypes[i] + 'Team'].kicking.push({
            gsisId,
            nameAbbr: player.name,
            fieldGoalsAttempted: player.fgm,
            fieldGoalsMade: player.fga,
            fieldGoalYards: player.fgyds,
            totalPointsFromFieldGoals: player.totpfg,
            extraPointsAttempted: player.xpmade,
            extraPointsMade: player.xpmissed,
            extraPointsMissed: player.xpa,
            extraPointsBlocked: player.xpb,
            extraPointsTotal: player.xptot
          })
        }
      }
    }
    const puntingPlayers = gameStatsData[teamTypes[i]].stats.punting
    if (puntingPlayers) {
      game[teamTypes[i] + 'Team'].punting = []
      for (const gsisId in puntingPlayers) {
        if (puntingPlayers.hasOwnProperty(gsisId)) {
          let player = puntingPlayers[gsisId]
          game[teamTypes[i] + 'Team'].punting.push({
            gsisId,
            nameAbbr: player.name,
            punts: player.pts,
            yards: player.yds,
            average: player.avg,
            recoveredWithinThe20: player.i20,
            long: player.lng
          })
        }
      }
    }
    const kickReturningPlayers = gameStatsData[teamTypes[i]].stats.kickret
    if (kickReturningPlayers) {
      game[teamTypes[i] + 'Team'].kickReturning = []
      for (const gsisId in kickReturningPlayers) {
        if (kickReturningPlayers.hasOwnProperty(gsisId)) {
          let player = kickReturningPlayers[gsisId]
          game[teamTypes[i] + 'Team'].kickReturning.push({
            gsisId,
            nameAbbr: player.name,
            returns: player.ret,
            average: player.avg,
            touchdowns: player.tds,
            long: player.lng,
            longTouchdown: player.lngtd
          })
        }
      }
    }
    const puntReturningPlayers = gameStatsData[teamTypes[i]].stats.puntret
    if (puntReturningPlayers) {
      game[teamTypes[i] + 'Team'].puntReturning = []
      for (const gsisId in puntReturningPlayers) {
        if (puntReturningPlayers.hasOwnProperty(gsisId)) {
          let player = puntReturningPlayers[gsisId]
          game[teamTypes[i] + 'Team'].puntReturning.push({
            gsisId,
            nameAbbr: player.name,
            returns: player.ret,
            average: player.avg,
            touchdowns: player.tds,
            long: player.lng,
            longTouchdown: player.lngtd
          })
        }
      }
    }
    const defensePlayers = gameStatsData[teamTypes[i]].stats.defense
    if (defensePlayers) {
      game[teamTypes[i] + 'Team'].defense = []
      for (const gsisId in defensePlayers) {
        if (defensePlayers.hasOwnProperty(gsisId)) {
          let player = defensePlayers[gsisId]
          game[teamTypes[i] + 'Team'].defense.push({
            gsisId,
            nameAbbr: player.name,
            tackles: player.tkl,
            assists: player.ast,
            sacks: player.sk,
            interceptions: player.int,
            forcedFumbles: player.ffum
          })
        }
      }
    }
  }

  const scoringSummaries = gameStatsData.scrsummary
  if (scoringSummaries) {
    game.scoreSummaries = []
    for (const scoringId in scoringSummaries) {
      if (scoringSummaries.hasOwnProperty(scoringId)) {
        let scoringSummary = scoringSummaries[scoringId]
        game.scoreSummaries.push({
          scoringType: scoringSummary.type,
          description: scoringSummary.desc,
          quarter: scoringSummary.qtr,
          teamAbbr: scoringSummary.team
        })
      }
    }
  }

  // const driveSummaries = gameStatsData.drives
  // if (driveSummaries) {
  //   game.drives = []
  //   for (const driveId in driveSummaries) {
  //     if (driveId !== 'crntdrv') {
  //       if (driveSummaries.hasOwnProperty(driveId)) {
  //         let driveSummary = driveSummaries[driveId]
  //         let plays = []
  //         const playList = driveSummary.plays
  //         for (const playId in playList) {
  //           if (playList.hasOwnProperty(playId)) {
  //             let play = playList[playId]
  //             plays.push({
  //               quarter: play.qtr,
  //               down: play.down,
  //               time: play.time,
  //               yardline: play.yrdln,
  //               yardsToGo: play.ydstogo,
  //               netYards: play.ydsnet,
  //               possessingTeamAbbr: play.posteam,
  //               description: play.desc,
  //               note: play.note
  //             })
  //           }
  //         }

  //         game.drives.push({
  //           possessingTeamAbbr: driveSummary.posteam,
  //           quarter: driveSummary.qtr,
  //           redzone: driveSummary.redzone,
  //           firstDowns: driveSummary.fds,
  //           result: driveSummary.result,
  //           penaltyYards: driveSummary.penyds,
  //           yardsGained: driveSummary.ydsgained,
  //           numberOfPlays: driveSummary.numplays,
  //           possessionTime: driveSummary.postime,
  //           start: {
  //             quarter: driveSummary.start.qtr,
  //             time: driveSummary.start.time,
  //             yardline: driveSummary.start.yrdln,
  //             teamAbbr: driveSummary.start.team
  //           },
  //           end: {
  //             quarter: driveSummary.end.qtr,
  //             time: driveSummary.end.time,
  //             yardline: driveSummary.end.yrdln,
  //             teamAbbr: driveSummary.end.team
  //           },
  //           plays
  //         })
  //       }
  //     }
  //   }
  // }
  game.save()
}

statlinesFromGame = async game => {
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
    const player = await Player.findOne({ gsisId: playerStats[index].gsisId })
    if (player != undefined) {
      let fantasyPoints = 0.0
      let stats = playerStats[index]
      if (stats.hasOwnProperty('pointsAllowed')) {
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
      stats.player = player._id
      stats.fantasyPoints = Math.round(fantasyPoints * 100) / 100
      await Statline.findOneAndUpdate(
        {
          gsisId: playerStats[index].gsisId,
          week: playerStats[index].week,
          player: player._id,
          position: player.position
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
