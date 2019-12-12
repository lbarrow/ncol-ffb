const getCurrentWeek = require('../utility/getCurrentWeek')
const db = require('../db')
const { totalPointsForTeamWeek } = require('../utility/dataManager')

exports.index = async (req, res) => {
  const week = getCurrentWeek.getCurrentWeek()
  const { rows: matchups } = await db.query(
    `SELECT
      matchup.id,
      matchup.week,
      matchup.type,
      matchup.homescore,
      matchup.awayscore,
      away_owner.ownerid AS away_owner_ownerid,
      away_owner.displayname AS away_owner_displayname,
      away_owner.losses AS away_owner_losses,
      away_owner.wins AS away_owner_wins,
      home_owner.ownerid AS home_owner_ownerid,
      home_owner.displayname AS home_owner_displayname,
      home_owner.losses AS home_owner_losses,
      home_owner.wins AS home_owner_wins
    FROM matchup
    LEFT OUTER JOIN owner AS home_owner ON home_owner.ownerid = matchup.home
    LEFT OUTER JOIN owner AS away_owner ON away_owner.ownerid = matchup.away
    WHERE week = $1`,
    [week]
  )

  const { rows: teams } = await db.query(
    `SELECT ownerid, displayname, wins, losses, streak FROM owner ORDER BY wins DESC`
  )

  const data = {
    teams,
    week,
    matchups
  }
  res.header('Content-Type', 'application/json')
  res.send(JSON.stringify(data, null, 4))
}

exports.standings = async (req, res) => {
  const { rows: teams } = await db.query(
    `SELECT
      ownerid,
      displayname,
      wins,
      losses,
      pointsfor,
      pointsagainst,
      streak,
      result_history
    FROM owner ORDER BY wins DESC`
  )

  res.header('Content-Type', 'application/json')
  res.send(JSON.stringify(teams, null, 4))
}

exports.matchups = async (req, res) => {
  const week = getCurrentWeek.getCurrentWeek()
  const { rows: matchups } = await db.query(
    `SELECT
      matchup.id,
      matchup.week,
      matchup.type,
      matchup.homescore,
      matchup.awayscore,
      away_owner.ownerid AS away_owner_ownerid,
      away_owner.displayname AS away_owner_displayname,
      away_owner.losses AS away_owner_losses,
      away_owner.wins AS away_owner_wins,
      home_owner.ownerid AS home_owner_ownerid,
      home_owner.displayname AS home_owner_displayname,
      home_owner.losses AS home_owner_losses,
      home_owner.wins AS home_owner_wins
    FROM matchup
    LEFT OUTER JOIN owner AS home_owner ON home_owner.ownerid = matchup.home
    LEFT OUTER JOIN owner AS away_owner ON away_owner.ownerid = matchup.away
    ORDER BY week DESC, id DESC`
  )

  let finalWeek = matchups[0].week
  let matchupsByWeek = []
  for (let i = finalWeek; i > 0; i--) {
    let matchupWeek = {
      _id: i,
      matchups: []
    }
    for (let j = 0; j < matchups.length; j++) {
      if (matchups[j].week === i) {
        matchupWeek.matchups.push(matchups[j])
      }
    }
    matchupsByWeek.push(matchupWeek)
  }

  const data = {
    week,
    matchups: matchupsByWeek
  }
  res.header('Content-Type', 'application/json')
  res.send(JSON.stringify(data, null, 4))
}

exports.matchupDetail = async (req, res) => {
  const matchupId = parseInt(req.params.id)
  const { rows: matchupQueryResult } = await db.query(
    `SELECT
      matchup.id,
      matchup.week,
      matchup.homescore,
      matchup.awayscore,
      matchup.type,
      matchup.homeplayersleft AS homeplayersleft,
      matchup.homeplayersplaying AS homeplayersplaying,
      matchup.awayplayersleft AS awayplayersleft,
      matchup.awayplayersplaying AS awayplayersplaying,
      away_owner.ownerid AS away_owner_ownerid,
      away_owner.displayname AS away_owner_displayname,
      home_owner.ownerid AS home_owner_ownerid,
      home_owner.wins AS home_owner_wins
    FROM matchup
    LEFT OUTER JOIN owner AS home_owner ON home_owner.ownerid = matchup.home
    LEFT OUTER JOIN owner AS away_owner ON away_owner.ownerid = matchup.away
    WHERE matchup.id = $1`,
    [matchupId]
  )
  const matchup = matchupQueryResult[0]

  // get teams with points setup
  const homeStatlines = await totalPointsForTeamWeek(
    matchup.home_owner_ownerid,
    matchup.week
  )
  const awayStatlines = await totalPointsForTeamWeek(
    matchup.away_owner_ownerid,
    matchup.week
  )

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
        owner: {
          ownerid: matchup.home_owner_ownerid,
          playersleft: matchup.homeplayersleft,
          playersplaying: matchup.homeplayersplaying,
          total: matchup.homescore
        },
        ...homeStatlines
      },
      {
        owner: {
          ownerid: matchup.away_owner_ownerid,
          playersleft: matchup.awayplayersleft,
          playersplaying: matchup.awayplayersplaying,
          total: matchup.awayscore
        },
        ...awayStatlines
      }
    ]
  }

  res.header('Content-Type', 'application/json')
  res.send(JSON.stringify(data, null, 4))
}

exports.teamDetail = async (req, res) => {
  const ownerId = req.params.id

  const {
    rows: ownerResult
  } = await db.query(`SELECT * FROM owner WHERE ownerid = $1`, [ownerId])
  const owner = ownerResult[0]

  const { rows: upcoming } = await db.query(
    ` SELECT
        week,
        ownerid,
        displayname,
        wins,
        losses
      FROM matchup
      INNER JOIN owner ON away = owner.ownerid
      WHERE home = $1 AND week > $2
      UNION
      SELECT
        week,
        ownerid,
        displayname,
        wins,
        losses
      FROM matchup
      INNER JOIN owner ON home = owner.ownerid
      WHERE away = $1 AND week > $2
      ORDER BY week
      LIMIT 3`,
    [ownerId, getCurrentWeek.getCurrentWeek()]
  )

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
        (SELECT COUNT(*)
          FROM statline
          WHERE statline.playerid = player.id AND statline.best = true AND statline.week < $2)
          AS times_best
      FROM player
      WHERE fantasyowner = $1
      ORDER BY
        CASE player.position
          WHEN 'QB' THEN 1
          WHEN 'RB' THEN 2
          WHEN 'WR' THEN 3
          WHEN 'TE' THEN 4
          WHEN 'DST' THEN 5
        END,
        times_best DESC,
        player.lastname ASC
  `,
    [ownerId, getCurrentWeek.getCurrentWeek()]
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

  const data = {
    owner,
    positions,
    upcoming
  }
  res.header('Content-Type', 'application/json')
  res.send(JSON.stringify(data, null, 4))
}
