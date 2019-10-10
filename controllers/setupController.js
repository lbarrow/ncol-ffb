const axios = require('axios')
const mongoose = require('mongoose')
const path = require('path')
const moment = require('moment')
const downloadImage = require('../utility/downloadImage')
const getCurrentWeek = require('../utility/getCurrentWeek')
const {
  updateFantasyPointsForMatchups,
  updateStatsForGameFromNFL,
  statlinesFromGame
} = require('../utility/dataManager')

const Team = mongoose.model('Team')
const Player = mongoose.model('Player')
const Game = mongoose.model('Game')
const Matchup = mongoose.model('Matchup')
const Owner = mongoose.model('Owner')

exports.index = async (req, res) => {
  res.render('index')
}

// store all games in db
exports.parseSchedule = async (req, res) => {
  const scheduleURL = 'http://www.nfl.com/feeds-rs/schedules/2019'
  // const scheduleURL = 'http://localhost:4444/schedule.json'
  const response = await axios(scheduleURL)
  const gamesJSON = response.data.gameSchedules
  const games = gamesJSON.map(item => {
    return {
      gameId: item.gameId,
      season: item.season,
      seasonType: item.seasonType,
      week: item.week,
      gameKey: item.gameKey,
      gameDate: item.gameDate,
      gameTimeEastern: item.gameTimeEastern,
      gameTimeLocal: item.gameTimeLocal,
      isoTime: new Date(item.isoTime),
      gameType: item.gameType,
      weekNameAbbr: item.weekNameAbbr,
      weekName: item.weekName,
      homeTeam: {
        teamId: item.homeTeam.teamId,
        teamAbbr: item.homeTeam.abbr,
        displayName: item.homeTeam.fullName,
        nickname: item.homeTeam.nick
      },
      awayTeam: {
        teamId: item.visitorTeam.teamId,
        teamAbbr: item.visitorTeam.abbr,
        displayName: item.visitorTeam.fullName,
        nickname: item.visitorTeam.nick
      }
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

  res.send(`updated ${regSeasonGames.length} games`)
}

// setup fantasy team matchups in db from local json schedule
exports.setupMatchups = async (req, res) => {
  const matchupsJSONURL = 'http://localhost:4444/matchups.json'
  const response = await axios(matchupsJSONURL)

  const matchups = response.data.weeks

  await Matchup.deleteMany({}) // clear out existing matchups
  await Matchup.insertMany(matchups) // insert matchups

  res.send(`${matchups.length} matchups setup`)
}

// update all fantasy teams' records based on matchup results
exports.updateFantasyTeamRecords = async (req, res) => {
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
    let pointsFor = 0,
      pointsAgainst = 0,
      streakType = '',
      streakAmount = 0,
      resultHistory = []
    for (let i = 0; i < matchups.length; i++) {
      if (matchups[i].home === ownerId) {
        pointsFor += matchups[i].homeScore
        pointsAgainst += matchups[i].awayScore
        if (matchups[i].homeScore > matchups[i].awayScore) {
          wins++
          resultHistory.push('W')
          if (streakType == 'W') {
            ++streakAmount
          } else {
            streakType = 'W'
            streakAmount = 1
          }
        } else {
          losses++
          resultHistory.push('L')
          if (streakType == 'L') {
            ++streakAmount
          } else {
            streakType = 'L'
            streakAmount = 1
          }
        }
      } else {
        pointsFor += matchups[i].awayScore
        pointsAgainst += matchups[i].homeScore
        if (matchups[i].awayScore > matchups[i].homeScore) {
          wins++
          resultHistory.push('W')
          if (streakType == 'W') {
            ++streakAmount
          } else {
            streakType = 'W'
            streakAmount = 1
          }
        } else {
          losses++
          resultHistory.push('L')
          if (streakType == 'L') {
            ++streakAmount
          } else {
            streakType = 'L'
            streakAmount = 1
          }
        }
      }
    }

    // save wins and losses to db
    owners[i].wins = wins
    owners[i].losses = losses
    owners[i].pointsFor = Math.round(pointsFor * 100) / 100
    owners[i].pointsAgainst = Math.round(pointsAgainst * 100) / 100
    owners[i].streak = `${streakType}${streakAmount}`
    owners[i].resultHistory = resultHistory
    await owners[i].save()
  }
  res.send(`${owners.length} owners records set`)
}

// get the games from the start of the season until now
// (including games being played)
exports.parseAllGames = async (req, res) => {
  const games = await Game.find({
    isoTime: {
      $gte: moment('2019-09-05T23:10:00.000+00:00').toDate(),
      $lt: moment().toDate()
    }
  })

  const parsingResult = await parseGames(
    games,
    1,
    getCurrentWeek.getCurrentWeek()
  )
  res.json(parsingResult)
}

// parse games in this week that have a start time in the past
exports.parseThisWeek = async (req, res) => {
  const week = getCurrentWeek.getCurrentWeek()
  const games = await Game.find({
    week,
    isoTime: {
      $gte: moment('2019-09-05T23:10:00.000+00:00').toDate(),
      $lt: moment().toDate()
    }
  })

  const parsingResult = await parseGames(games, week, week)
  res.json(parsingResult)
}

// parse games that are either yet to start, in progress
// or have finished but we haven't parsed them since they've finished
exports.parseCurrentGames = async (req, res) => {
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
  res.json(parsingResult)
}

// parse games that are either yet to start, in progress
// or have finished but we haven't parsed them since they've finished
exports.onlyUpdateMatchups = async (req, res) => {
  await updateFantasyPointsForMatchups(1, 16)
  res.send('Done updating matchups')
}

parseGames = async (games, startWeek, endWeek) => {
  const gamesCount = games.length

  // parse them all
  let statlinesCount = 0
  for (let i = 0; i < games.length; i++) {
    await updateStatsForGameFromNFL(games[i])
    statlinesCount += await statlinesFromGame(games[i])
    console.log(
      `${games[i].awayTeam.teamAbbr} @ ${games[i].homeTeam.teamAbbr} parsed`
    )
  }

  // update fantasy point totals in matchup collection
  await updateFantasyPointsForMatchups(startWeek, endWeek)

  return {
    statlinesCount,
    gamesCount
  }
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
      gsisId: 'DST_' + team.teamAbbr,
      nflId: team.nflId,
      status: 'ACT',
      displayName: team.fullName,
      firstName: team.cityState,
      lastName: team.nick,
      positionGroup: 'DST',
      position: 'DST',
      teamAbbr: team.teamAbbr,
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
