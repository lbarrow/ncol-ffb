const getCurrentWeek = require('../utility/getCurrentWeek')
const db = require('../db')
const { totalPointsForTeamWeek } = require('../utility/dataManager')

exports.index = async (req, res) => {
  const week = getCurrentWeek.getCurrentWeek()
  const { rows: matchups } = await db.query(
    `SELECT
      matchup.id,
      matchup.week,
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
    WHERE week <= $1
    ORDER BY week DESC`,
    [week]
  )

  let matchupsByWeek = []
  for (let i = week; i > 0; i--) {
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

  res.header('Content-Type', 'application/json')
  res.send(JSON.stringify(matchupsByWeek, null, 4))
}

exports.matchupDetail = async (req, res) => {
  const matchupId = parseInt(req.params.id)
  const { rows: matchupQueryResult } = await db.query(
    `SELECT
      matchup.id,
      matchup.week,
      matchup.homescore,
      matchup.awayscore,
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
  const owner = await Owner.findOne({ ownerId })
  const data = {
    owner
  }
  res.header('Content-Type', 'application/json')
  res.send(JSON.stringify(data, null, 4))
}
