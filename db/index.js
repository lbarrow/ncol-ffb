const { Pool } = require('pg')
const pool = new Pool({
  user: 'ncolffb_db_user',
  host: 'localhost',
  database: 'ncolffb_db',
  password: 'vFd5ysLK3xLD1tIBhEG',
  port: 5432
})

module.exports = {
  query: (text, params) => pool.query(text, params)
}
