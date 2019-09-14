const express = require('express')
const router = express.Router()
const setupController = require('../controllers/setupController')
const teamController = require('../controllers/teamController')

router.get('/setup/schedule', setupController.parseSchedule)
router.get('/setup/matchups', setupController.setupMatchups)
router.get('/setup/games', setupController.parseAllGames)
router.get('/setup/this-week', setupController.parseThisWeek)
router.get('/setup/teams', setupController.teams)
router.get('/setup/rosters', setupController.rosters)
router.get('/setup/photos', setupController.photos)
router.get('/setup/fantasy-teams', setupController.setupFantasyTeams)

router.get('/', teamController.index)
router.get('/nfl-schedule', teamController.nflSchedule)
router.get('/stats', teamController.stats)
router.get('/teams', teamController.teams)
router.get('/team/:abbr', teamController.teamDetail)
router.get('/player/:id', teamController.playerDetail)
router.get('/fantasyTeam/:id/:week', teamController.fantasyTeam)
router.get('/matchup/:id/', teamController.matchup)

module.exports = router
