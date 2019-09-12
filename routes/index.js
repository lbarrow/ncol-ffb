const express = require('express')
const router = express.Router()
const setupController = require('../controllers/setupController')
const teamController = require('../controllers/teamController')

router.get('/setup/schedule', setupController.parseSchedule)
router.get('/setup/games', setupController.getGames)
router.get('/setup/teams', setupController.teams)
router.get('/setup/rosters', setupController.rosters)
router.get('/setup/photos', setupController.photos)

router.get('/nfl-schedule', teamController.nflSchedule)
router.get('/stats', teamController.stats)
router.get('/teams', teamController.teams)
router.get('/team/:abbr', teamController.teamDetail)
router.get('/player/:id', teamController.playerDetail)

module.exports = router
