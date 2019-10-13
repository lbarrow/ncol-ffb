const path = require('path')
const downloadImage = require('../utility/downloadImage')
const axios = require('axios')
const mongoose = require('mongoose')
const moment = require('moment')
const getCurrentWeek = require('../utility/getCurrentWeek')
const convertToJSON = require('xml-js')

const API_URL = 'http://localhost:4445/'

const {
  getCurrentGameData,
  updateFantasyPointsForMatchups,
  updateStatsForGameFromNFL,
  statlinesFromGame
} = require('../utility/dataManager')

const Game = mongoose.model('Game')
const Matchup = mongoose.model('Matchup')
const Owner = mongoose.model('Owner')
const db = require('../db')

exports.index = async (req, res) => {
  res.render('index')
}

// store all games in db
exports.parseSchedule = async (req, res) => {
  const scheduleURL = 'http://www.nfl.com/feeds-rs/schedules/2019'
  // const scheduleURL = API_URL + 'schedule.json'
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
      gameType: item._attributes.gameType,
      weekNameAbbr: item._attributes.weekNameAbbr,
      weekName: item._attributes.weekName,
      homeTeam: {
        teamId: item._attributes.homeTeamId,
        teamAbbr: item._attributes.homeTeamAbbr,
        displayName: item._attributes.homeDisplayName,
        nickname: item._attributes.homeNickname
      },
      awayTeam: {
        teamId: item._attributes.visitorTeamId,
        teamAbbr: item._attributes.visitorTeamAbbr,
        displayName: item._attributes.visitorDisplayName,
        nickname: item._attributes.visitorNickname
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

  res.json({ regSeasonGames })
}

// setup fantasy team matchups in db from local json schedule
exports.setupMatchups = async (req, res) => {
  const matchupsJSONURL = API_URL + 'matchups.json'
  const response = await axios(matchupsJSONURL)

  const matchups = response.data.weeks

  await db.query(`DELETE FROM matchup`) // clear out existing records
  for (let i = 0; i < matchups.length; i++) {
    const matchup = matchups[i]
    await db.query(
      `INSERT INTO matchup (week, home, away) VALUES ($1, $2, $3)`,
      [matchup.week, matchup.home, matchup.away]
    )
  }

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

// parse games in a week provided by paramater
exports.parseSpecificWeek = async (req, res) => {
  const week = parseInt(req.params.week)
  const games = await Game.find({
    week
  })
  console.log('query done: grabbed games')

  const parsingResult = await parseGames(games, week, week)
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
  const parsingResult = await getCurrentGameData()
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
  await updateFantasyPointsForMatchups(startWeek, endWeek)
  console.log(
    'updateFantasyPointsForMatchups took ' + moment().diff(beforeQuery3) + 'ms'
  ) /// 6431 original result

  return {
    statlinesCount,
    gamesCount
  }
}

// store all teams in db
exports.teams = async (req, res) => {
  await db.query(`DELETE FROM team`) // clear out existing players
  const teamResponse = await axios.get(
    'https://feeds.nfl.com/feeds-rs/teams/2019.json'
  )
  const teams = teamResponse.data.teams

  for (let i = 0; i < teams.length; i++) {
    const team = teams[i]
    if (team.teamType !== 'PRO') {
      await db.query(
        `INSERT INTO team (season, teamid, abbr, citystate, fullname, nick, teamtype, conferenceabbr, divisionabbr, stadiumname) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          team.season,
          team.teamId,
          team.abbr,
          team.cityState,
          team.fullName,
          team.nick,
          team.teamType,
          team.conferenceAbbr,
          team.divisionAbbr,
          team.stadiumName
        ]
      )
    }
  }

  res.send(`Grabbed all teams`)
}

// store all players in db
exports.rosters = async (req, res) => {
  // now loop through each team
  await db.query(`DELETE FROM player`) // clear out existing players
  const { rows } = await db.query(`SELECT * FROM team ORDER BY fullname asc`) // get all teams
  const teams = rows
  let totalPlayers = 0
  for (const team of teams) {
    // get team json data
    const rosterResponse = await axios.get(
      `https://feeds.nfl.com/feeds-rs/roster/${team.teamid}.json`
    )
    const roster = rosterResponse.data.teamPlayers

    // insert players for this team
    const playersOnTeam = roster.length
    for (let i = 0; i < roster.length; i++) {
      const player = roster[i]
      if (player.gsisId) {
        await db.query(
          `INSERT INTO player (season,
                                nflid,
                                status,
                                displayname,
                                firstname,
                                lastname,
                                esbid,
                                gsisid,
                                middlename,
                                birthdate,
                                hometown,
                                collegeid,
                                collegename,
                                positiongroup,
                                position,
                                jerseynumber,
                                height,
                                weight,
                                yearsofexperience,
                                teamabbr,
                                teamseq,
                                teamid,
                                teamFullname)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
          [
            player.season,
            player.nflId,
            player.status,
            player.displayName,
            player.firstName,
            player.lastName,
            player.esbId,
            player.gsisId,
            player.middleName,
            player.birthDate,
            player.homeTown,
            player.collegeId,
            player.collegeName,
            player.positionGroup,
            player.position,
            player.jerseyNumber,
            player.height,
            player.weight,
            player.yearsOfExperience,
            player.teamAbbr,
            player.teamSeq,
            player.teamId,
            player.teamFullName
          ]
        )
      }
    }
    totalPlayers += playersOnTeam
    console.log(`added ${playersOnTeam} players to ${team.fullname}`)
  }

  // setup team DS/Ts
  const defenses = teams.map(team => {
    console.log('team', team)
    return {
      season: 2019,
      gsisId: 'DST_' + team.abbr,
      status: 'ACT',
      displayName: team.fullname,
      firstName: team.citystate,
      lastName: team.nick,
      positionGroup: 'DST',
      position: 'DST',
      teamAbbr: team.abbr,
      teamId: team.teamid,
      teamFullName: team.fullname
    }
  })
  // insert players for this team
  for (let i = 0; i < defenses.length; i++) {
    const dstPlayer = defenses[i]
    console.log('dstPlayer', { dstPlayer })
    await db.query(
      `INSERT INTO player (season,
                            gsisid,
                            nflid,
                            status,
                            displayname,
                            firstname,
                            lastname,
                            positiongroup,
                            position,
                            teamabbr,
                            teamid,
                            teamfullname)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        dstPlayer.season,
        dstPlayer.gsisId,
        dstPlayer.nflId,
        dstPlayer.status,
        dstPlayer.displayName,
        dstPlayer.firstName,
        dstPlayer.lastName,
        dstPlayer.positionGroup,
        dstPlayer.position,
        dstPlayer.teamAbbr,
        dstPlayer.teamId,
        dstPlayer.teamFullName
      ]
    )
  }

  res.send(`Grabbed all ${totalPlayers} players`)
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
  await db.query(`DELETE FROM owner`) // clear out existing players
  for (let i = 0; i < fantasyOwners.length; i++) {
    const fantasyOwner = fantasyOwners[i]
    await db.query(`INSERT INTO owner (ownerid, displayname) VALUES ($1, $2)`, [
      fantasyOwner.ownerId,
      fantasyOwner.displayName
    ])
  }

  // for each team (bern, nathan, etc)
  //    load json file
  //    iterate through each player, assigning owner to string
  await db.query(`UPDATE player SET fantasyowner = NULL`)
  for (let i = 0; i < fantasyOwners.length; i++) {
    const result = await axios.get(
      API_URL + `rosters/roster_${fantasyOwners[i].ownerId}.json`
    )
    const playersToMark = result.data
    for (
      let playerIndex = 0;
      playerIndex < playersToMark.length;
      playerIndex++
    ) {
      // if defenses, search on gsisId
      if (playersToMark[playerIndex].position === 'TmD') {
        const fakeDSTgsisid = `DST_${playersToMark[playerIndex].team}`
        await db.query(
          `UPDATE player
          SET fantasyowner = $1
          WHERE gsisId = $2`,
          [fantasyOwners[i].ownerId, fakeDSTgsisid]
        )
      } else {
        await db.query(
          `UPDATE player
          SET fantasyowner = $1
          WHERE displayname = $2 AND position = $3 AND teamabbr = $4`,
          [
            fantasyOwners[i].ownerId,
            playersToMark[playerIndex].name,
            playersToMark[playerIndex].position,
            playersToMark[playerIndex].team
          ]
        )
      }
    }
  }
  res.send('done updating fantasy team rosters')
}

// download all player headshots to filesystem
// exports.photos = async (req, res) => {
//   const roster = await Player.find({})
//   let photosDownloadedCount = 0
//   let erroredPhotos = []
//   for (const player of roster) {
//     const esbId = player.esbId
//     const imageURL = `http://static.nfl.com/static/content/public/static/img/fantasy/transparent/200x200/${esbId}.png`
//     const localPath = path.resolve(
//       __dirname,
//       '../public/graphics/players/',
//       `${esbId}.png`
//     )
//     try {
//       await downloadImage.download(imageURL, localPath)
//       ++photosDownloadedCount
//     } catch (error) {
//       console.log('errored on ' + imageURL)
//       erroredPhotos.push(player)
//     }
//   }
//   if (erroredPhotos.length) {
//     for (const player of erroredPhotos) {
//       const esbId = player.esbId
//       const imageURL = `http://static.nfl.com/static/content/public/static/img/fantasy/transparent/200x200/${esbId}.png`
//       const localPath = path.resolve(
//         __dirname,
//         '../public/graphics/players/',
//         `${esbId}.png`
//       )
//       try {
//         await downloadImage.download(imageURL, localPath)
//         ++photosDownloadedCount
//       } catch (error) {
//         console.log('second error on ' + imageURL)
//       }
//     }
//   }

//   res.send(`${photosDownloadedCount} photos downloaded of ${roster.length}`)
// }
