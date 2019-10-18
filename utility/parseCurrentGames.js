const mongoose = require('mongoose')
require('../models/Team')
require('../models/Player')
require('../models/Statline')
require('../models/Game')
require('../models/Matchup')
require('../models/Owner')
require('dotenv').config({ path: 'variables.env' })

const { getCurrentGameData } = require('../utility/dataManager')

// Connect to our Database and handle any bad connections
// mongoose.connect('mongodb://localhost/nfldb', { useNewUrlParser: true })
mongoose.connect(
  `mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@ds331548.mlab.com:31548/ncolffb`,
  { useNewUrlParser: true, useCreateIndex: true },
  function(error) {
    console.log('mongo connected, try to parse')
    getCurrentGameData()
  }
)
mongoose.Promise = global.Promise // Tell Mongoose to use ES6 promises
mongoose.connection.on('error', err => {
  console.error(`🙅 🚫 🙅 🚫 🙅 🚫 🙅 🚫 → ${err.message}`)
})
