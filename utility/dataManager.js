const axios = require('axios')
const getCurrentWeek = require('../utility/getCurrentWeek')
const moment = require('moment')
const db = require('../db')

exports.getCurrentGameData = async () => {
  const week = getCurrentWeek.getCurrentWeek()
  const { rows: games } = await db.query(
    `SELECT *
     FROM game
     WHERE isotime < $1 AND isotime > $2 AND (quarter != 'Final' OR quarter != 'final overtime')`,
    [
      moment()
        .add(15, 'minutes')
        .format('YYYY-MM-DD HH:MM'),
      moment()
        .subtract(4, 'hours')
        .format('YYYY-MM-DD HH:MM')
    ]
  )

  const parsingResult = await exports.parseGames(games, week, week)
  return parsingResult
}

exports.parseGames = async (games, startWeek, endWeek) => {
  const gamesCount = games.length

  // parse them all
  let statlinesCount = 0
  for (let i = 0; i < games.length; i++) {
    statlinesCount += await updateStatsForGameFromNFL(games[i])
  }

  // update fantasy point totals in matchup collection
  await updateFantasyPointsForMatchups(startWeek, endWeek)

  return {
    statlinesCount,
    gamesCount
  }
}

updateFantasyPointsForMatchups = async (startWeek, endWeek) => {
  for (let week = startWeek; week <= endWeek; week++) {
    const { rows: matchups } = await db.query(
      `SELECT * FROM matchup WHERE week = $1`,
      [week]
    )
    for (let i = 0; i < matchups.length; i++) {
      const homeResults = await exports.totalPointsForTeamWeek(
        matchups[i].home,
        week
      )
      const awayResults = await exports.totalPointsForTeamWeek(
        matchups[i].away,
        week
      )
      await db.query(
        ` UPDATE matchup
          SET
            homescore = $1,
            homeplayersleft = $2,
            homeplayersplaying = $3,
            homeplayersdone = $4,
            awayscore = $5,
            awayplayersleft = $6,
            awayplayersplaying = $7,
            awayplayersdone = $8
          WHERE id = $9`,
        [
          homeResults.score,
          homeResults.playersLeft,
          homeResults.playersPlaying,
          homeResults.playersDone,
          awayResults.score,
          awayResults.playersLeft,
          awayResults.playersPlaying,
          awayResults.playersDone,
          matchups[i].id
        ]
      )
    }
    console.log('completed updating matchups for week ' + week)
  }
}

