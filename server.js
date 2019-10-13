const mongoose = require('mongoose')

// import environmental variables from our variables.env file
require('dotenv').config({ path: 'variables.env' })

// Connect to our Database and handle any bad connections
// mongoose.connect('mongodb://localhost/nfldb', { useNewUrlParser: true })
mongoose.connect(
  `mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@ds331548.mlab.com:31548/ncolffb`,
  { useNewUrlParser: true, useCreateIndex: true },
  function(error) {
    console.log('mongo connected')
  }
)
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
app.set('port', process.env.PORT || 4445)
const server = app.listen(app.get('port'), () => {
  console.log(`Express running → PORT ${server.address().port}`)
})
