const fs = require('fs')
const axios = require('axios')

exports.download = async (imageURL, path) => {
  const writer = fs.createWriteStream(path)

  const response = await axios({
    url: imageURL,
    method: 'GET',
    responseType: 'stream'
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}
