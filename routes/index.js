const express = require('express')
const router = express.Router()
const setupController = require('../controllers/setupController')
const teamController = require('../controllers/teamController')
const apiController = require('../controllers/apiController')

router.get('/setup/schedule', setupController.parseSchedule)
router.get('/setup/matchups', setupController.setupMatchups)
router.get('/setup/write-json', setupController.downloadAllFinishedGames)
router.get('/setup/games', setupController.parseAllGames)
router.get('/setup/this-week', setupController.parseThisWeek)
router.get('/setup/teams', setupController.teams)
router.get('/setup/rosters', setupController.rosters)
router.get('/setup/photos', setupController.photos)
router.get('/setup/fantasy-teams', setupController.setupFantasyTeams)
router.get('/setup/update-records', setupController.updateOwnerRecord)

router.get('/nfl-schedule', teamController.nflSchedule)
router.get('/stats', teamController.stats)
router.get('/teams', teamController.teams)
router.get('/team/:abbr', teamController.teamDetail)
router.get('/player/:id', teamController.playerDetail)

router.get('/', apiController.index)
router.get('/matchups/', apiController.matchups)
router.get('/matchup/:id/', apiController.matchupDetail)

module.exports = router
