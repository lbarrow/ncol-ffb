const cron = require('node-cron')
const { getCurrentGameData } = require('../utility/dataManager')

// cron.schedule('*/30 * * * * *', async () => {
cron.schedule('*/2 * * * *', async () => {
  // parse every two min
  // await getCurrentGameData()
})
