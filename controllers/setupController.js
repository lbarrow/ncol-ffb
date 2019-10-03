const axios = require('axios')
const mongoose = require('mongoose')
const path = require('path')
const moment = require('moment')
const downloadImage = require('../utility/downloadImage')
const getCurrentWeek = require('../utility/getCurrentWeek')
const convertToJSON = require('xml-js')

const Team = mongoose.model('Team')
const Player = mongoose.model('Player')
const Game = mongoose.model('Game')
const Statline = mongoose.model('Statline')
const Matchup = mongoose.model('Matchup')
const Owner = mongoose.model('Owner')

// store all teams in db
exports.parseSchedule = async (req, res) => {
  // const scheduleURL = 'http://www.nfl.com/feeds-rs/schedules/2019'
  const scheduleURL = 'http://localhost:4444/schedule.xml'
  const response = await axios({
    method: 'get',
    url: scheduleURL,
    responseType: 'xml'
  })
  const xml = response.data
  const scheduleJSON = convertToJSON.xml2js(xml, {
    compact: true
  })
  const gamesJSON = scheduleJSON.gameSchedulesFeed.gameSchedules.gameSchedule
  const games = gamesJSON.map(item => {
    return {
      gameId: parseInt(item._attributes.gameId),
      season: parseInt(item._attributes.season),
      seasonType: item._attributes.seasonType,
      week: parseInt(item._attributes.week),
      gameKey: item._attributes.gameKey,
      gameDate: item._attributes.gameDate,
      gameTimeEastern: item._attributes.gameTimeEastern,
      gameTimeLocal: item._attributes.gameTimeLocal,
      isoTime: new Date(item._attributes.isoTime),
      homeTeamId: item._attributes.homeTeamId,
      visitorTeamId: item._attributes.visitorTeamId,
      homeTeamAbbr: item._attributes.homeTeamAbbr,
      visitorTeamAbbr: item._attributes.visitorTeamAbbr,
      homeDisplayName: item._attributes.homeDisplayName,
      visitorDisplayName: item._attributes.visitorDisplayName,
      homeNickname: item._attributes.homeNickname,
      visitorNickname: item._attributes.visitorNickname,
      gameType: item._attributes.gameType,
      weekNameAbbr: item._attributes.weekNameAbbr,
      weekName: item._attributes.weekName
    }
  })

  // only keep regular season games
  const regSeasonGames = games.filter(item => {
    if (item.seasonType === 'REG') {
      return true
    }
    return false
  })

  // insert or update stats
  for (let i = 0; i < regSeasonGames.length; i++) {
    await Game.findOneAndUpdate(
      {
        gameId: regSeasonGames[i].gameId
      },
      regSeasonGames[i],
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  }

  res.json({ regSeasonGames })
}

exports.setupMatchups = async (req, res) => {
  const matchupsJSONURL = 'http://localhost:4444/matchups.json'
  const response = await axios(matchupsJSONURL)

  const matchups = response.data.weeks

  await Matchup.deleteMany({}) // clear out existing matchups
  await Matchup.insertMany(matchups) // insert matchups

  res.send(`${matchups.length} matchups setup`)
}

exports.updateOwnerRecord = async (req, res) => {
  const owners = await Owner.find()
  const week = getCurrentWeek.getCurrentWeek() - 1 // evaluate all matchups before now
  // for each owner
  for (let i = 0; i < owners.length; i++) {
    let wins = 0
    let losses = 0
    const ownerId = owners[i].ownerId
    // find all matchups involving this owner
    const matchups = await Matchup.find({
      $or: [{ home: ownerId }, { away: ownerId }],
      week: {
        $lte: week
      }
    })

    // figure out if won or lost this matchup
    for (let i = 0; i < matchups.length; i++) {
      if (matchups[i].home === ownerId) {
        if (matchups[i].homeScore > matchups[i].awayScore) {
          wins++
        } else {
          losses++
        }
      } else {
        if (matchups[i].awayScore > matchups[i].homeScore) {
          wins++
        } else {
          losses++
        }
      }
    }

    // save wins and losses to db
    owners[i].wins = wins
    owners[i].losses = losses
    await owners[i].save()
  }
  res.send(`${owners.length} owners records set`)
}

exports.parseAllGames = async (req, res) => {
  // get the games from the start of the season until now
  const games = await Game.find({
    isoTime: {
      $gte: moment('2019-09-05T23:10:00.000+00:00').toDate(),
      $lt: moment().toDate()
    }
  })
  const gamesCount = games.length

  // parse them all
  let statlinesCount = 0
  // statlinesCount += await parseGame(games[10])
  for (let i = 0; i < games.length; i++) {
    statlinesCount += await parseGame(games[i])
    console.log(`${games[i].visitorTeamAbbr} @ ${games[i].homeTeamAbbr} parsed`)
  }

  const week = getCurrentWeek.getCurrentWeek()
  for (let i = 1; i <= week; i++) {
    await updateFantasyPointsForMatchups(i)
  }

  res.json({
    statlinesParsed: statlinesCount,
    gamesCount
  })
}

exports.parseThisWeek = async (req, res) => {
  // get the games from the start of the season until now
  const week = getCurrentWeek.getCurrentWeek()
  const games = await Game.find({
    week,
    isoTime: {
      $gte: moment('2019-09-05T23:10:00.000+00:00').toDate(),
      $lt: moment().toDate()
    }
  })
  const gamesCount = games.length
  console.log(`gamesCount to parse`, gamesCount)

  // parse them all
  let statlinesCount = 0
  for (let i = 0; i < games.length; i++) {
    statlinesCount += await parseGame(games[i])
    console.log(`${games[i].visitorTeamAbbr} @ ${games[i].homeTeamAbbr} parsed`)
  }

  await updateFantasyPointsForMatchups(week)

  res.json({
    statlinesParsed: statlinesCount,
    gamesCount
  })
}

updateFantasyPointsForMatchups = async week => {
  const matchups = await Matchup.find({ week })
  for (let i = 0; i < matchups.length; i++) {
    matchups[i].homeScore = await totalPointsForTeamWeek(matchups[i].home, week)
    matchups[i].awayScore = await totalPointsForTeamWeek(matchups[i].away, week)
    await matchups[i].save()
  }
}

function markBestPlayers(bestSpots, players) {
  for (let i = 0; i < players.length; i++) {
    if (i < bestSpots) {
      players[i].best = true
    }
  }
}

totalPointsForTeamWeek = async (fantasyTeamId, week) => {
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
                  { $eq: ['$homeTeamId', '$$teamId'] },
                  { $eq: ['$visitorTeamId', '$$teamId'] }
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
  return Math.round(teamTotal * 100) / 100
}

parseGame = async game => {
  const week = game.week
  const gameId = game.gameId
  const teamResponse = await axios.get(
    `http://www.nfl.com/liveupdate/game-center/${gameId}/${gameId}_gtd.json`
  )
  // const teamResponse = await axios.get('http://localhost:4444/game.json')
  const gameStatsData = teamResponse.data[gameId]

  // update game first
  game.yardline = gameStatsData.yl
  game.quarter = gameStatsData.qtr
  game.down = gameStatsData.down
  game.yardsToGo = gameStatsData.togo
  game.clock = gameStatsData.clock
  game.possessingTeamAbbr = gameStatsData.posteam
  game.redzone = gameStatsData.redzone
  game.homeScore = gameStatsData.home.score.T
  game.visitorScore = gameStatsData.away.score.T
  game.save()

  const teamAbbr = gameStatsData.home.abbr
  const homeStatsNode = gameStatsData.home.stats
  const awayStatsNode = gameStatsData.away.stats
  let homeTeamDef = setupTeamDefense(gameStatsData, 'home', week, gameId)
  let awayTeamDef = setupTeamDefense(gameStatsData, 'away', week, gameId)
  const cleanedStats = [
    ...cleanupStatType(
      homeStatsNode.passing,
      'passing',
      teamAbbr,
      week,
      gameId
    ),
    ...cleanupStatType(
      awayStatsNode.passing,
      'passing',
      teamAbbr,
      week,
      gameId
    ),
    ...cleanupStatType(
      homeStatsNode.rushing,
      'rushing',
      teamAbbr,
      week,
      gameId
    ),
    ...cleanupStatType(
      awayStatsNode.rushing,
      'rushing',
      teamAbbr,
      week,
      gameId
    ),
    ...cleanupStatType(
      homeStatsNode.fumbles,
      'fumbles',
      teamAbbr,
      week,
      gameId
    ),
    ...cleanupStatType(
      awayStatsNode.fumbles,
      'fumbles',
      teamAbbr,
      week,
      gameId
    ),
    ...cleanupStatType(
      homeStatsNode.receiving,
      'receiving',
      teamAbbr,
      week,
      gameId
    ),
    ...cleanupStatType(
      awayStatsNode.receiving,
      'receiving',
      teamAbbr,
      week,
      gameId
    )
  ]

  // combine dupes
  const playerStats = [
    ...cleanedStats
      .reduce(
        (a, b) => a.set(b.id, Object.assign(a.get(b.id) || {}, b)),
        new Map()
      )
      .values(),
    homeTeamDef,
    awayTeamDef
  ]

  // insert or update stats
  for (let index = 0; index < playerStats.length; index++) {
    const player = await Player.findOne({ gsisId: playerStats[index].id })
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

      await Statline.findOneAndUpdate(
        {
          gsisId: playerStats[index].id,
          week: playerStats[index].week,
          player: player._id,
          position: player.position
        },
        stats,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    } else {
      const undefinedPlayer = playerStats[index]
      console.log('PLAYER UNDEFINED', { undefinedPlayer })
    }
  }

  return playerStats.length
}

function setupTeamDefense(gameNode, teamSide, week, gameId) {
  const otherSide = teamSide === 'home' ? 'away' : 'home'
  const scoringNode = gameNode.scrsummary

  // look through defensive players to figure out total sacks and interceptions
  const defensivePlayers = gameNode[teamSide].stats.defense
  let sacksFloat = 0.0
  let ints = 0
  for (const key in defensivePlayers) {
    if (defensivePlayers.hasOwnProperty(key)) {
      let player = defensivePlayers[key]
      sacksFloat += player.sk
      ints += player.int
    }
  }
  const sacks = Math.round(sacksFloat) // sacks can be split between players

  // look through fumble node to figure out which ones were lost by the other team
  let fumbles = 0
  if (gameNode[otherSide].stats.fumbles) {
    const fumbleList = gameNode[otherSide].stats.fumbles
    for (const key in fumbleList) {
      if (fumbleList.hasOwnProperty(key)) {
        fumbles += fumbleList[key].lost
      }
    }
  }

  let safeties = 0
  for (const key in scoringNode) {
    if (scoringNode.hasOwnProperty(key)) {
      // make sure it's a TD and it's our team
      if (
        scoringNode[key].type === 'SAF' &&
        scoringNode[key].team === gameNode[teamSide].abbr
      ) {
        safeties += 1
      }
    }
  }

  // total up return and defensive TDs
  let TDs = 0
  if (gameNode[teamSide].stats.puntret) {
    const puntReturnerList = gameNode[teamSide].stats.puntret
    for (const key in puntReturnerList) {
      if (puntReturnerList.hasOwnProperty(key)) {
        TDs += puntReturnerList[key].tds
      }
    }
  }
  if (gameNode[teamSide].stats.kickret) {
    const kickReturnerList = gameNode[teamSide].stats.kickret
    for (const key in kickReturnerList) {
      if (kickReturnerList.hasOwnProperty(key)) {
        TDs += kickReturnerList[key].tds
      }
    }
  }
  for (const key in scoringNode) {
    if (scoringNode.hasOwnProperty(key)) {
      // make sure it's a TD and it's our team
      if (
        scoringNode[key].type === 'TD' &&
        scoringNode[key].team === gameNode[teamSide].abbr
      ) {
        // see if it was an interception or fumble return
        if (
          scoringNode[key].desc.includes('interception return') ||
          scoringNode[key].desc.includes('fumble return')
        ) {
          TDs += 1
        }
      }
    }
  }

  let pointsAllowed = gameNode[otherSide].score.T

  return {
    id: 'DST_' + gameNode[teamSide].abbr,
    gsisId: 'DST_' + gameNode[teamSide].abbr,
    position: 'DST',
    week,
    gameId,
    name: 'DST_' + gameNode[teamSide].abbr,
    sacks,
    ints,
    safeties,
    fumbles,
    TDs,
    pointsAllowed
  }
}

function cleanupStatType(positionNode, statType, teamAbbr, week, gameID) {
  let players = []
  for (const key in positionNode) {
    if (positionNode.hasOwnProperty(key)) {
      let player = positionNode[key]
      player.id = key
      player.gameId = gameID
      player.teamAbbr = teamAbbr
      player.week = week
      if (statType == 'passing') {
        player.passingYards = player.yds
        delete player.yds
        player.passingAttempts = player.att
        delete player.att
        player.passingCompletions = player.cmp
        delete player.cmp
        player.passingInts = player.ints
        delete player.ints
        player.passingTDs = player.tds
        delete player.tds
        player.passingTwoPts = player.twoptm
        delete player.twoptm
      }
      if (statType == 'rushing') {
        player.rushingAttempts = player.att
        delete player.att
        player.rushingYards = player.yds
        delete player.yds
        player.rushingTDs = player.tds
        delete player.tds
        player.rushingTwoPts = player.twoptm
        delete player.twopta
        delete player.twoptm
        delete player.lng
        delete player.lngtd
      }
      if (statType == 'receiving') {
        player.receivingReceptions = player.rec
        delete player.rec
        player.receivingYards = player.yds
        delete player.yds
        player.receivingTDs = player.tds
        delete player.tds
        player.receivingTwoPts = player.twoptm
        delete player.twopta
        delete player.twoptm
        delete player.lng
        delete player.lngtd
      }
      if (statType == 'fumbles') {
        player.fumbles = player.lost
        delete player.tot
        delete player.rcv
        delete player.trcv
        delete player.yds
      }
      players.push(player)
    }
  }
  return players
}

// store all teams in db
exports.teams = async (req, res) => {
  const teamResponse = await axios.get(
    'https://feeds.nfl.com/feeds-rs/teams/2019.json'
  )
  const teams = teamResponse.data.teams
  await Team.deleteMany({}) // clear out existing teams
  await Team.insertMany(teams) // insert teams
  await Team.deleteMany({ teamType: 'PRO' }) // get rid of afc and nfc pro bowl teams

  res.send(`Grabbed all teams`)
}

// store all players in db
exports.rosters = async (req, res) => {
  // now loop through each team
  await Player.deleteMany({}) // clear out existing players
  const teams = await Team.find().sort({ fullName: 'asc' })
  let totalPlayers = 0
  for (const team of teams) {
    const rosterResponse = await axios.get(
      `https://feeds.nfl.com/feeds-rs/roster/${team.teamId}.json`
    )
    const roster = rosterResponse.data.teamPlayers
    const playersOnTeam = roster.length
    await Player.insertMany(roster) // insert players
    totalPlayers += playersOnTeam
    console.log(`added ${playersOnTeam} players to ${team.fullName}`)
  }

  // setup team DS/Ts
  const defenses = teams.map(team => {
    return {
      season: 2019,
      gsisId: 'DST_' + team.abbr,
      nflId: team.nflId,
      status: 'ACT',
      displayName: team.fullName,
      firstName: team.cityState,
      lastName: team.nick,
      positionGroup: 'DST',
      position: 'DST',
      teamAbbr: team.abbr,
      teamId: team.teamId,
      teamFullName: team.fullName
    }
  })
  await Player.insertMany(defenses)

  res.send(`Grabbed all ${totalPlayers} players`)
}

// download all player headshots to filesystem
exports.photos = async (req, res) => {
  const roster = await Player.find({})
  let photosDownloadedCount = 0
  let erroredPhotos = []
  for (const player of roster) {
    const esbId = player.esbId
    const imageURL = `http://static.nfl.com/static/content/public/static/img/fantasy/transparent/200x200/${esbId}.png`
    const localPath = path.resolve(
      __dirname,
      '../public/graphics/players/',
      `${esbId}.png`
    )
    try {
      await downloadImage.download(imageURL, localPath)
      ++photosDownloadedCount
    } catch (error) {
      console.log('errored on ' + imageURL)
      erroredPhotos.push(player)
    }
  }
  if (erroredPhotos.length) {
    for (const player of erroredPhotos) {
      const esbId = player.esbId
      const imageURL = `http://static.nfl.com/static/content/public/static/img/fantasy/transparent/200x200/${esbId}.png`
      const localPath = path.resolve(
        __dirname,
        '../public/graphics/players/',
        `${esbId}.png`
      )
      try {
        await downloadImage.download(imageURL, localPath)
        ++photosDownloadedCount
      } catch (error) {
        console.log('second error on ' + imageURL)
      }
    }
  }

  res.send(`${photosDownloadedCount} photos downloaded of ${roster.length}`)
}

// assign players to owners
exports.setupFantasyTeams = async (req, res) => {
  const fantasyOwners = [
    { ownerId: 'justin_g', displayName: 'Justin’s Lobos' },
    { ownerId: 'justin_m', displayName: 'Justin’s Giant Titans' },
    { ownerId: 'bern_f', displayName: 'Bern’s Recruits' },
    { ownerId: 'nathan_s', displayName: 'Nate’s Bench Warmers' },
    { ownerId: 'luke_b', displayName: 'Luke’s Newbies' },
    { ownerId: 'josh_b', displayName: 'Mitch’s Burgers' }
  ]

  // setup owners
  await Owner.deleteMany({})
  await Owner.insertMany(fantasyOwners)

  // for each team (bern, nathan, etc)
  //    load json file
  //    iterate through each player, assigning owner to string
  for (let i = 0; i < fantasyOwners.length; i++) {
    const result = await axios.get(
      `http://localhost:4444/rosters/roster_${fantasyOwners[i].ownerId}.json`
    )
    const playersToMark = result.data
    for (
      let playerIndex = 0;
      playerIndex < playersToMark.length;
      playerIndex++
    ) {
      // if defenses, search on gsisId
      let whereClause = { displayName: playersToMark[playerIndex].name }
      if (playersToMark[playerIndex].position === 'TmD') {
        whereClause = { gsisId: `DST_${playersToMark[playerIndex].team}` }
      }

      // mark player as owned
      const player = await Player.findOneAndUpdate(
        whereClause,
        {
          fantasyOwner: fantasyOwners[i].ownerId
        },
        { new: true, setDefaultsOnInsert: true }
      )

      if (!player) {
        console.log('unable to find', playersToMark[playerIndex].name)
      } else {
        // console.log('marked', player.displayName)
      }
    }
  }
  res.send('done updating rosters')
}