exports.totalPointsForTeamWeek = async (fantasyTeamId, week) => {
  let playersLeft = 0
  let playersPlaying = 0
  let playersDone = 0
  let { rows: players } = await db.query(
    `
      SELECT
        player.displayname,
        player.teamfullname,
        player.teamabbr,
        player.firstname,
        player.lastname,
        player.esbid,
        player.position,
        game.isotime,
        game.quarter,
        game.home_teamabbr,
        game.home_scorecurrent,
        game.away_teamabbr,
        game.away_scorecurrent,
        game.clock,
        statline.id AS statline_id,
        statline.passingattempts AS statline_passingattempts,
        statline.passingcompletions AS statline_passingcompletions,
        statline.passingyards AS statline_passingyards,
        statline.passingtds AS statline_passingtds,
        statline.passingints AS statline_passingints,
        statline.passingtwopts AS statline_passingtwopts,
        statline.rushingattempts AS statline_rushingattempts,
        statline.rushingyards AS statline_rushingyards,
        statline.rushingtds AS statline_rushingtds,
        statline.rushingtwopts AS statline_rushingtwopts,
        statline.receivingreceptions AS statline_receivingreceptions,
        statline.receivingyards AS statline_receivingyards,
        statline.receivingtds AS statline_receivingtds,
        statline.receivingtwopts AS statline_receivingtwopts,
        statline.fumbleslost AS statline_fumbleslost,
        statline.dst_sacks AS statline_dst_sacks,
        statline.dst_ints AS statline_dst_ints,
        statline.dst_safeties AS statline_dst_safeties,
        statline.dst_fumbles AS statline_dst_fumbles,
        statline.dst_tds AS statline_dst_tds,
        statline.dst_pointsallowed AS dst_pointsallowed,
        statline.fantasypoints
      FROM player
      LEFT OUTER JOIN game ON game.week = $1 AND (player.teamid = game.home_teamid OR player.teamid = game.away_teamid)
      LEFT OUTER JOIN statline ON statline.playerid = player.id AND statline.week = $2
      WHERE fantasyowner = $3
      ORDER BY CASE player.position
        WHEN 'QB' THEN 1
        WHEN 'RB' THEN 2
        WHEN 'WR' THEN 3
        WHEN 'TE' THEN 4
        WHEN 'DST' THEN 5
      END, game.isoTime ASC
  `,
    [week, week, fantasyTeamId]
  )

  // create array of positions with players slotted into appropriate position subarray
  const positionTypes = ['QB', 'RB', 'WR', 'TE', 'DST']
  let positions = []
  for (let i = 0; i < positionTypes.length; i++) {
    let position = {
      _id: positionTypes[i],
      players: []
    }
    for (let j = 0; j < players.length; j++) {
      const player = players[j]
      if (player.position === position._id) {
        position.players.push(players[j])
      }
    }
    positions.push(position)
  }

  // move fantasy points to player level
  positions = positions.map(position => {
    position.players.map(player => {
      // setup players fantasy points
      if (player.fantasypoints == null) {
        player.fantasypoints = 0.0
      } else {
        player.fantasypoints = Math.round(player.fantasypoints * 100) / 100
      }

      // determine if player yet to play, played or playing now
      // if no gametime, player on bye
      if (player.isotime != null) {
        if (player.quarter === null) {
          ++playersLeft // if no quarter, game hasn't started
        } else if (
          player.quarter === 'Final' ||
          player.quarter === 'final overtime'
        ) {
          ++playersDone
        } else {
          ++playersPlaying
        }
      }
      return player
    })

    return position
  })

  // mark best x positions
  positions = positions.map(position => {
    position.players.sort(function(a, b) {
      return b.fantasypoints - a.fantasypoints
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
        teamTotal += positions[i].players[j].fantasypoints
      }
    }
  }

  return {
    positions,
    score: Math.round(teamTotal * 100) / 100,
    playersLeft,
    playersPlaying,
    playersDone
  }
}

markBestPlayers = (bestSpots, players) => {
  for (let i = 0; i < players.length; i++) {
    if (i < bestSpots) {
      players[i].best = true
    }
  }
}

updateStatsForGameFromNFL = async game => {
  // const gameId = '2019090811'
  // const teamResponse = await axios.get('http://localhost:4445/game.json')
  const gameId = game.gameid
  console.log(
    'gameId',
    gameId,
    `http://www.nfl.com/liveupdate/game-center/${gameId}/${gameId}_gtd.json`
  )
  const teamResponse = await axios.get(
    `http://www.nfl.com/liveupdate/game-center/${gameId}/${gameId}_gtd.json`
  )
  const week = game.week
  const gameStatsData = teamResponse.data[gameId]
  gameStatsData.gameId = gameId
  gameStatsData.week = week

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

  const statlinesParsed = await statlinesFromGame(gameStatsData)
  return statlinesParsed
}

// generate statlines from game.json
statlinesFromGame = async gameStatsData => {
  const gameId = gameStatsData.gameId
  const week = gameStatsData.week
  const homeStatsNode = gameStatsData.home.stats
  const awayStatsNode = gameStatsData.away.stats

  let homeTeamDef = setupTeamDefense(gameStatsData, 'home')
  let awayTeamDef = setupTeamDefense(gameStatsData, 'away')
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
        (a, b) => a.set(b.gsisid, Object.assign(a.get(b.gsisid) || {}, b)),
        new Map()
      )
      .values(),
    homeTeamDef,
    awayTeamDef
  ]

  // insert or update stats
  let statlinesUpserted = 0
  for (let i = 0; i < playerStats.length; i++) {
    let { rows: playerResult } = await db.query(
      'SELECT id, displayname, position FROM player WHERE gsisid = $1',
      [playerStats[i].gsisid]
    )
    if (playerResult.length) {
      const player = playerResult.pop()
      let stats = playerStats[i]
      let fantasyPoints = 0.0
      if (player.position === 'DST') {
        fantasyPoints += stats.dst_sacks
        fantasyPoints += stats.dst_fumbles * 2
        fantasyPoints += stats.dst_ints * 2
        fantasyPoints += stats.dst_safeties * 2
        fantasyPoints += stats.dst_tds * 6
        if (stats.dst_pointsallowed == 0) {
          fantasyPoints += 10
        }
        if (stats.dst_pointsallowed > 0 && stats.dst_pointsallowed <= 6) {
          fantasyPoints += 7
        }
        if (stats.dst_pointsallowed > 6 && stats.dst_pointsallowed <= 20) {
          fantasyPoints += 4
        }
        if (stats.dst_pointsallowed > 20 && stats.dst_pointsallowed <= 29) {
          fantasyPoints += 1
        }
        if (stats.dst_pointsallowed > 29) {
          fantasyPoints -= 3
        }
      } else {
        if (stats.passingattempts) {
          fantasyPoints += stats.passingyards / 25
          fantasyPoints += stats.passingints * -2
          fantasyPoints += stats.passingtds * 6
          fantasyPoints += stats.passingtwopts * 2
          if (stats.passingyards >= 300) {
            fantasyPoints += 1
          }
          if (stats.passingyards >= 400) {
            fantasyPoints += 2
          }
          if (stats.passingyards >= 500) {
            fantasyPoints += 3
          }
        }
        if (stats.rushingattempts) {
          fantasyPoints += stats.rushingyards / 10
          fantasyPoints += stats.rushingtds * 6
          fantasyPoints += stats.rushingtwopts * 2
          if (stats.rushingyards >= 100) {
            fantasyPoints += 2
          }
          if (stats.rushingyards >= 150) {
            fantasyPoints += 3
          }
          if (stats.rushingyards >= 200) {
            fantasyPoints += 4
          }
        }
        if (stats.receivingreceptions) {
          fantasyPoints += stats.receivingreceptions
          fantasyPoints += stats.receivingyards / 10
          fantasyPoints += stats.receivingtds * 6
          fantasyPoints += stats.receivingtwopts * 2
          if (stats.receivingyards >= 100) {
            fantasyPoints += 2
          }
          if (stats.receivingyards >= 150) {
            fantasyPoints += 3
          }
          if (stats.receivingyards >= 200) {
            fantasyPoints += 4
          }
        }
        if (stats.fumbleslost) {
          fantasyPoints += stats.fumbleslost * -2
        }
      }
      stats.fantasypoints = Math.round(fantasyPoints * 100) / 100

      let { rows: existingStatline } = await db.query(
        `SELECT id FROM statline WHERE week = $1 AND playerid = $2`,
        [week, player.id]
      )
      if (existingStatline.length) {
        // if statline exists, update it
        console.log('update statline for: ' + player.displayname)
        const statlineId = existingStatline[0].id
        await db.query(
          `UPDATE statline SET
              playerid = $1,
              name = $2,
              gameid = $3,
              week = $4,
              position = $5,
              passingattempts = $6,
              passingcompletions = $7,
              passingyards = $8,
              passingtds = $9,
              passingints = $10,
              passingtwopts = $11,
              rushingattempts = $12,
              rushingyards = $13,
              rushingtds = $14,
              rushingtwopts = $15,
              receivingreceptions = $16,
              receivingyards = $17,
              receivingtds = $18,
              receivingtwopts = $19,
              fumbleslost = $20,
              dst_sacks = $21,
              dst_ints = $22,
              dst_safeties = $23,
              dst_fumbles = $24,
              dst_tds = $25,
              dst_pointsallowed = $26,
              fantasypoints = $27
            WHERE id = $28`,
          [
            player.id,
            player.displayname,
            stats.gameid,
            stats.week,
            player.position,
            stats.passingattempts,
            stats.passingcompletions,
            stats.passingyards,
            stats.passingtds,
            stats.passingints,
            stats.passingtwopts,
            stats.rushingattempts,
            stats.rushingyards,
            stats.rushingtds,
            stats.rushingtwopts,
            stats.receivingreceptions,
            stats.receivingyards,
            stats.receivingtds,
            stats.receivingtwopts,
            stats.fumbleslost,
            stats.dst_sacks,
            stats.dst_ints,
            stats.dst_safeties,
            stats.dst_fumbles,
            stats.dst_tds,
            stats.dst_pointsallowed,
            stats.fantasypoints,
            statlineId
          ]
        )
      } else {
        // insert it
        console.log('insert statline for: ' + player.displayname)
        await db.query(
          `INSERT INTO statline
            (playerid, name, gameid, week, position, passingattempts, passingcompletions, passingyards, passingtds, passingints,
              passingtwopts, rushingattempts, rushingyards, rushingtds, rushingtwopts, receivingreceptions, receivingyards, receivingtds,
              receivingtwopts, fumbleslost, dst_sacks, dst_ints, dst_safeties, dst_fumbles, dst_tds, dst_pointsallowed, fantasypoints)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)`,
          [
            player.id,
            player.displayname,
            stats.gameid,
            stats.week,
            player.position,
            stats.passingattempts,
            stats.passingcompletions,
            stats.passingyards,
            stats.passingtds,
            stats.passingints,
            stats.passingtwopts,
            stats.rushingattempts,
            stats.rushingyards,
            stats.rushingtds,
            stats.rushingtwopts,
            stats.receivingreceptions,
            stats.receivingyards,
            stats.receivingtds,
            stats.receivingtwopts,
            stats.fumbleslost,
            stats.dst_sacks,
            stats.dst_ints,
            stats.dst_safeties,
            stats.dst_fumbles,
            stats.dst_tds,
            stats.dst_pointsallowed,
            stats.fantasypoints
          ]
        )
      }
      ++statlinesUpserted
    }
  }

  return statlinesUpserted
}

