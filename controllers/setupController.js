const axios = require('axios')
const mongoose = require('mongoose')
const path = require('path')
const moment = require('moment')
const downloadImage = require('../utility/downloadImage')
const convertToJSON = require('xml-js')

const Team = mongoose.model('Team')
const Player = mongoose.model('Player')
const Game = mongoose.model('Game')
const Statline = mongoose.model('Statline')

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

exports.getGames = async (req, res) => {
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
  for (let i = 0; i < games.length; i++) {
    statlinesCount += await parseGame(games[i])
    console.log(`${games[i].visitorTeamAbbr} @ ${games[i].homeTeamAbbr} parsed`)
  }

  res.json({
    statlinesParsed: statlinesCount,
    gamesCount
  })
}

parseGame = async game => {
  const teamResponse = await axios.get(
    `http://www.nfl.com/liveupdate/game-center/${game.gameId}/${game.gameId}_gtd.json`
  )
  // const teamResponse = await axios.get('http://localhost:4444/game.json')
  const week = game.week
  const gameId = game.gameId
  const teamAbbr = teamResponse.data[gameId].home.abbr
  const homeStatsNode = teamResponse.data[gameId].home.stats
  const awayStatsNode = teamResponse.data[gameId].away.stats
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
      .values()
  ]

  // insert or update stats
  for (let index = 0; index < playerStats.length; index++) {
    const player = await Player.findOne({ gsisId: playerStats[index].id })
    if (player != undefined) {
      console.log('player.position', player.position)
      await Statline.findOneAndUpdate(
        {
          gsisId: playerStats[index].id,
          week: playerStats[index].week,
          player: player._id,
          position: player.position
        },
        playerStats[index],
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    } else {
      const undefinedPlayer = playerStats[index]
      console.log('PLAYER UNDEFINED', { undefinedPlayer })
    }
  }

  return playerStats.length
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
