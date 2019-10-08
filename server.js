const mongoose = require('mongoose')

// import environmental variables from our variables.env file
require('dotenv').config({ path: 'variables.env' })

// Connect to our Database and handle any bad connections
mongoose.connect('mongodb://localhost/nfldb', { useNewUrlParser: true })
mongoose.Promise = global.Promise // Tell Mongoose to use ES6 promises
mongoose.connection.on('error', err => {
  console.error(`🙅 🚫 🙅 🚫 🙅 🚫 🙅 🚫 → ${err.message}`)
})

// import all of our models
require('./models/Team')
require('./models/Player')
require('./models/Statline')
require('./models/Game')
require('./models/Matchup')
require('./models/Owner')

// Start our app!
const app = require('./app')
app.set('port', process.env.PORT || 4444)
const server = app.listen(app.get('port'), () => {
  console.log(`Express running → PORT ${server.address().port}`)
})

// start crons
require('./utility/cronSetup')
