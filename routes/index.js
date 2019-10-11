const express = require('express')
const router = express.Router()
// const teamController = require('../controllers/teamController')
const setupController = require('../controllers/setupController')
const apiController = require('../controllers/apiController')
const vueAppController = require('../controllers/vueAppController')

router.get('/', vueAppController.index)

router.get('/setup/', setupController.index)
router.get('/setup/schedule', setupController.parseSchedule)
router.get('/setup/matchups', setupController.setupMatchups)
router.get('/setup/games', setupController.parseAllGames)
router.get('/setup/this-week', setupController.parseThisWeek)
router.get('/setup/parse', setupController.parseCurrentGames)
router.get('/setup/teams', setupController.teams)
router.get('/setup/rosters', setupController.rosters)
router.get('/setup/photos', setupController.photos)
router.get('/setup/fantasy-teams', setupController.setupFantasyTeams)
router.get('/setup/update-records', setupController.updateFantasyTeamRecords)
router.get('/setup/update-matchups', setupController.onlyUpdateMatchups)

// router.get('/team/nfl-schedule', teamController.nflSchedule)
// router.get('/team/stats', teamController.stats)
// router.get('/teams/', teamController.teams)
// router.get('/team/:abbr', teamController.teamDetail)
// router.get('/team/player/:id', teamController.playerDetail)

router.get('/api/', apiController.index)
router.get('/api/standings/', apiController.standings)
router.get('/api/matchups/', apiController.matchups)
router.get('/api/matchup/:id/', apiController.matchupDetail)
router.get('/api/team/:id/', apiController.teamDetail)

router.get('*', vueAppController.index)

module.exports = router