setupTeamDefense = (gameStatsData, thisSideString) => {
  const otherSideString = thisSideString === 'home' ? 'away' : 'home'
  const scoreSummaries = gameStatsData.scrsummary
  const thisSideTeam = gameStatsData[thisSideString]
  const otherSideTeam = gameStatsData[otherSideString]

  // look through defensive players to figure out total sacks and interceptions
  let sacksFloat = 0.0
  let ints = 0
  if (thisSideTeam.stats.defense) {
    for (const gsisId in thisSideTeam.stats.defense) {
      const player = thisSideTeam.stats.defense[gsisId]
      sacksFloat += player.sk
      ints += player.int
    }
  }
  const sacks = Math.round(sacksFloat) // sacks can be split between players

  // look through fumble node to figure out which ones were lost by the other team
  let fumbles = 0
  if (otherSideTeam.stats.fumbles) {
    for (const gsisId in otherSideTeam.stats.fumbles) {
      const player = otherSideTeam.stats.fumbles[gsisId]
      fumbles += player.lost
    }
  }

  let safeties = 0
  if (scoreSummaries) {
    for (const gsisId in scoreSummaries) {
      const scoreSummary = scoreSummaries[gsisId]
      if (
        scoreSummary.type === 'SAF' &&
        scoreSummary.team === thisSideTeam.abbr
      ) {
        safeties += 1
      }
    }
  }

  // total up return and defensive TDs
  let TDs = 0
  if (thisSideTeam.stats.puntret) {
    for (const gsisId in thisSideTeam.stats.puntret) {
      TDs += thisSideTeam.stats.puntret[gsisId].tds
    }
  }
  if (thisSideTeam.stats.kickret) {
    for (const gsisId in thisSideTeam.stats.kickret) {
      TDs += thisSideTeam.stats.kickret[gsisId].tds
    }
  }
  if (scoreSummaries) {
    for (const gsisId in scoreSummaries) {
      const scoreSummary = scoreSummaries[gsisId]
      // make sure it's a TD and it's our team
      if (
        scoreSummary.type === 'TD' &&
        scoreSummary.team === thisSideTeam.abbr
      ) {
        // see if it was an interception or fumble return
        if (
          scoreSummary.desc.includes('blocked') ||
          scoreSummary.desc.includes('interception return') ||
          scoreSummary.desc.includes('fumble return')
        ) {
          TDs += 1
        }
      }
    }
  }

  let pointsAllowed = otherSideTeam.score.T

  const dstStats = {
    id: 'DST_' + thisSideTeam.abbr,
    gsisid: 'DST_' + thisSideTeam.abbr,
    position: 'DST',
    week: gameStatsData.week,
    gameid: gameStatsData.gameId,
    name: 'DST_' + thisSideTeam.abbr,
    dst_sacks: sacks,
    dst_ints: ints,
    dst_safeties: safeties,
    dst_fumbles: fumbles,
    dst_tds: TDs,
    dst_pointsallowed: pointsAllowed
  }

  return dstStats
}

cleanupStatType = (positionNode, statType, week, gameId) => {
  let players = []

  for (const gsisId in positionNode) {
    const playerStats = positionNode[gsisId]
    let player = {
      gameid: gameId,
      gsisid: gsisId,
      name: playerStats.name,
      week
    }
    if (statType == 'passing') {
      player.passingyards = playerStats.yds
      player.passingattempts = playerStats.att
      player.passingcompletions = playerStats.cmp
      player.passingints = playerStats.ints
      player.passingtds = playerStats.tds
      player.passingtwopts = playerStats.twoptm
    }
    if (statType == 'rushing') {
      player.rushingattempts = playerStats.att
      player.rushingyards = playerStats.yds
      player.rushingtds = playerStats.tds
      player.rushingtwopts = playerStats.twoptm
    }
    if (statType == 'receiving') {
      player.receivingreceptions = playerStats.rec
      player.receivingyards = playerStats.yds
      player.receivingtds = playerStats.tds
      player.receivingtwopts = playerStats.twoptm
    }
    if (statType == 'fumbles') {
      player.fumbleslost = playerStats.lost
    }
    players.push(player)
  }
  return players
}
