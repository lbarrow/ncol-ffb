// const mongoose = require('mongoose')
// const Team = mongoose.model('Team')
// const Player = mongoose.model('Player')
// const Game = mongoose.model('Game')
// const Statline = mongoose.model('Statline')

// exports.nflSchedule = async (req, res) => {
//   const weeks = await Game.aggregate([
//     {
//       $group: {
//         _id: '$week',
//         games: {
//           $push: {
//             week: '$week',
//             home: '$home',
//             gameId: '$gameId',
//             visitorDisplayName: '$awayTeam.displayName',
//             homeDisplayName: '$homeTeam.displayName',
//             gameDate: '$gameDate',
//             isoTime: '$isoTime'
//           }
//         }
//       }
//     },
//     { $sort: { _id: 1 } }
//   ])

//   res.render('nflSchedule', { weeks })
// }

// exports.stats = async (req, res) => {
//   let positions = await Statline.aggregate([
//     { $match: { position: { $in: ['QB', 'RB', 'TE', 'WR'] } } },
//     {
//       $lookup: {
//         from: 'players',
//         localField: 'player',
//         foreignField: '_id',
//         as: 'player'
//       }
//     },
//     {
//       $group: {
//         _id: '$position',
//         players: {
//           $push: {
//             name: '$name',
//             player: { $arrayElemAt: ['$player', 0] },
//             passingAttempts: '$passingAttempts',
//             passingCompletions: '$passingCompletions',
//             passingInts: '$passingInts',
//             passingTDs: '$passingTDs',
//             passingTwoPts: '$passingTwoPts',
//             passingYards: '$passingYards',
//             rushingAttempts: '$rushingAttempts',
//             rushingTDs: '$rushingTDs',
//             rushingTwoPts: '$rushingTwoPts',
//             rushingYards: '$rushingYards',
//             receivingReceptions: '$receivingReceptions',
//             receivingTDs: '$receivingTDs',
//             receivingTwoPts: '$receivingTwoPts',
//             receivingYards: '$receivingYards'
//           }
//         }
//       }
//     },
//     { $sort: { _id: 1 } }
//   ])

//   res.render('stats', { positions })
// }

// exports.teams = async (req, res) => {
//   const teams = await Team.find().sort({ fullName: 'asc' })
//   res.render('teams', { teams })
// }

// exports.teamDetail = async (req, res) => {
//   const team = await Team.findOne({ abbr: req.params.abbr })
//   if (!team) return next()
//   const roster = await Player.find({
//     teamId: team.teamId,
//     positionGroup: { $in: ['WR', 'TE', 'QB', 'RB'] }
//   }).sort({
//     positionGroup: -1
//   })
//   res.render('team', { team, roster })
// }

// exports.playerDetail = async (req, res) => {
//   const player = await Player.findOne({ nflId: req.params.id })
//   if (!player) return next()
//   res.render('player', { player })
// }
