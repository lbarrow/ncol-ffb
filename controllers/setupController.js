// const path = require('path')
// const downloadImage = require('../utility/downloadImage')
const axios = require('axios')
const moment = require('moment')
const getCurrentWeek = require('../utility/getCurrentWeek')
const convertToJSON = require('xml-js')

const API_URL = process.env.API_URL

const { getCurrentGameData, parseGames } = require('../utility/dataManager')
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
      isoTime: item._attributes.isoTime,
      gameType: item._attributes.gameType,
      weekNameAbbr: item._attributes.weekNameAbbr,
      weekName: item._attributes.weekName,
      home_teamId: item._attributes.homeTeamId,
      home_teamAbbr: item._attributes.homeTeamAbbr,
      home_displayName: item._attributes.homeDisplayName,
      home_nickname: item._attributes.homeNickname,
      away_teamId: item._attributes.visitorTeamId,
      away_teamAbbr: item._attributes.visitorTeamAbbr,
      away_displayName: item._attributes.visitorDisplayName,
      away_nickname: item._attributes.visitorNickname
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
  let gamesUpdated = 0
  let gamesInserted = 0
  for (let i = 0; i < regSeasonGames.length; i++) {
    const game = regSeasonGames[i]
    const { rows: gameFromDB } = await db.query(
      `SELECT id FROM game WHERE gameid = $1`,
      [game.gameId]
    )
    if (gameFromDB.length) {
      // if game exists, update it with gameFromDB[0].id
      gamesUpdated++
      await db.query(
        `UPDATE game SET gameid = $1,
            season = $2,
            seasontype = $3,
            week = $4,
            gamekey = $5,
            gamedate = $6,
            gametimeeastern = $7,
            gametimelocal = $8,
            isotime = $9,
            gametype = $10,
            weeknameabbr = $11,
            weekname = $12,
            home_teamid = $13,
            home_teamabbr = $14,
            home_displayname = $15,
            home_nickname = $16,
            away_teamid = $17,
            away_teamabbr = $18,
            away_displayname = $19,
            away_nickname = $20
          WHERE id = $21`,
        [
          game.gameId,
          game.season,
          game.seasonType,
          game.week,
          game.gameKey,
          game.gameDate,
          game.gameTimeEastern,
          game.gameTimeLocal,
          game.isoTime,
          game.gameType,
          game.weekNameAbbr,
          game.weekName,
          game.home_teamId,
          game.home_teamAbbr,
          game.home_displayName,
          game.home_nickname,
          game.away_teamId,
          game.away_teamAbbr,
          game.away_displayName,
          game.away_nickname,
          gameFromDB[0].id
        ]
      )
    } else {
      // insert it
      gamesInserted++
      await db.query(
        `INSERT INTO game (gameid,
          season,
          seasontype,
          week,
          gamekey,
          gamedate,
          gametimeeastern,
          gametimelocal,
          isotime,
          gametype,
          weeknameabbr,
          weekname,
          home_teamid,
          home_teamabbr,
          home_displayname,
          home_nickname,
          away_teamid,
          away_teamabbr,
          away_displayname,
          away_nickname) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          game.gameId,
          game.season,
          game.seasonType,
          game.week,
          game.gameKey,
          game.gameDate,
          game.gameTimeEastern,
          game.gameTimeLocal,
          game.isoTime,
          game.gameType,
          game.weekNameAbbr,
          game.weekName,
          game.home_teamId,
          game.home_teamAbbr,
          game.home_displayName,
          game.home_nickname,
          game.away_teamId,
          game.away_teamAbbr,
          game.away_displayName,
          game.away_nickname
        ]
      )
    }
  }

  res.send(`${gamesUpdated} games updated  |  ${gamesInserted} games inserted`)
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
  const { rows: owners } = await db.query(
    `SELECT * FROM owner ORDER BY wins DESC`
  )
  const week = getCurrentWeek.getCurrentWeek() - 1 // evaluate all matchups before now

  // for each owner
  for (let i = 0; i < owners.length; i++) {
    let wins = 0
    let losses = 0
    const ownerid = owners[i].ownerid

    // find all matchups involving this owner
    const { rows: matchups } = await db.query(
      `SELECT * FROM matchup
       WHERE (home = $1 OR away = $2) AND week <= $3
       ORDER BY week ASC`,
      [ownerid, ownerid, week]
    )

    // figure out if won or lost this matchup
    let pointsFor = 0,
      pointsAgainst = 0,
      streakType = '',
      streakAmount = 0,
      resultHistory = []
    for (let i = 0; i < matchups.length; i++) {
      if (matchups[i].home === ownerid) {
        pointsFor += matchups[i].homescore
        pointsAgainst += matchups[i].awayscore
        if (matchups[i].homescore > matchups[i].awayscore) {
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
        pointsFor += matchups[i].awayscore
        pointsAgainst += matchups[i].homescore
        if (matchups[i].awayscore > matchups[i].homescore) {
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
    await db.query(
      `UPDATE owner
        SET
          wins = $1,
          losses = $2,
          pointsfor = $3,
          pointsagainst = $4,
          streak = $5,
          result_history = $6
        WHERE ownerid = $7`,
      [
        wins,
        losses,
        Math.round(pointsFor * 100) / 100,
        Math.round(pointsAgainst * 100) / 100,
        `${streakType}${streakAmount}`,
        resultHistory.toString(),
        ownerid
      ]
    )
  }
  res.send(`${owners.length} owners records set`)
}

// get the games from the start of the season until now
// (including games being played)
exports.parseAllGames = async (req, res) => {
  const { rows: games } = await db.query(
    `SELECT * FROM game WHERE week >= 1 AND isoTime < $1`,
    [moment().format('YYYY-MM-DD HH:MM')]
  )

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
  const { rows: games } = await db.query(
    `SELECT * FROM game WHERE week = $1 AND isoTime < $2`,
    [week]
  )

  const parsingResult = await parseGames(games, week, week)
  res.json(parsingResult)
}

// parse games in this week that have a start time in the past
exports.parseThisWeek = async (req, res) => {
  const week = getCurrentWeek.getCurrentWeek()
  const { rows: games } = await db.query(
    `SELECT * FROM game WHERE week = $1 AND isoTime < $2`,
    [week, moment().format('YYYY-MM-DD HH:MM')]
  )

  const parsingResult = await parseGames(games, week, week)
  res.json(parsingResult)
}

// parse games that are either yet to start, in progress
// or have finished but we haven't parsed them since they've finished
exports.parseCurrentGames = async (req, res) => {
  const parsingResult = await getCurrentGameData()
  res.json(parsingResult)
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
  const { rows: teams } = await db.query(
    `SELECT * FROM team ORDER BY fullname asc`
  ) // get all teams
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
